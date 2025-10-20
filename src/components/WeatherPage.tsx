"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { useTranslations } from "next-intl"
import { useGeolocation } from "../hooks/use-geolocation"
import { supabase } from "../utils/supabase/client"
import { Droplets, MapPin } from "lucide-react"
import { CostaRicaMap } from "./CostaRicaMap"
import WeatherForecast from "./WeatherForecast"
import WeatherCurrent from "./WeatherCurrent"
import costaRicaDestinations from "../lib/shared/destinations"

interface WeatherData {
  location: string
  name: string
  type: string
  country: string
  region: string
  city: string
  cached_at: string
  current: {
    temperature: number
    feels_like: number
    humidity: number
    description: string
    main: string
    icon: string
    wind_speed: number
    pressure: number
    visibility: number
    uv_index: number | null
  }
}
interface ForecastData {
  location: string
  name: string
  type: string
  forecast: Array<{
    date: string
    day: string
    high: number
    low: number
    avg_temp: number
    avg_feels_like: number
    avg_humidity: number
    avg_wind_speed: number
    total_rain: number
    description: string
    main: string
    icon: string
  }>
  city: string
  country: string
  cached_at: string
}

const getRegionalWeather = () => {
  const regionMap = new Map<
    string,
    [string, (typeof costaRicaDestinations)[keyof typeof costaRicaDestinations]]
  >()
  Object.entries(costaRicaDestinations).forEach(([key, dest]) => {
    if (!regionMap.has(dest.region)) {
      regionMap.set(dest.region, [key, dest])
    }
  })

  return Array.from(regionMap.values())
}

export function WeatherPage() {
  const t = useTranslations("WeatherPage")

  // Geolocation and weather state
  const {
    position,
    loading: geoLoading,
    error: geoError,
    requestLocation,
    isInCostaRica,
  } = useGeolocation()
  const [weatherData, setWeatherData] = useState<WeatherData[] | null>(null)
  const [allWeatherData, setAllWeatherData] = useState<WeatherData[] | null>(
    null
  )
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [locationName, setLocationName] = useState("San José")

  const allLocationKeys = Object.keys(costaRicaDestinations)

  const fetchWeatherData = async () => {
    try {
      setWeatherLoading(true)
      setWeatherError(null)

      const response = await supabase.functions.invoke(
        "weather-service-enhanced",
        {
          body: {
            locations: allLocationKeys,
            types: ["current", "forecast"],
          },
        }
      )

      if (response.error)
        throw new Error(`Weather service error: ${response.error}`)
      const result = response.data?.data
      if (result?.weather) {
        const currentWeather = result.weather.filter(
          (w: any) => w.type === "current"
        )
        setAllWeatherData(currentWeather)
        const forecastWeather = result.weather.filter(
          (w: any) => w.type === "forecast"
        )

        let userWeather = currentWeather.find(
          (w: any) => w.location === "san-jose" // Default
        )
        // If user is in Costa Rica, use their location
        if (position && isInCostaRica) {
          const closest = currentWeather.reduce(
            (prev: Record<string, any>, curr: Record<string, any>) => {
              const prevDest =
                costaRicaDestinations[
                  prev.location as keyof typeof costaRicaDestinations
                ]
              const currDest =
                costaRicaDestinations[
                  curr.location as keyof typeof costaRicaDestinations
                ]

              if (!prevDest || !currDest) return prev

              const prevDist = Math.sqrt(
                Math.pow(prevDest.lat - position.latitude, 2) +
                  Math.pow(prevDest.lon - position.longitude, 2)
              )
              const currDist = Math.sqrt(
                Math.pow(currDest.lat - position.latitude, 2) +
                  Math.pow(currDest.lon - position.longitude, 2)
              )

              return currDist < prevDist ? curr : prev
            }
          )

          userWeather = closest
          setLocationName(closest.name)
        } else {
          setLocationName("San José")
        }
        const userForecast = forecastWeather.find(
          (w: any) => w.location === userWeather?.location
        )
        if (userWeather) setWeatherData(userWeather)
        if (userForecast) setForecastData(userForecast)
      }
    } catch (err) {
      console.error("Error fetching weather data:", err)
      setWeatherError(
        err instanceof Error ? err.message : "Failed to fetch weather data"
      )
    } finally {
      setWeatherLoading(false)
    }
  }

  // Fetch weather data when component mounts or location changes
  useEffect(() => {
    fetchWeatherData()
  }, [position, isInCostaRica])

  // Request location permission on mount
  useEffect(() => {
    if (!position && !geoLoading && !geoError) {
      requestLocation()
    }
    // if (geoError) setWeatherError(geoError)
  }, [position, geoLoading, geoError, requestLocation])

  const uniqueLocations = getRegionalWeather()

  const regions = uniqueLocations
    .map(([key, dest]) => {
      if (!allWeatherData) return null
      const regionWeather = allWeatherData.find(
        ({ location }: { location: string }) => location === key
      )
      if (!regionWeather) return null
      return regionWeather
    })
    .filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h2>{t("title")}</h2>
        </div>
        {!position && !geoLoading && (
          <button
            onClick={requestLocation}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Use My Location
          </button>
        )}
      </div>

      {/* Current Weather */}
      <WeatherCurrent
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        fetchWeatherData={fetchWeatherData}
        locationName={locationName}
      />

      {/* 5-Day Forecast */}
      <WeatherForecast forecastData={forecastData} />

      {/* Weather Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">{t("weatherMap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CostaRicaMap />
        </CardContent>
      </Card>

      {/* Regional Weather */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            {t("regionalWeather")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {regions.length &&
              regions.map((region, index) => (
                <div key={region?.name} className="p-4 rounded-lg border">
                  <h5 className="font-medium mb-2">{region?.region}</h5>
                  <p className="text-2xl font-medium mb-1">
                    {region?.current.temperature}°C
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {region?.current.description}
                  </p>
                  <p className="flex items-center gap-1 text-xs">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    {region?.current.humidity}% {t("humidity")}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
