"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

import { useTranslations } from "next-intl"
import { useGeolocation } from "../hooks/use-geolocation"
import { supabase } from "../utils/supabase/client"
import { Droplets, MapPin, Eye, Thermometer, Wind, CloudRain } from "lucide-react"
import { CostaRicaMap } from "./CostaRicaMap"
import WeatherForecast from "./WeatherForecast"
import WeatherCurrent from "./WeatherCurrent"
import { RadarControls } from "./RadarControls"
import { useRainViewer } from "../hooks/use-rainviewer"
import costaRicaDestinations from "../lib/shared/destinations"
import MapTooltipContent from "./MapTooltipContent"

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
  
  // Radar state
  const [radarOpacity, setRadarOpacity] = useState(0.6)
  const {
    currentFrame,
    currentFrameIndex,
    allFrames,
    getTileUrl,
    nextFrame,
    previousFrame,
    goToFrame,
    isPlaying,
    togglePlayback,
    refresh: refreshRadar,
  } = useRainViewer()

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
        console.log("USER WEATHER", userWeather)

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
    if (!weatherData) fetchWeatherData()
  }, [weatherData])

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
      <WeatherForecast
        forecastData={forecastData}
        locationName={locationName}
      />

      {/* Weather Map with Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">{t("weatherMap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weather" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="weather">
                <MapPin className="h-4 w-4 mr-2" />
                Weather Data
              </TabsTrigger>
              <TabsTrigger value="radar">
                <CloudRain className="h-4 w-4 mr-2" />
                Radar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="weather" className="mt-0">
              {allWeatherData ? (
                <CostaRicaMap destinations={getDestinations(allWeatherData)} />
              ) : (
                <div className="h-[700px] flex items-center justify-center">
                  Loading weather data...
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="radar" className="mt-0 space-y-4">
              <RadarControls
                isPlaying={isPlaying}
                currentFrameIndex={currentFrameIndex}
                totalFrames={allFrames.length}
                currentFrameTime={currentFrame?.time || null}
                onTogglePlayback={togglePlayback}
                onPreviousFrame={previousFrame}
                onNextFrame={nextFrame}
                onGoToFrame={goToFrame}
                onRefresh={refreshRadar}
                opacity={radarOpacity}
                onOpacityChange={setRadarOpacity}
              />
              {allWeatherData ? (
                <CostaRicaMap 
                  destinations={getDestinations(allWeatherData)}
                  radarTileUrl={getTileUrl(currentFrame)}
                  radarOpacity={radarOpacity}
                />
              ) : (
                <div className="h-[700px] flex items-center justify-center">
                  Loading map...
                </div>
              )}
            </TabsContent>
          </Tabs>
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
