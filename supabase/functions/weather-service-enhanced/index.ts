import costaRicaDestinations from "../../../src/lib/shared/destinations.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "redis"
import { dayInMs, hourInMs } from "../../../src/lib/utils"

// External store client with fallback
let redisClient: ReturnType<typeof createClient> | null = null
let useExternalStore = false

// Initialize Redis client safely
async function initializeRedis() {
  if (redisClient !== null) return redisClient
  redisClient = createClient({
    url: Deno.env.get("REDIS_URL"),
  })

  try {
    // Check if Redis URL is available (production)
    if (Deno.env.get("REDIS_URL")) {
      await redisClient.connect()
      useExternalStore = true
      console.log("Using Redis for external storage")
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
      redisClient!.get(`weather:ratelimit:hourly`),
      redisClient!.get(`weather:ratelimit:daily`),
      redisClient!.get(`weather:ratelimit:lastRequestTime`),
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
      redisClient!.incr(`weather:ratelimit:hourly`),
      redisClient!.incr(`weather:ratelimit:daily`),
      redisClient!.set(`weather:ratelimit:lastRequestTime`, now),
    ])

    // Set TTLs for automatic reset
    await Promise.all([
      redisClient!.expire(`weather:ratelimit:hourly`, 3600), // 1 hour
      redisClient!.expire(`weather:ratelimit:daily`, 86400), // 1 day
      redisClient!.expire(`weather:ratelimit:lastRequestTime`, 3600),
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

async function getRateLimitStatus() {
  const now = Date.now()
  const counters = await getRateLimitCounters()
  return {
    perSecond: rateLimiter.requests.filter(t => now - t < 1000).length,
    perHour: counters.hourlyRequests,
    perDay: counters.dailyRequests,
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const {
      locations,
      types = ["current", "forecast"], // Support multiple types in one call
      locationContext = null,
      check,
    } = await req.json()
    const openWeatherApiKey = Deno.env.get("OPENWEATHERMAP_API_KEY")

    // Return weather service status if check=true
    if (check === "true") {
      const status = await getRateLimitStatus()
      return new Response(
        JSON.stringify({
          available: !!openWeatherApiKey,
          timestamp: Date.now(),
          rateLimitStatus: status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (!openWeatherApiKey) {
      throw new Error("OpenWeatherMap API key not configured")
    }

    const weatherData = []

    // Default behavior: use provided locations or all major destinations
    const locationsToFetch =
      locations && locations.length > 0
        ? locations
            .map((loc: keyof typeof costaRicaDestinations) =>
              costaRicaDestinations[loc]
                ? { key: loc, ...costaRicaDestinations[loc] }
                : undefined
            )
            .filter(Boolean)
        : Object.entries(costaRicaDestinations).map(([key, dest]) => ({
            key,
            name: dest.name,
            lat: dest.lat,
            lon: dest.lon,
          }))

    // Fetch all requested types for each location
    for (const location of locationsToFetch) {
      if (!location) continue

      for (const currentType of types) {
        try {
          // Check rate limit before making request
          if (!(await canMakeRequest())) {
            console.warn(
              `Rate limit exceeded for ${location.name} (${currentType})`
            )
            continue
          }

          let weatherUrl

          if (currentType === "forecast") {
            // 5-day forecast
            weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${openWeatherApiKey}&units=metric`
          } else {
            // Current weather
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${openWeatherApiKey}&units=metric`
          }

          const weatherResponse = await fetch(weatherUrl)

          if (!weatherResponse.ok) {
            console.warn(
              `Weather API failed for ${location.name} (${currentType}): ${weatherResponse.status}`
            )
            continue
          }

          const data = await weatherResponse.json()

          // Record the rate limit request after successful fetch
          await recordRateLimitRequest()

          if (currentType === "forecast") {
            // Process forecast data - group by day and create daily summaries
            const dailyForecasts = new Map()

            data.list.forEach((item: any) => {
              const date = new Date(item.dt * 1000)
              const dayKey = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
              ).getTime()

              if (!dailyForecasts.has(dayKey)) {
                dailyForecasts.set(dayKey, {
                  date: new Date(dayKey),
                  temperatures: [],
                  feels_like: [],
                  humidity: [],
                  descriptions: [],
                  icons: [],
                  wind_speeds: [],
                  rain: [],
                  main: [],
                })
              }

              const dayData = dailyForecasts.get(dayKey)
              dayData.temperatures.push(Math.round(item.main.temp))
              dayData.feels_like.push(Math.round(item.main.feels_like))
              dayData.humidity.push(item.main.humidity)
              dayData.descriptions.push(item.weather[0].description)
              dayData.icons.push(item.weather[0].icon)
              dayData.wind_speeds.push(item.wind.speed)
              dayData.rain.push(item.rain?.["3h"] || 0)
              dayData.main.push(item.weather[0].main)
            })

            // Convert to daily summaries (5 days)
            const dailySummaries = Array.from(dailyForecasts.entries())
              .slice(0, 5)
              .map(([date, dayData]) => {
                // Get the most common weather condition for the day
                const mostCommonMain = dayData.main.reduce((a, b, i, arr) =>
                  arr.filter(v => v === a).length >=
                  arr.filter(v => v === b).length
                    ? a
                    : b
                )
                const mostCommonIcon = dayData.icons.reduce((a, b, i, arr) =>
                  arr.filter(v => v === a).length >=
                  arr.filter(v => v === b).length
                    ? a
                    : b
                )
                const mostCommonDescription = dayData.descriptions.reduce(
                  (a, b, i, arr) =>
                    arr.filter(v => v === a).length >=
                    arr.filter(v => v === b).length
                      ? a
                      : b
                )

                return {
                  date,
                  day: new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                  }),
                  high: Math.max(...dayData.temperatures),
                  low: Math.min(...dayData.temperatures),
                  avg_temp: Math.round(
                    dayData.temperatures.reduce((a, b) => a + b, 0) /
                      dayData.temperatures.length
                  ),
                  avg_feels_like: Math.round(
                    dayData.feels_like.reduce((a, b) => a + b, 0) /
                      dayData.feels_like.length
                  ),
                  avg_humidity: Math.round(
                    dayData.humidity.reduce((a, b) => a + b, 0) /
                      dayData.humidity.length
                  ),
                  avg_wind_speed: Math.round(
                    (dayData.wind_speeds.reduce((a, b) => a + b, 0) /
                      dayData.wind_speeds.length) *
                      3.6
                  ), // Convert to km/h
                  total_rain: Math.round(
                    dayData.rain.reduce((a, b) => a + b, 0)
                  ),
                  description: mostCommonDescription,
                  main: mostCommonMain,
                  icon: mostCommonIcon,
                }
              })

            const processedForecast = {
              location: location.key,
              name: location.name,
              type: "forecast",
              forecast: dailySummaries,
              city: data.city.name,
              country: data.city.country,
              cached_at: new Date().toISOString(),
            }
            weatherData.push(processedForecast)
          } else {
            // Process current weather data
            const processedWeather = {
              location: location.key,
              name: location.name,
              country: data.sys.country,
              region: location.region,
              city: data.name,
              cached_at: new Date().toISOString(),
              type: "current",
              current: {
                temperature: Math.round(data.main.temp),
                feels_like: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                description: data.weather[0].description,
                main: data.weather[0].main,
                icon: data.weather[0].icon,
                wind_speed: data.wind.speed,
                pressure: data.main.pressure,
                visibility: data.visibility,
                uv_index: null, // Not available in current weather API
              },
            }
            weatherData.push(processedWeather)
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (locationError) {
          console.error(
            `Error fetching weather for ${location.name} (${currentType}):`,
            locationError
          )
          // Continue with other locations even if one fails
        }
      }
    }

    if (weatherData.length === 0) {
      throw new Error("No weather data could be retrieved")
    }

    return new Response(
      JSON.stringify({
        data: {
          weather: weatherData,
          timestamp: new Date().toISOString(),
          cache_duration: "10 minutes",
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Enhanced weather service error:", error)

    const errorResponse = {
      error: {
        code: "WEATHER_SERVICE_ERROR",
        message: error.message,
      },
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
