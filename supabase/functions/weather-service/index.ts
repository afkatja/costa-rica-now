Deno.serve(async req => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "false",
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

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

    // Costa Rica major destinations with coordinates
    const costaRicaDestinations = {
      "san-jose": { name: "San José", lat: 9.9281, lon: -84.0907 },
      "manuel-antonio": { name: "Manuel Antonio", lat: 9.3905, lon: -84.1376 },
      monteverde: { name: "Monteverde", lat: 10.3087, lon: -84.8012 },
      arenal: { name: "Arenal Volcano", lat: 10.4148, lon: -84.7286 },
      guanacaste: { name: "Guanacaste Province", lat: 10.6345, lon: -85.4408 },
      "puerto-viejo": { name: "Puerto Viejo", lat: 9.6544, lon: -82.7582 },
      dominical: { name: "Dominical", lat: 9.2456, lon: -83.8606 },
      uvita: { name: "Uvita", lat: 9.1473, lon: -83.7613 },
      "puerto-jimenez": {
        name: "Puerto Jiménez",
        lat: 8.53894,
        lon: -83.305272,
      },
      tortuguero: { name: "Tortuguero", lat: 10.5475, lon: -83.5049 },
      "san-isidro": {
        name: "San Isidro de el General",
        lat: 9.3783,
        lon: -83.7036,
      },
      "san-vito": { name: "San Vito", lat: 8.8218, lon: -82.9705 },
    }

    const weatherData = []

    // Helper function to calculate distance between two coordinates
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371 // Radius of the Earth in kilometers
      const dLat = ((lat2 - lat1) * Math.PI) / 180
      const dLon = ((lon2 - lon1) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }

    // If user has location context and is in Costa Rica, prioritize their location
    let locationsToFetch
    if (
      locationContext &&
      locationContext.isInCostaRica &&
      locationContext.latitude &&
      locationContext.longitude
    ) {
      // Add user's location first, then nearby destinations within radius
      locationsToFetch = []

      // Add user's current location
      locationsToFetch.push({
        key: "user-location",
        name: "Your Location",
        lat: locationContext.latitude,
        lon: locationContext.longitude,
      })

      // Add nearby destinations within 100km radius
      const nearbyDestinations = Object.entries(costaRicaDestinations).filter(
        ([key, dest]) => {
          const distance = calculateDistance(
            locationContext.latitude,
            locationContext.longitude,
            dest.lat,
            dest.lon
          )
          return distance <= locationContext.radiusKm
        }
      )

      // Add nearby destinations (limit to 3 to keep response manageable)
      locationsToFetch.push(
        ...nearbyDestinations.slice(0, 3).map(([key, dest]) => ({
          key,
          name: dest.name,
          lat: dest.lat,
          lon: dest.lon,
        }))
      )

      // If no nearby destinations, add some popular ones
      if (locationsToFetch.length === 1) {
        locationsToFetch.push(
          { key: "san-jose", ...costaRicaDestinations["san-jose"] },
          { key: "manuel-antonio", ...costaRicaDestinations["manuel-antonio"] }
        )
      }
    } else {
      // Default behavior: use provided locations or all major destinations
      locationsToFetch =
        locations && locations.length > 0
          ? locations
              .map(loc => ({
                key: loc,
                ...costaRicaDestinations[loc],
              }))
              .filter(Boolean)
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
        let weatherUrl

        if (type === "forecast") {
          // 5-day forecast
          weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${openWeatherApiKey}&units=metric`
        } else {
          // Current weather
          weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${openWeatherApiKey}&units=metric`
        }

        const weatherResponse = await fetch(weatherUrl)

        if (!weatherResponse.ok) {
          console.warn(
            `Weather API failed for ${location.name}: ${weatherResponse.status}`
          )
          continue
        }

        const data = await weatherResponse.json()

        if (type === "forecast") {
          // Process forecast data
          const processedForecast = {
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
          weatherData.push(processedForecast)
        } else {
          // Process current weather data
          const processedWeather = {
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
              uv_index: null, // Not available in current weather API
            },
            city: data.name,
            country: data.sys.country,
            cached_at: new Date().toISOString(),
          }
          weatherData.push(processedWeather)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (locationError) {
        console.error(
          `Error fetching weather for ${destination.name}:`,
          locationError
        )
        // Continue with other locations even if one fails
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
          cache_duration: type === "current" ? "10 minutes" : "1 hour",
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Weather service error:", error)

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
