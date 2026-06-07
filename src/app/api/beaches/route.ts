import { NextRequest, NextResponse } from "next/server"
import { coastalDestinations } from "@/lib/shared/destinations"
import { redisGet, redisSet } from "@/lib/redis-cache"

/** Maximum requests allowed per client per hour */
const RATE_LIMIT = 60

/** Duration of the rate limiting window in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW = 60 * 60 * 1000

/** In-memory rate limiting store keyed by client identifier (use Redis in production) */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/** A single high or low tide event */
type TideExtreme = {
  time: string
  height: number
  type: "high" | "low"
}

import { BeachConditions } from "@/types/beach"

/** Validates that the MAREA_API_KEY environment variable is set */
function validateApiKey(): string {
  const apiKey = process.env.MAREA_API_KEY
  if (!apiKey) {
    throw new Error("MAREA_API_KEY environment variable is not set")
  }
  return apiKey
}

/** Fetches a URL with an AbortController timeout — throws on timeout */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

/** Retries an async function with exponential backoff up to maxRetries attempts */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error
      }
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error("Max retries exceeded")
}

/** Extracts a unique client identifier from request headers for rate limiting */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers (common in production)
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip") // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim()
  }
  if (realIp) {
    return realIp
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a combination of headers for better uniqueness
  const userAgent = request.headers.get("user-agent") || "unknown"
  const accept = request.headers.get("accept") || "unknown"
  const acceptLang = request.headers.get("accept-language") || "unknown"

  // Create a hash from headers for better identification
  return Buffer.from(`${userAgent}:${accept}:${acceptLang}`)
    .toString("base64")
    .slice(0, 32)
}

/** Checks and enforces rate limits for a given client, with periodic cleanup */
function checkRateLimit(clientId: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const clientData = rateLimitStore.get(clientId)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup
    for (const [key, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }

  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    }
  }

  if (clientData.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetTime: clientData.resetTime }
  }

  clientData.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT - clientData.count,
    resetTime: clientData.resetTime,
  }
}

/** Fetches tide extremes (high/low) from the Marea API for a given lat/lon */
async function fetchTides(lat: number, lon: number): Promise<any> {
  let apiKey: string
  try {
    apiKey = validateApiKey()
  } catch {
    throw new Error("API configuration error: Unable to validate API key")
  }

  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(
      `https://api.marea.ooo/v2/tides?latitude=${lat}&longitude=${lon}`,
      {
        headers: {
          "x-marea-api-token": apiKey,
        },
      },
    )

    if (!response.ok) {
      if (response.status === 403) {
        return "QUOTA_EXCEEDED"
      }
      throw new Error(
        `Marea API error: ${response.status} ${response.statusText}`,
      )
    }

    return await response.json()
  })
}

/** Fetches wave height, direction, and period from Open-Meteo Marine API */
async function fetchMarineData(lat: number, lon: number): Promise<any> {
  return retryWithBackoff(async () => {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current:
        "wave_height,wave_direction,wave_period,wave_peak_period,wind_wave_height,wind_wave_direction,wind_wave_period,wind_wave_peak_period,swell_wave_height,swell_wave_direction,swell_wave_period,swell_wave_peak_period,sea_level_height_msl,ocean_current_velocity,ocean_current_direction",
      hourly: "wave_height,wave_direction,wave_period",
      forecast_days: "1",
    })

    const response = await fetchWithTimeout(
      `https://marine-api.open-meteo.com/v1/marine?${params}`,
    )

    if (!response.ok) {
      throw new Error(`Open-Meteo Marine API error: ${response.status}`)
    }

    return await response.json()
  })
}

/** Processes raw tide API data into next high/low extremes and current trend */
function processTideData(tideData: any) {
  // Handle quota exceeded case
  if (tideData === "QUOTA_EXCEEDED") {
    console.log("Skipping tide processing due to quota exceeded")
    return {
      extremes: [],
      nextHigh: null,
      nextLow: null,
      currentTide: null,
    }
  }

  if (!tideData?.extremes) {
    return {
      extremes: [],
      nextHigh: null,
      nextLow: null,
      currentTide: null,
    }
  }

  const now = new Date()
  const extremes: TideExtreme[] = tideData.extremes.map((e: any) => ({
    time: e.datetime,
    height: e.height,
    type: e.state === "HIGH TIDE" ? "high" : "low",
  }))

  // Find next high and low
  const futureExtremes = extremes.filter(e => new Date(e.time) > now)
  const nextHigh = futureExtremes.find(e => e.type === "high") || null
  const nextLow = futureExtremes.find(e => e.type === "low") || null

  // Determine current tide state from heights data
  let currentTide: "rising" | "falling" | null = null
  if (tideData.heights && tideData.heights.length > 0) {
    const currentHeight = tideData.heights[0]
    if (currentHeight.state === "RISING") {
      currentTide = "rising"
    } else if (currentHeight.state === "FALLING") {
      currentTide = "falling"
    }
  }

  return {
    extremes: extremes.slice(0, 8), // Return next 8 tide changes
    nextHigh,
    nextLow,
    currentTide,
  }
}

