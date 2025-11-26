// app/api/weather/tiles/route.ts
import { NextRequest } from "next/server"

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
)

// In-memory cache for tiles (consider Redis for production)
const tileCache = new Map<string, { data: Buffer; timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (weather doesn't change that fast)

// Rate limiting tracker
const rateLimiter = {
  requests: [] as number[],
  hourlyRequests: [] as number[],
  dailyRequests: [] as number[],
  lastRequestTime: 0,
}

// Request queue for managing tile loading
interface QueuedRequest {
  resolve: (value: Response) => void
  reject: (error: Error) => void
  requestData: {
    zoom: string
    x: string
    y: string
    field: string
    time: string
  }
}
const requestQueue: QueuedRequest[] = []
let isProcessingQueue = false

function canMakeRequest(): boolean {
  const now = Date.now()

  // Clean old requests
  rateLimiter.requests = rateLimiter.requests.filter(t => now - t < 1000)
  rateLimiter.hourlyRequests = rateLimiter.hourlyRequests.filter(
    t => now - t < 3600000
  )
  rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(
    t => now - t < 86400000
  )

  // Allow burst of 3 requests, then stagger subsequent requests
  const currentSecondRequests = rateLimiter.requests.filter(
    t => now - t < 1000
  ).length

  // If we haven't hit the 3-request burst limit, allow immediate request
  if (currentSecondRequests < 3) {
    return true
  }

  // If we've hit the burst limit, enforce minimum spacing between requests
  // Space requests at least 300ms apart to allow 3+ requests per second
  if (now - rateLimiter.lastRequestTime < 300) {
    return false
  }

  // Check hourly and daily limits
  if (rateLimiter.hourlyRequests.length >= 25) return false
  if (rateLimiter.dailyRequests.length >= 500) return false

  return true
}

function recordRequest() {
  const now = Date.now()
  rateLimiter.requests.push(now)
  rateLimiter.hourlyRequests.push(now)
  rateLimiter.dailyRequests.push(now)
  rateLimiter.lastRequestTime = now
}

// Process queued requests with staggered timing and proper rate limit compliance
async function processRequestQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return

  isProcessingQueue = true

  while (requestQueue.length > 0) {
    const request = requestQueue.shift()!

    // Wait for all rate limits to clear
    while (true) {
      const now = Date.now()

      // Clean old requests for proper limit checking
      rateLimiter.requests = rateLimiter.requests.filter(t => now - t < 1000)
      rateLimiter.hourlyRequests = rateLimiter.hourlyRequests.filter(
        t => now - t < 3600000
      )
      rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(
        t => now - t < 86400000
      )

      const currentSecondRequests = rateLimiter.requests.filter(
        t => now - t < 1000
      ).length
      const currentHourlyRequests = rateLimiter.hourlyRequests.length
      const currentDailyRequests = rateLimiter.dailyRequests.length

      // Check if we can make a request
      let canRequest = false

      // Allow burst of 3 requests per second, then space them out
      if (currentSecondRequests < 3) {
        canRequest = true
      } else if (now - rateLimiter.lastRequestTime >= 300) {
        canRequest = true
      }

      // Check hourly limit (24 requests remaining for the hour)
      if (currentHourlyRequests >= 25) {
        const timeUntilNextHour = 3600000 - (now % 3600000)
        console.warn(
          `Hourly limit reached (25/25). Waiting ${Math.round(
            timeUntilNextHour / 1000
          )}s for next hour`
        )
        await new Promise(resolve =>
          setTimeout(resolve, Math.min(timeUntilNextHour, 60000))
        ) // Wait at most 1 minute
        continue
      }

      // Check daily limit (499 requests remaining for the day)
      if (currentDailyRequests >= 500) {
        const timeUntilNextDay = 86400000 - (now % 86400000)
        console.warn(
          `Daily limit reached (500/500). Waiting ${Math.round(
            timeUntilNextDay / 1000
          )}s for next day`
        )
        await new Promise(resolve =>
          setTimeout(resolve, Math.min(timeUntilNextDay, 300000))
        ) // Wait at most 5 minutes
        continue
      }

      if (canRequest) {
        break // We can proceed with the request
      }

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    try {
      // Execute the actual tile fetch
      const response = await fetchTile(request.requestData)
      request.resolve(response)
    } catch (error) {
      request.reject(error as Error)
    }

    // Small delay between requests to avoid overwhelming the API
    // Increase delay if we're approaching hourly/daily limits
    const status = getRateLimitStatus()
    let delay = 200

    if (status.perHour >= 20) {
      delay = 500 // Slow down when approaching hourly limit
    }
    if (status.perDay >= 450) {
      delay = 1000 // Very slow when approaching daily limit
    }

    await new Promise(resolve => setTimeout(resolve, delay))
  }

  isProcessingQueue = false
}

// Fetch tile from Tomorrow.io API
async function fetchTile(requestData: {
  zoom: string
  x: string
  y: string
  field: string
  time: string
}): Promise<Response> {
  const apiKey = process.env.TOMORROW_API_KEY
  if (!apiKey) {
    throw new Error("TOMORROW_API_KEY is not configured")
  }
  try {
    const cacheKey = `${requestData.zoom}-${requestData.x}-${requestData.y}-${requestData.field}-${requestData.time}`

    // Check cache first
    const cached = tileCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return new Response(cached.data as any, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=600",
          "X-Cache": "HIT",
        },
      })
    }

    recordRequest()
    const status = getRateLimitStatus()
    console.log(`Fetching tile ${cacheKey} (${status.perHour}/25 hourly)`)

    const tileUrl = `https://api.tomorrow.io/v4/map/tile/${requestData.zoom}/${requestData.x}/${requestData.y}/${requestData.field}/${requestData.time}.png?apikey=${apiKey}`
    const response = await fetch(tileUrl)

    if (!response.ok) {
      console.warn(`Tomorrow.io API error: ${response.status}`)
      return new Response(TRANSPARENT_PNG, {
        headers: { "Content-Type": "image/png" },
      })
    }

    // Convert to buffer and cache
    const buffer = Buffer.from(await response.arrayBuffer())
    tileCache.set(cacheKey, { data: buffer, timestamp: Date.now() })

    // Aggressive cache cleanup
    if (tileCache.size > 500) {
      const cutoff = Date.now() - CACHE_DURATION
      for (const [key] of Array.from(tileCache.entries())) {
        const value = tileCache.get(key)!
        if (value.timestamp < cutoff) {
          tileCache.delete(key)
        }
      }
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=600",
        "X-Cache": "MISS",
        "X-Rate-Limit-Status": JSON.stringify(status),
      },
    })
  } catch (error) {
    console.error("Error fetching tile:", error)
    return new Response(TRANSPARENT_PNG, {
      headers: { "Content-Type": "image/png" },
    })
  }
}

