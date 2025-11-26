"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

import { useTranslations } from "next-intl"
import { useGeolocation } from "../hooks/use-geolocation"
import { useWeatherData, WeatherData } from "../providers/WeatherDataProvider"
import {
  Droplets,
  MapPin,
  Eye,
  Thermometer,
  Wind,
  CloudRain,
  Waves,
} from "lucide-react"
import WeatherForecast from "./WeatherForecast"
import WeatherCurrent from "./WeatherCurrent"
import costaRicaDestinations from "../lib/shared/destinations"
import MapTooltipContent from "./MapTooltipContent"
import Tides from "./Tides"
import Radar from "./Radar"
import GoogleMapsWrapper from "./GoogleMapsWrapper"
import RegionalWeather, { TabOfRegional } from "./RegionalWeather"
import { stringToEnum } from "../lib/utils"

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

const getWeatherIcon = (iconCode: string) => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
}

const getDestinations = (weatherData: WeatherData[] | null) => {
  if (!weatherData) return null
  const weatherMap: Record<string, WeatherData> = {}
  weatherData.forEach(
    (weather: WeatherData) => (weatherMap[weather.location] = weather)
  )

  const destinations = Object.entries(costaRicaDestinations).map(
    ([key, dest]: [string, any]) => {
      const weather = weatherMap?.[key]
      if (!weather) return { ...dest, content: "No weather data" }
      return {
        ...dest,
        content: (
          <MapTooltipContent
            data={{
              icon: weather.current.icon
                ? getWeatherIcon(weather.current.icon)
                : null,
              description: weather.current.description,
            }}
          >
            <div className="text-2xl font-bold">
              {weather.current.temperature}°C
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Thermometer className="w-5 h-5 text-orange-500" />
                <span>Feels {weather.current.feels_like}°C</span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="w-5 h-5 text-blue-500" />
                <span>{weather.current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-5 h-5 text-gray-500" />
                <span>{weather.current.wind_speed} m/s</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-5 h-5 text-gray-500" />
                <span>{Math.round(weather.current.visibility / 1000)} km</span>
              </div>
            </div>
          </MapTooltipContent>
        ),
      }
    }
  )
  return destinations
}

export function WeatherPage() {
  const t = useTranslations("WeatherPage")
  const [activeTab, setActiveTab] = useState(TabOfRegional.Weather)
  const [locationName, setLocationName] = useState("San José")
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null)

  // Use Weather Data Provider
  const {
    weatherData: allWeatherData,
    loading: providerLoading,
    errors: providerErrors,
    refreshWeather,
  } = useWeatherData()

  const {
    position,
    loading: geoLoading,
    error: geoError,
    requestLocation,
    isInCostaRica,
  } = useGeolocation()

  // Find user's weather data for location name
  useEffect(() => {
    if (allWeatherData && allWeatherData.length > 0) {
      let userWeather = allWeatherData.find(
        (w: any) => w.location === "san-jose" // Default
      )

      // If user is in Costa Rica, use their closest location
      if (position && isInCostaRica) {
        const closest = allWeatherData.reduce((prev: any, curr: any) => {
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
        })

        userWeather = closest
        setLocationName(closest.name)
      } else {
        setLocationName("San José")
      }

      // Find forecast data for user location
      if (userWeather && allWeatherData.length > 0) {
        // For now, use the same data structure - would need forecast data from provider
        setForecastData(null)
      }
    }
  }, [allWeatherData, position, isInCostaRica])

  // Request location permission on mount
  useEffect(() => {
    if (!position && !geoLoading && !geoError) {
      requestLocation()
    }
  }, [position, geoLoading, geoError, requestLocation])

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
        weatherData={
          allWeatherData?.find(
            (w: any) =>
              w.location ===
              (position && isInCostaRica ? "closest" : "san-jose")
          ) || allWeatherData?.[0]
        }
        weatherLoading={providerLoading.weather}
        weatherError={providerErrors.weather}
        fetchWeatherData={refreshWeather}
        locationName={locationName}
      />

      {/* 5-Day Forecast */}
      <WeatherForecast
        forecastData={forecastData}
        locationName={locationName}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">{t("weatherMap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={val =>
              setActiveTab(
                stringToEnum(val, TabOfRegional) || TabOfRegional.Weather
              )
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="weather">
                <MapPin className="h-4 w-4 mr-2" />
                Weather Data
              </TabsTrigger>
              <TabsTrigger value="radar">
                <CloudRain className="h-4 w-4 mr-2" />
                Radar
              </TabsTrigger>
              <TabsTrigger value="tides and waves">
                <Waves className="h4 w-4 mr-2" />
                Tides and waves
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weather" className="mt-0">
              {allWeatherData ? (
                <GoogleMapsWrapper
                  destinations={getDestinations(allWeatherData)}
                />
              ) : (
                <div className="h-[700px] flex items-center justify-center">
                  Loading weather data...
                </div>
              )}
            </TabsContent>

            <TabsContent value="radar" className="mt-0 space-y-4">
              <Radar />
            </TabsContent>
            <TabsContent value="tides and waves" className="mt-0 space-y-4">
              <Tides />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Regional Weather - Dynamic based on active tab */}
      <RegionalWeather activeTab={activeTab} />
    </div>
  )
}
