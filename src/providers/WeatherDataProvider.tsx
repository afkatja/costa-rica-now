"use client"

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react"
import { supabase } from "../utils/supabase/client"
import costaRicaDestinations, {
  coastalDestinations,
} from "../lib/shared/destinations"

/** Raw beach conditions response from the /api/beaches endpoint */
interface BeachApiResponse {
  tides: {
    extremes: Array<{ time: string; height: number; type: string }>
    nextHigh: { time: string; height: number } | null
    nextLow: { time: string; height: number } | null
    currentTide: "rising" | "falling" | null
  }
  waves: {
    current: {
      height: number
      direction: number
      directionCardinal: string
      time: string
    }
    forecast: Array<{
      time: string
      height: number
      direction: number
      directionCardinal: string
    }>
    average24h: number
    max24h: number
  }
  surfConditions: "excellent" | "good" | "fair" | "poor"
  lastUpdated: string
}

// Type definitions
export interface WeatherData {
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

export interface ForecastData {
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

interface RadarData {
  location: string
  name: string
  region: string
  available: boolean
  precipitationIntensity: "none" | "light" | "moderate" | "heavy" | "severe"
  lastUpdated: string | null
}

/** Tide and wave data for a single coastal location */
export interface TideData {
  location: string
  name: string
  region: string
  available: boolean
  currentHeight: number | null
  nextHigh: { time: string; height: number } | null
  nextLow: { time: string; height: number } | null
  currentTide: "rising" | "falling" | null
  waveHeight: number | null
  waveDirection: number | null
  waveDirectionCardinal: string | null
  waveForecast: Array<{
    time: string
    height: number
    direction: number
    directionCardinal: string
  }> | null
  waveAverage24h: number | null
  waveMax24h: number | null
  surfConditions: "excellent" | "good" | "fair" | "poor" | null
  lastUpdated: string | null
}

interface WeatherDataContextType {
  weatherData: WeatherData[]
  forecastData: ForecastData[]
  radarData: RadarData[]
  tidesData: TideData[]
  loading: {
    weather: boolean
    radar: boolean
    tides: boolean
  }
  errors: {
    weather: string | null
    radar: string | null
    tides: string | null
  }
  // fetchAllData: () => Promise<void>
  refreshWeather: () => Promise<void>
  refreshRadar: () => Promise<void>
  refreshTides: () => Promise<void>
}

const WeatherDataContext = createContext<WeatherDataContextType | null>(null)

export const useWeatherData = () => {
  const context = useContext(WeatherDataContext)
  if (!context) {
    throw new Error("useWeatherData must be used within WeatherDataProvider")
  }
  return context
}

interface WeatherDataProviderProps {
  children: ReactNode
}

export const WeatherDataProvider: React.FC<WeatherDataProviderProps> = ({
  children,
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([])
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [radarData, setRadarData] = useState<RadarData[]>([])
  const [tidesData, setTidesData] = useState<TideData[]>([])

  const [loading, setLoading] = useState({
    weather: false,
    radar: false,
    tides: false,
  })

  const [errors, setErrors] = useState<{
    weather: string | null
    radar: string | null
    tides: string | null
  }>({
    weather: null,
    radar: null,
    tides: null,
  })

  // Helper function to get unique regions
  const getUniqueRegions = () => {
    const regionMap = new Map<
      string,
      [
        string,
        (typeof costaRicaDestinations)[keyof typeof costaRicaDestinations],
      ]
    >()
    Object.entries(costaRicaDestinations).forEach(([key, dest]) => {
      if (!regionMap.has(dest.region)) {
        regionMap.set(dest.region, [key, dest])
      }
    })
    return Array.from(regionMap.values())
  }

  // Fetch weather data for all regions
  const refreshWeather = async () => {
    try {
      setLoading(prev => ({ ...prev, weather: true }))
      setErrors(prev => ({ ...prev, weather: null }))

      const allLocationKeys = Object.keys(costaRicaDestinations)

      const response = await supabase.functions.invoke(
        "weather-service-enhanced",
        {
          body: {
            locations: allLocationKeys,
            types: ["current", "forecast"],
          },
        },
      )

      if (response.error) {
        throw new Error(
          `Weather service error: ${response.error.message ?? response.error}`,
        )
      }

      const result = response.data?.data
      if (result?.weather) {
        const currentWeather = result.weather.filter(
          (w: any) => w.type === "current",
        )
        const forecastWeather = result.weather.filter(
          (w: any) => w.type === "forecast",
        )
        setWeatherData(currentWeather)
        setForecastData(forecastWeather)
      }
    } catch (err) {
      console.error("Error fetching weather data:", err)
      setErrors(prev => ({
        ...prev,
        weather:
          err instanceof Error ? err.message : "Failed to fetch weather data",
      }))
    } finally {
      setLoading(prev => ({ ...prev, weather: false }))
    }
  }

  // Fetch radar data for all regions (simulated based on available radar data)
  const refreshRadar = async () => {
    try {
      setLoading(prev => ({ ...prev, radar: true }))
      setErrors(prev => ({ ...prev, radar: null }))

      // Check radar availability and generate regional data
      const radarResponse = await fetch("/api/radar/tiles?check=true")

      if (!radarResponse.ok) {
        throw new Error(
          `HTTP ${radarResponse.status}: ${radarResponse.statusText}`,
        )
      }

      const radarStatus = await radarResponse.json()

      const uniqueRegions = getUniqueRegions()
      const radarRegionalData: RadarData[] = uniqueRegions.map(
        ([key, dest]) => ({
          location: key,
          name: dest.name,
          region: dest.region,
          available: radarStatus.available,
          precipitationIntensity: "none", // This would need to be calculated from actual radar tiles
          lastUpdated: radarStatus.timestamp
            ? new Date(radarStatus.timestamp).toISOString()
            : null,
        }),
      )

      setRadarData(radarRegionalData)
    } catch (err) {
      console.error("Error fetching radar data:", err)
      setErrors(prev => ({
        ...prev,
        radar:
          err instanceof Error ? err.message : "Failed to fetch radar data",
      }))
    } finally {
      setLoading(prev => ({ ...prev, radar: false }))
    }
  }

  /** Fetches tide and wave data for all coastal destinations with error handling */
  const refreshTides = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, tides: true }))
      setErrors(prev => ({ ...prev, tides: null }))

