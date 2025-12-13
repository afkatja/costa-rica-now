import { NextRequest } from "next/server"
import { createClient } from "redis"
import { dayInMs, hourInMs } from "../../../../lib/utils"

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
)

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (weather doesn't change that fast)

// External store client with fallback
let redisClient: ReturnType<typeof createClient> | null = null
let useExternalStore = false

// Initialize Redis client safely
async function initializeRedis() {
  if (redisClient !== null) return redisClient
  redisClient = createClient({
    url: process.env.REDIS_URL,
  })

  try {
    // Check if Redis URL is available (production)
    if (process.env.REDIS_URL) {
      await redisClient.connect()
      useExternalStore = true
      console.log("Using Vercel Redis for external storage")
    } else {
      console.log("REDIS_URL not found, using in-memory fallback")
      useExternalStore = false
    }
  } catch (error) {
    console.warn(
      "Failed to initialize Redis client, using in-memory fallback:",
      error
    )
    useExternalStore = false
  }

  return redisClient
}

// Initialize on module load
initializeRedis()

// In-memory fallback for local/dev
const tileCache = new Map<string, { data: Buffer; timestamp: number }>()
const rateLimiter = {
  requests: [] as number[],
  hourlyRequests: [] as number[],
  dailyRequests: [] as number[],
  lastRequestTime: 0,
}

// Helper to prune rate limiter arrays based on time windows
const pruneRateLimiter = (now: number) => {
  const hourAgo = now - hourInMs
  const dayAgo = now - dayInMs
  rateLimiter.hourlyRequests = rateLimiter.hourlyRequests.filter(
    t => t >= hourAgo
  )
  rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(t => t >= dayAgo)
}

// External store functions
async function getCachedTile(
  cacheKey: string
): Promise<{ data: Buffer; timestamp: number } | null> {
  if (!useExternalStore) {
    return tileCache.get(cacheKey) || null
  }

  try {
    const cached = await redisClient!.get(`tile:${cacheKey}`)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached as string)
      return { data: Buffer.from(data, "base64"), timestamp }
    }
  } catch (error) {
    console.warn("Failed to get cached tile from Redis:", error)
  }
  return null
}

async function setCachedTile(
  cacheKey: string,
  data: Buffer,
  timestamp: number
) {
  if (!useExternalStore) {
    tileCache.set(cacheKey, { data, timestamp })
    return
  }

  try {
    const value = JSON.stringify({
      data: data.toString("base64"),
      timestamp,
    })
    await redisClient!.set(`tile:${cacheKey}`, value, {
      EX: Math.floor(CACHE_DURATION / 1000),
    })
  } catch (error) {
    console.warn("Failed to set cached tile in Redis:", error)
  }
}

async function getRateLimitCounters(): Promise<{
  hourlyRequests: number
  dailyRequests: number
  lastRequestTime: number
}> {
  if (!useExternalStore) {
    const now = Date.now()
    const hourAgo = now - hourInMs
    const dayAgo = now - dayInMs
    rateLimiter.hourlyRequests = rateLimiter.hourlyRequests.filter(
      t => t >= hourAgo
    )
    rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(
      t => t >= dayAgo
    )
    return {
      hourlyRequests: rateLimiter.hourlyRequests.length,
      dailyRequests: rateLimiter.dailyRequests.length,
      lastRequestTime: rateLimiter.lastRequestTime,
    }
  }

  try {
    const [hourlyRequests, dailyRequests, lastRequestTime] = await Promise.all([
      redisClient!.get(`ratelimit:hourly`),
      redisClient!.get(`ratelimit:daily`),
      redisClient!.get(`ratelimit:lastRequestTime`),
    ])

    return {
      hourlyRequests: parseInt(hourlyRequests as string) || 0,
      dailyRequests: parseInt(dailyRequests as string) || 0,
      lastRequestTime: parseInt(lastRequestTime as string) || 0,
    }
  } catch (error) {
    console.warn("Failed to get rate limit counters from Redis:", error)
    return {
      hourlyRequests: rateLimiter.hourlyRequests.length,
      dailyRequests: rateLimiter.dailyRequests.length,
      lastRequestTime: rateLimiter.lastRequestTime,
    }
  }
}

