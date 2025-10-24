import costaRicaDestinations from "../../../src/lib/shared/destinations.ts"
import { corsHeaders } from "../_shared/cors.ts"

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const {
      locations,
      types = ["current", "forecast"], // Support multiple types in one call
      locationContext = null,
    } = await req.json()
    const openWeatherApiKey = Deno.env.get("OPENWEATHERMAP_API_KEY")

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