      const tidesPromises = coastalDestinations.map(async locationKey => {
        try {
          const response = await fetch(
            `/api/beaches?destination=${encodeURIComponent(locationKey.id)}`,
          )
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const beachData: BeachApiResponse = await response.json()

          return {
            location: locationKey.id,
            name: locationKey.name,
            region: locationKey.region,
            available: true,
            currentHeight: beachData?.tides?.extremes?.[0]?.height || null,
            nextHigh: beachData?.tides?.nextHigh || null,
            nextLow: beachData?.tides?.nextLow || null,
            currentTide: beachData?.tides?.currentTide || null,
            waveHeight: beachData?.waves?.current?.height || null,
            waveDirection: beachData?.waves?.current?.direction || null,
            waveDirectionCardinal:
              beachData?.waves?.current?.directionCardinal || null,
            waveForecast: beachData?.waves?.forecast || null,
            waveAverage24h: beachData?.waves?.average24h || null,
            waveMax24h: beachData?.waves?.max24h || null,
            surfConditions: beachData?.surfConditions || null,
            lastUpdated: beachData?.lastUpdated || null,
          } as TideData
        } catch {
          return null
        }
      })

      const tidesResults = await Promise.all(tidesPromises)
      const validTidesData = tidesResults.filter(Boolean) as TideData[]

      setTidesData(validTidesData)
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        tides:
          err instanceof Error ? err.message : "Failed to fetch tides data",
      }))
    } finally {
      setLoading(prev => ({ ...prev, tides: false }))
    }
  }, [])

  const value: WeatherDataContextType = {
    weatherData,
    forecastData,
    radarData,
    tidesData,
    loading,
    errors,
    refreshWeather,
    refreshRadar,
    refreshTides,
  }

  return (
    <WeatherDataContext.Provider value={value}>
      {children}
    </WeatherDataContext.Provider>
  )
}