/** Processes raw Open-Meteo marine data into wave forecast, current, and 24h stats */
function processWaveData(marineData: any) {
  if (!marineData?.hourly) {
    return {
      current: { height: 0, direction: 0, directionCardinal: "N", time: new Date().toISOString() },
      forecast: [],
      average24h: 0,
      max24h: 0,
    }
  }

  const { time, wave_height, wave_direction } = marineData.hourly

  // Create forecast array
  const forecast = time.slice(0, 48).map((t: string, i: number) => ({
    time: t,
    height: wave_height[i] || 0,
    direction: wave_direction[i] || 0,
    directionCardinal: degreesToCardinal(wave_direction[i] || 0),
  }))

  // Current conditions (first data point)
  const current = {
    height: wave_height[0] || 0,
    direction: wave_direction[0] || 0,
    directionCardinal: degreesToCardinal(wave_direction[0] || 0),
    time: time[0],
  }

  // Calculate 24h stats
  const next24hHeights = wave_height
    .slice(0, 24)
    .filter((h: number) => h != null)
  const average24h =
    next24hHeights.length > 0
      ? next24hHeights.reduce((a: number, b: number) => a + b, 0) /
        next24hHeights.length
      : 0
  const max24h = next24hHeights.length > 0 ? Math.max(...next24hHeights) : 0

  return {
    current,
    forecast: forecast.slice(0, 24), // Return 24h forecast
    average24h: Math.round(average24h * 10) / 10,
    max24h: Math.round(max24h * 10) / 10,
  }
}

/** Converts a bearing in degrees to a 16-point cardinal compass direction */
function degreesToCardinal(degrees: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ]
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

/** Rates surf conditions (poor to excellent) based on wave height ranges */
function getSurfConditions(
  waveHeight: number,
): "excellent" | "good" | "fair" | "poor" {
  if (waveHeight >= 1.0 && waveHeight <= 2.5) return "excellent"
  if (waveHeight >= 0.7 && waveHeight < 1.0) return "good"
  if (waveHeight >= 2.5 && waveHeight <= 3.5) return "good"
  if (waveHeight >= 0.4 && waveHeight < 0.7) return "fair"
  if (waveHeight > 3.5 && waveHeight <= 5.0) return "fair"
  return "poor"
}

/** GET /api/beaches — returns tide, wave, and surf data for Costa Rica beaches. Optional ?destination= param for a single beach. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const destinationId = searchParams.get("destination")

    // Enhanced rate limiting using client identifier
    const clientId = getClientIdentifier(request)
    const rateLimitResult = checkRateLimit(clientId)

    if (!rateLimitResult.allowed) {
      const resetInSeconds = Math.ceil(
        (rateLimitResult.resetTime - Date.now()) / 1000,
      )
      const resetInMinutes = Math.ceil(resetInSeconds / 60)
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${resetInMinutes} minutes.`,
          retryAfter: resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
            "Retry-After": resetInSeconds.toString(),
          },
        },
      )
    }

    // Add rate limit headers to successful responses
    const responseHeaders = {
      "X-RateLimit-Limit": RATE_LIMIT.toString(),
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
    }

    // If specific destination requested
    if (destinationId) {
      const destination = coastalDestinations.find(d => d.id === destinationId)
      if (!destination) {
        return NextResponse.json(
          { error: "Destination not found" },
          { status: 404 },
        )
      }

      // Check cache for destination data
      const destCacheKey = `beaches:${destinationId}`
      const cachedConditions = await redisGet<BeachConditions>(destCacheKey)
      if (cachedConditions) {
        return NextResponse.json(cachedConditions, {
          headers: { ...responseHeaders, "X-Cache": "HIT" },
        })
      }

      const [tideData, marineData] = await Promise.all([
        fetchTides(destination.lat, destination.lon),
        fetchMarineData(destination.lat, destination.lon),
      ])

      const tides = processTideData(tideData)

      const waves = processWaveData(marineData)

      const conditions: BeachConditions = {
        destinationId: destination.id,
        destination: destination.name,
        name: destination.name,
        lat: destination.lat,
        lon: destination.lon,
        region: destination.region || "",
        tides,
        waves,
        surfConditions: getSurfConditions(waves.current.height),
        lastUpdated: new Date().toISOString(),
      }

      await redisSet(destCacheKey, conditions, 1800)

      return NextResponse.json(conditions, { headers: responseHeaders })
    }
    // Check cache for all-destinations response
    const allCacheKey = `beaches:all`
    const cachedAll = await redisGet<any>(allCacheKey)
    if (cachedAll) {
      return NextResponse.json(cachedAll, {
        headers: { ...responseHeaders, "X-Cache": "HIT" },
      })
    }

    // Process destinations in batches to avoid overwhelming external APIs
    const BATCH_SIZE = 5
    const allConditions: (BeachConditions | null)[] = []

    for (let i = 0; i < coastalDestinations.length; i += BATCH_SIZE) {
      const batch = coastalDestinations.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async destination => {
          try {
            const [tideData, marineData] = await Promise.all([
              fetchTides(destination.lat, destination.lon),
              fetchMarineData(destination.lat, destination.lon),
            ])

            const tides = processTideData(tideData)
            const waves = processWaveData(marineData)

            const conditions: BeachConditions = {
              destinationId: destination.id,
              destination: destination.name,
              name: destination.name,
              lat: destination.lat,
              lon: destination.lon,
              region: destination.region || "",
              tides,
              waves,
              surfConditions: getSurfConditions(waves.current.height),
              lastUpdated: new Date().toISOString(),
            }

            // Cache individual destinations as they are fetched
            await redisSet(`beaches:${destination.id}`, conditions, 1800)

            return conditions
          } catch {
            return null
          }
        }),
      )
      allConditions.push(...batchResults)
    }

    // Filter out any failed requests
    const validConditions = allConditions.filter(Boolean)

    const allResponse = {
      destinations: validConditions,
      count: validConditions.length,
    }

    // Cache the full response for 30 minutes
    await redisSet(allCacheKey, allResponse, 1800)

    return NextResponse.json(allResponse, { headers: responseHeaders })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

// Tides are predictable — cache is handled via Redis in src/lib/redis-cache.ts
