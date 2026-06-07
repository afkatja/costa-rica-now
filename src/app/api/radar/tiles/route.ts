import { NextRequest } from "next/server"
import { redisGet, redisSet, redisIncr, redisExpire } from "../../../../lib/redis-cache"
import { dayInMs, hourInMs } from "../../../../lib/utils"

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
)

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

// In-memory fallback for local/dev
const tileCache = new Map<string, { data: Buffer; timestamp: number }>()
const rateLimiter = {
  requests: [] as number[],
  hourlyRequests: [] as number[],
  dailyRequests: [] as number[],
  lastRequestTime: 0,
}

const pruneRateLimiter = (now: number) => {
  const hourAgo = now - hourInMs
  const dayAgo = now - dayInMs
  rateLimiter.hourlyRequests = rateLimiter.hourlyRequests.filter(
    t => t >= hourAgo,
  )
  rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(t => t >= dayAgo)
}

async function getCachedTile(
  cacheKey: string,
): Promise<{ data: Buffer; timestamp: number } | null> {
  const cached = await redisGet<{ data: string; timestamp: number }>(`tile:${cacheKey}`)
  if (cached) {
    return { data: Buffer.from(cached.data, "base64"), timestamp: cached.timestamp }
  }
  return tileCache.get(cacheKey) || null
}

async function setCachedTile(
  cacheKey: string,
  data: Buffer,
  timestamp: number,
) {
  const value = { data: data.toString("base64"), timestamp }
  const ok = await redisSet(`tile:${cacheKey}`, value, Math.floor(CACHE_DURATION / 1000))
  if (!ok) {
    tileCache.set(cacheKey, { data, timestamp })
  }
}

async function getRateLimitCounters(): Promise<{
  hourlyRequests: number
  dailyRequests: number
  lastRequestTime: number
}> {
  const now = Date.now()
  const hourAgo = now - hourInMs
  const dayAgo = now - dayInMs
  rateLimiter.hourlyRequests = rateLimiter.hourlyRequests.filter(
    t => t >= hourAgo,
  )
  rateLimiter.dailyRequests = rateLimiter.dailyRequests.filter(t => t >= dayAgo)

  const [hourlyRequests, dailyRequests, lastRequestTime] = await Promise.all([
    redisGet<number>(`ratelimit:hourly`),
    redisGet<number>(`ratelimit:daily`),
    redisGet<number>(`ratelimit:lastRequestTime`),
  ])

  return {
    hourlyRequests: hourlyRequests ?? rateLimiter.hourlyRequests.length,
    dailyRequests: dailyRequests ?? rateLimiter.dailyRequests.length,
    lastRequestTime: lastRequestTime ?? rateLimiter.lastRequestTime,
  }
}

async function recordRateLimitRequest() {
  const now = Date.now()
  pruneRateLimiter(now)
  rateLimiter.requests.push(now)
  rateLimiter.hourlyRequests.push(now)
  rateLimiter.dailyRequests.push(now)
  rateLimiter.lastRequestTime = now

  await Promise.all([
    redisIncr(`ratelimit:hourly`),
    redisIncr(`ratelimit:daily`),
    redisSet(`ratelimit:lastRequestTime`, now),
  ])

  await Promise.all([
    redisExpire(`ratelimit:hourly`, 3600),
    redisExpire(`ratelimit:daily`, 86400),
    redisExpire(`ratelimit:lastRequestTime`, 3600),
  ])
}

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
  rateLimiter.requests = rateLimiter.requests.filter(t => now - t < 1000)
  pruneRateLimiter(now)

  const currentSecondRequests = rateLimiter.requests.filter(
    t => now - t < 1000,
  ).length

  if (currentSecondRequests < 3) {
    return true
  }

  if (now - rateLimiter.lastRequestTime < 300) {
    return false
  }

  const counters = await getRateLimitCounters()
  if (counters.hourlyRequests >= 25) return false
  if (counters.dailyRequests >= 500) return false

  return true
}

async function processRequestQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return

  isProcessingQueue = true

  while (requestQueue.length > 0) {
    const request = requestQueue.shift()!
    const now = Date.now()

    rateLimiter.requests = rateLimiter.requests.filter(t => now - t < 1000)
    pruneRateLimiter(now)

    const currentSecondRequests = rateLimiter.requests.filter(
      t => now - t < 1000,
    ).length

    const counters = await getRateLimitCounters()

    if (counters.hourlyRequests >= 25 || counters.dailyRequests >= 500) {
      console.warn(
        `Rate limit breached (${counters.hourlyRequests}/25 hourly, ${counters.dailyRequests}/500 daily) - returning fallback`,
      )

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

    let canRequest = false
    if (currentSecondRequests < 3) {
      canRequest = true
    } else if (now - rateLimiter.lastRequestTime >= 300) {
      canRequest = true
    }

    if (!canRequest) {
      await new Promise(resolve => setTimeout(resolve, 100))
      requestQueue.unshift(request)
      continue
    }

    try {
      const response = await fetchTile(request.requestData)
      request.resolve(response)
    } catch (error) {
      request.reject(error as Error)
    }

    const status = await getRateLimitStatus()
    const delay = status.perHour >= 20 ? 300 : 200
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  isProcessingQueue = false
}

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
      "TOMORROW_API_KEY is not configured - returning transparent tile",
    )
    return new Response(TRANSPARENT_PNG, {
      headers: { "Content-Type": "image/png", "X-Radar-Disabled": "true" },
    })
  }
  try {
    const cacheKey = `${requestData.zoom}-${requestData.x}-${requestData.y}-${requestData.field}-${requestData.time}`

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
        },
      )
    }

    if (!zoom || !x || !y) {
      return new Response(TRANSPARENT_PNG, {
        headers: { "Content-Type": "image/png" },
      })
    }

    const requestData = { zoom, x, y, field, time }
    const status = await getRateLimitStatus()

    if (status.perHour >= 25 || status.perDay >= 500) {
      console.warn(
        `Rate limit reached (${status.perHour}/25 hourly, ${status.perDay}/500 daily) - returning fallback`,
      )

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

    if (await canMakeRequest()) {
      try {
        return await fetchTile(requestData)
      } catch (error) {
        console.error("Direct fetch failed, queuing request:", error)
      }
    }

    if (status.perHour >= 23) {
      console.warn(
        `Approaching hourly limit (${status.perHour}/25) - queuing request`,
      )
    }

    return new Promise<Response>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = requestQueue.findIndex(r => r.resolve === resolve)
        if (idx !== -1) requestQueue.splice(idx, 1)
        resolve(
          new Response(TRANSPARENT_PNG, {
            headers: { "Content-Type": "image/png", "X-Timeout": "true" },
          }),
        )
      }, 30000)
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

      processRequestQueue()
    })
  } catch (error) {
    console.error("Error in GET handler:", error)
    return new Response(TRANSPARENT_PNG, {
      headers: { "Content-Type": "image/png" },
    })
  }
}