function getRateLimitStatus() {
  const now = Date.now()
  return {
    perSecond: rateLimiter.requests.filter(t => now - t < 1000).length,
    perHour: rateLimiter.hourlyRequests.filter(t => now - t < 3600000).length,
    perDay: rateLimiter.dailyRequests.filter(t => now - t < 86400000).length,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zoom = searchParams.get("zoom")
    const x = searchParams.get("x")
    const y = searchParams.get("y")
    const field = searchParams.get("field") || "precipitationIntensity"
    const time = searchParams.get("time") || "now"
    const check = searchParams.get("check")

    // Return radar status if check=true
    if (check === "true") {
      const apiKey = process.env.TOMORROW_API_KEY
      const status = getRateLimitStatus()
      return new Response(
        JSON.stringify({
          available: !!apiKey,
          timestamp: Date.now(),
          rateLimitStatus: status,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (!zoom || !x || !y) {
      return new Response(TRANSPARENT_PNG, {
        headers: { "Content-Type": "image/png" },
      })
    }

    const requestData = { zoom, x, y, field, time }

    // Check current rate limit status
    const status = getRateLimitStatus()

    // If we've hit daily limit, return transparent tile immediately
    if (status.perDay >= 500) {
      console.warn("Daily limit reached (500/500) - returning transparent tile")
      return new Response(TRANSPARENT_PNG, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
          "X-Rate-Limited": "true",
          "X-Rate-Limit-Status": JSON.stringify(status),
        },
      })
    }

    // For immediate requests (first 3 per second), try to process directly
    if (canMakeRequest()) {
      try {
        return await fetchTile(requestData)
      } catch (error) {
        console.error("Direct fetch failed, queuing request:", error)
        // Fall through to queue if direct fetch fails
      }
    }

    // If we're close to hourly limit, warn and still queue
    if (status.perHour >= 23) {
      console.warn(
        `Approaching hourly limit (${status.perHour}/25) - queuing request`
      )
    }

    // Queue the request for staggered processing
    return new Promise((resolve, reject) => {
      requestQueue.push({
        resolve,
        reject,
        requestData,
      })

      // Start processing queue if not already running
      processRequestQueue()
    })
  } catch (error) {
    console.error("Error in GET handler:", error)
    return new Response(TRANSPARENT_PNG, {
      headers: { "Content-Type": "image/png" },
    })
  }
}
