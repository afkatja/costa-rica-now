import costaRicaDestinations from "../../../src/lib/shared/destinations.ts"
import calculateDistance from "../_shared/calculateDistance.ts"
import { redisGet, redisSet } from "../_shared/redis-cache.ts"
import { corsHeaders, withEdgeHandler } from "../_shared/edge-handler.ts"

declare const Deno: any

type WeatherLocation = {
  key: string
  name: string
  lat: number
  lon: number
}

Deno.serve(
  withEdgeHandler(async req => {
    try {
      const {
        locations,
        type = "current",
        locationContext = null,
      } = await req.json()
      const openWeatherApiKey = Deno.env.get("OPENWEATHERMAP_API_KEY")

      if (!openWeatherApiKey) {
        throw new Error("OpenWeatherMap API key not configured")
      }

      const weatherData: Record<string, any>[] = []

      let locationsToFetch: WeatherLocation[]
      if (
        locationContext &&
        locationContext.isInCostaRica &&
        locationContext.latitude &&
        locationContext.longitude
      ) {
        locationsToFetch = []

        locationsToFetch.push({
          key: "user-location",
          name: "Your Location",
          lat: locationContext.latitude,
          lon: locationContext.longitude,
        })

        const nearbyDestinations = Object.entries(costaRicaDestinations).filter(
          ([key, dest]) => {
            const distance = calculateDistance(
              locationContext.latitude,
              locationContext.longitude,
              dest.lat,
              dest.lon,
            )
            return distance <= locationContext.radiusKm
          },
        )

        locationsToFetch.push(
          ...nearbyDestinations.slice(0, 3).map(([key, dest]) => ({
            key,
            name: dest.name,
            lat: dest.lat,
            lon: dest.lon,
          })),
        )

        if (locationsToFetch.length === 1) {
          locationsToFetch.push(
            { key: "san-jose", ...costaRicaDestinations["san-jose"] },
            {
              key: "manuel-antonio",
              ...costaRicaDestinations["manuel-antonio"],
            },
          )
        }
      } else {
        locationsToFetch =
          locations && locations.length > 0
            ? locations
                .filter(
                  (loc: keyof typeof costaRicaDestinations) =>
                    loc in costaRicaDestinations,
                )
                .map((loc: keyof typeof costaRicaDestinations) => ({
                  key: loc,
                  ...costaRicaDestinations[loc],
                }))
            : Object.entries(costaRicaDestinations).map(([key, dest]) => ({
                key,
                name: dest.name,
                lat: dest.lat,
                lon: dest.lon,
              }))
      }

      for (const location of locationsToFetch) {
        if (!location) continue

        try {
          const cacheKey = `weather:${type}:${location.key}`
          const ttlSeconds = type === "current" ? 600 : 1800 // 10 min current, 30 min forecast

          // Check cache first
          const cached = await redisGet<any>(cacheKey)
          if (cached) {
            console.log(`[weather] Cache hit for ${cacheKey}`)
            weatherData.push(cached)
            continue
          }

          let weatherUrl

          if (type === "forecast") {
            weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${openWeatherApiKey}&units=metric`
          } else {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${openWeatherApiKey}&units=metric`
          }

          const weatherResponse = await fetch(weatherUrl)

          if (!weatherResponse.ok) {
            console.warn(
              `Weather API failed for ${location.name}: ${weatherResponse.status}`,
            )
            continue
          }

          const data = await weatherResponse.json()
          let processed: any

          if (type === "forecast") {
            processed = {
              location: location.key,
              name: location.name,
              type: "forecast",
              forecast: data.list.slice(0, 15).map((item: any) => ({
                datetime: new Date(item.dt * 1000).toISOString(),
                temperature: Math.round(item.main.temp),
                feels_like: Math.round(item.main.feels_like),
                humidity: item.main.humidity,
                description: item.weather[0].description,
                main: item.weather[0].main,
                icon: item.weather[0].icon,
                wind_speed: item.wind.speed,
                rain: item.rain?.["3h"] || 0,
              })),
              city: data.city.name,
              country: data.city.country,
              cached_at: new Date().toISOString(),
            }
          } else {
            processed = {
              location: location.key,
              name: location.name,
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
                uv_index: null,
              },
              city: data.name,
              country: data.sys.country,
              cached_at: new Date().toISOString(),
            }
          }

          await redisSet(cacheKey, processed, ttlSeconds)
          weatherData.push(processed)

          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (locationError) {
          console.error(
            `Error fetching weather for ${location.name}:`,
            locationError,
          )
        }
      }

      if (weatherData.length === 0) {
        console.log("Error retreiving weather data")
        throw new Error("No weather data could be retrieved")
      }

      return new Response(
        JSON.stringify({
          data: {
            weather: weatherData,
            timestamp: new Date().toISOString(),
            cache_duration: type === "current" ? "10 minutes" : "1 hour",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    } catch (error) {
      console.error("Weather service error:", error)
      const message =
        error instanceof Error ? error.message : "Unknown error occurred"

      const errorResponse = {
        error: {
          code: "WEATHER_SERVICE_ERROR",
          message,
        },
      }

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }),
)
