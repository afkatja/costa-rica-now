"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"
import { supabase } from "../utils/supabase/client"
import costaRicaDestinations, {
  coastalDestinations,
} from "../lib/shared/destinations"

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

interface RadarData {
  location: string
  name: string
  region: string
  available: boolean
  precipitationIntensity: "none" | "light" | "moderate" | "heavy" | "severe"
  lastUpdated: string | null
}

interface TideData {
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
  surfConditions: "excellent" | "good" | "fair" | "poor" | null
  lastUpdated: string | null
}

interface WeatherDataContextType {
  weatherData: WeatherData[]
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
  refreshWeather: (locations?: string[]) => Promise<void>
  refreshRadar: () => Promise<void>
  refreshTides: () => Promise<void>
  fetchWeatherForLocation: (location: string) => Promise<void>
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
        (typeof costaRicaDestinations)[keyof typeof costaRicaDestinations]
      ]
    >()
    Object.entries(costaRicaDestinations).forEach(([key, dest]) => {
      if (!regionMap.has(dest.region)) {
        regionMap.set(dest.region, [key, dest])
      }
    })
    return Array.from(regionMap.values())
  }

  // Fetch weather data for specific locations
  const refreshWeather = async (locations?: string[]) => {
    try {
      setLoading(prev => ({ ...prev, weather: true }))
      setErrors(prev => ({ ...prev, weather: null }))

      const locationKeys = locations || Object.keys(costaRicaDestinations)

      const response = await supabase.functions.invoke(
        "weather-service-enhanced",
        {
          body: {
            locations: locationKeys,
            types: ["current"],
          },
        }
      )

      if (response.error) {
        throw new Error(
          `Weather service error: ${response.error.message ?? response.error}`
        )
      }

      const result = response.data?.data
      if (result?.weather) {
        const currentWeather = result.weather.filter(
          (w: any) => w.type === "current"
        )
        setWeatherData(prevData => {
          // Merge new data with existing data to avoid losing other locations
          const newWeatherMap = new Map<string, WeatherData>()
          currentWeather.forEach((w: WeatherData) => {
            newWeatherMap.set(w.location, w)
          })

          const existingWeatherMap = new Map<string, WeatherData>()
          prevData.forEach(w => {
            existingWeatherMap.set(w.location, w)
          })

          return Array.from(newWeatherMap.entries()).map(
            ([location, weather]) => {
              const existingWeather = existingWeatherMap.get(location)
              return existingWeather
                ? { ...existingWeather, ...weather }
                : weather
            }
          )
        })
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

  // Fetch weather data for a specific location
  const fetchWeatherForLocation = async (location: string) => {
    await refreshWeather([location])
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
          `HTTP ${radarResponse.status}: ${radarResponse.statusText}`
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
        })
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

  // Fetch tides data for coastal regions
  const refreshTides = async () => {
    try {
      setLoading(prev => ({ ...prev, tides: true }))
      setErrors(prev => ({ ...prev, tides: null }))

      const tidesPromises = coastalDestinations.map(async locationKey => {
        try {
          const response = await fetch(
            `/api/beaches?destination=${encodeURIComponent(locationKey.id)}`
          )
          if (!response.ok) return null

          const beachData = await response.json()

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
            surfConditions: beachData?.surfConditions || null,
            lastUpdated: beachData?.lastUpdated || null,
          } as TideData
        } catch (err) {
          console.error(`Error fetching tides for ${locationKey.id}:`, err)
          return null
        }
      })

      const tidesResults = await Promise.all(tidesPromises)
      const validTidesData = tidesResults.filter(Boolean) as TideData[]

      setTidesData(validTidesData)
    } catch (err) {
      console.error("Error fetching tides data:", err)
      setErrors(prev => ({
        ...prev,
        tides:
          err instanceof Error ? err.message : "Failed to fetch tides data",
      }))
    } finally {
      setLoading(prev => ({ ...prev, tides: false }))
    }
  }

  // // Fetch all data
  // const fetchAllData = async () => {
  //   await Promise.all([refreshWeather(), refreshRadar(), refreshTides()])
  // }

  // // Initial data fetch
  // useEffect(() => {
  //   fetchAllData()
  // }, [])

  const value: WeatherDataContextType = {
    weatherData,
    radarData,
    tidesData,
    loading,
    errors,
    // fetchAllData,
    refreshWeather,
    refreshRadar,
    refreshTides,
    fetchWeatherForLocation,
  }

  return (
    <WeatherDataContext.Provider value={value}>
      {children}
    </WeatherDataContext.Provider>
  )
}