async function recordRateLimitRequest() {
  if (!useExternalStore) {
    const now = Date.now()
    pruneRateLimiter(now)
    rateLimiter.requests.push(now)
    rateLimiter.hourlyRequests.push(now)
    rateLimiter.dailyRequests.push(now)
    rateLimiter.lastRequestTime = now
    return
  }

  try {
    const now = Date.now()

    await Promise.all([
      redisClient!.incr(`ratelimit:hourly`),
      redisClient!.incr(`ratelimit:daily`),
      redisClient!.set(`ratelimit:lastRequestTime`, now),
    ])

    // Set TTLs for automatic reset
    await Promise.all([
      redisClient!.expire(`ratelimit:hourly`, 3600), // 1 hour
      redisClient!.expire(`ratelimit:daily`, 86400), // 1 day
      redisClient!.expire(`ratelimit:lastRequestTime`, 3600),
    ])
  } catch (error) {
    console.warn("Failed to record rate limit request in Redis:", error)
    // Fallback to in-memory
    const now = Date.now()
    pruneRateLimiter(now)
    rateLimiter.requests.push(now)
    rateLimiter.hourlyRequests.push(now)
    rateLimiter.dailyRequests.push(now)
    rateLimiter.lastRequestTime = now
  }
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

async function canMakeRequest(): Promise<boolean> {
  const now = Date.now()

  // Clean old requests (in-memory for burst control)
  rateLimiter.requests = rateLimiter.requests.filter(t => now - t < 1000)

  // Prune hourly and daily requests
  pruneRateLimiter(now)

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

  // Check hourly and daily limits from external store
  const counters = await getRateLimitCounters()
  if (counters.hourlyRequests >= 25) return false
  if (counters.dailyRequests >= 500) return false

  return true
}

function recordRequest() {
  const now = Date.now()
  pruneRateLimiter(now)
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
    const now = Date.now()

    // Clean old requests for proper limit checking (in-memory for burst)
    rateLimiter.requests = rateLimiter.requests.filter(t => now - t < 1000)

    // Prune hourly and daily requests
    pruneRateLimiter(now)

    const currentSecondRequests = rateLimiter.requests.filter(
      t => now - t < 1000
    ).length

    // Get external counters for hourly/daily limits
    const counters = await getRateLimitCounters()

    // If we've hit hourly/daily limits, return cached or transparent tile immediately
    if (counters.hourlyRequests >= 25 || counters.dailyRequests >= 500) {
      console.warn(
        `Rate limit breached (${counters.hourlyRequests}/25 hourly, ${counters.dailyRequests}/500 daily) - returning fallback`
      )

      // Try to find cached tile first
      const cacheKey = `${request.requestData.zoom}-${request.requestData.x}-${request.requestData.y}-${request.requestData.field}-${request.requestData.time}`
      const cached = await getCachedTile(cacheKey)

      const fallbackResponse = cached
        ? new Response(new Uint8Array(cached.data), {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
              "X-Cache": "HIT-FALLBACK",
              "X-Rate-Limited": "true",
            },
          })
        : new Response(TRANSPARENT_PNG, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
              "X-Rate-Limited": "true",
            },
          })

      request.resolve(fallbackResponse)
      continue
    }

    // Check if we can make a request (short burst control)
    let canRequest = false
    if (currentSecondRequests < 3) {
      canRequest = true
    } else if (now - rateLimiter.lastRequestTime >= 300) {
      canRequest = true
    }

    if (!canRequest) {
      // Only wait short periods for burst control (100-300ms max)
      await new Promise(resolve => setTimeout(resolve, 100))
      // Re-queue this request to try again
      requestQueue.unshift(request)
      continue
    }

    try {
      // Execute the actual tile fetch
      const response = await fetchTile(request.requestData)
      request.resolve(response)
    } catch (error) {
      request.reject(error as Error)
    }

    // Small delay between requests to avoid overwhelming the API
    const status = await getRateLimitStatus()
    const delay = status.perHour >= 20 ? 300 : 200
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
    console.warn(
      "TOMORROW_API_KEY is not configured - returning transparent tile"
    )
    return new Response(TRANSPARENT_PNG, {
      headers: { "Content-Type": "image/png", "X-Radar-Disabled": "true" },
    })
  }
  try {
    const cacheKey = `${requestData.zoom}-${requestData.x}-${requestData.y}-${requestData.field}-${requestData.time}`

    // Check cache first
    const cached = await getCachedTile(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return new Response(new Uint8Array(cached.data), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=600",
          "X-Cache": "HIT",
        },
      })
    }

    await recordRateLimitRequest()
    const status = await getRateLimitStatus()
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
    await setCachedTile(cacheKey, buffer, Date.now())

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

async function getRateLimitStatus() {
  const now = Date.now()
  const counters = await getRateLimitCounters()
  return {
    perSecond: rateLimiter.requests.filter(t => now - t < 1000).length,
    perHour: counters.hourlyRequests,
    perDay: counters.dailyRequests,
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
      const status = await getRateLimitStatus()
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
    const status = await getRateLimitStatus()

    // If we've hit hourly or daily limits, return cached or transparent tile immediately
    if (status.perHour >= 25 || status.perDay >= 500) {
      console.warn(
        `Rate limit reached (${status.perHour}/25 hourly, ${status.perDay}/500 daily) - returning fallback`
      )

      // Try to find cached tile first
      const cacheKey = `${zoom}-${x}-${y}-${field}-${time}`
      const cached = await getCachedTile(cacheKey)

      return cached
        ? new Response(new Uint8Array(cached.data), {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
              "X-Cache": "HIT-FALLBACK",
              "X-Rate-Limited": "true",
              "X-Rate-Limit-Status": JSON.stringify(status),
            },
          })
        : new Response(TRANSPARENT_PNG, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
              "X-Rate-Limited": "true",
              "X-Rate-Limit-Status": JSON.stringify(status),
            },
          })
    }

    // For immediate requests (first 3 per second), try to process directly
    if (await canMakeRequest()) {
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
    return new Promise<Response>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = requestQueue.findIndex(r => r.resolve === resolve)
        if (idx !== -1) requestQueue.splice(idx, 1)
        resolve(
          new Response(TRANSPARENT_PNG, {
            headers: { "Content-Type": "image/png", "X-Timeout": "true" },
          })
        )
      }, 30000) // 30s timeout
      requestQueue.push({
        resolve: res => {
          clearTimeout(timeout)
          resolve(res)
        },
        reject: err => {
          clearTimeout(timeout)
          reject(err)
        },
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
