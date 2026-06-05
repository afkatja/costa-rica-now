import { useEffect, useCallback } from "react"
import { useWeatherData } from "../providers/WeatherDataProvider"

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const ERROR_RETRY_DELAY = 30 * 1000 // 30 seconds

export function useWeatherPage() {
  const { weatherData, forecastData, refreshWeather, loading, errors } =
    useWeatherData()

  useEffect(() => {
    if (weatherData.length === 0) {
      refreshWeather()
    }
  }, [weatherData.length, refreshWeather])

  // Error recovery with retry
  const retryRefreshWeather = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, ERROR_RETRY_DELAY))
    return refreshWeather()
  }, [refreshWeather])

  return {
    weatherData,
    forecastData,
    refreshWeather,
    retryRefreshWeather,
    loading: loading.weather,
    error: errors.weather,
  }
}

export function useRadarPage() {
  const { radarData, refreshRadar, loading, errors } = useWeatherData()

  useEffect(() => {
    if (radarData.length === 0) {
      refreshRadar()
    }
  }, [radarData.length, refreshRadar])

  // Error recovery with retry
  const retryRefreshRadar = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, ERROR_RETRY_DELAY))
    return refreshRadar()
  }, [refreshRadar])

  return {
    radarData,
    refreshRadar,
    retryRefreshRadar,
    loading: loading.radar,
    error: errors.radar,
  }
}

export function useSeaPage() {
  const { tidesData, refreshTides, loading, errors } = useWeatherData()

  useEffect(() => {
    if (tidesData.length === 0) {
      refreshTides()
    }
  }, [tidesData.length, refreshTides])

  // Error recovery with retry
  const retryRefreshTides = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, ERROR_RETRY_DELAY))
    return refreshTides()
  }, [refreshTides])

  // Check if data is stale (older than cache duration)
  const isDataStale = useCallback(() => {
    if (tidesData.length === 0) return true
    const oldestData = tidesData.reduce((oldest, current) => {
      const oldestTime = oldest.lastUpdated
        ? new Date(oldest.lastUpdated).getTime()
        : 0
      const currentTime = current.lastUpdated
        ? new Date(current.lastUpdated).getTime()
        : 0
      return oldestTime < currentTime ? oldest : current
    })

    if (!oldestData.lastUpdated) return true
    const dataAge = Date.now() - new Date(oldestData.lastUpdated).getTime()
    return dataAge > CACHE_DURATION
  }, [tidesData])

  // Auto-refresh if data is stale
  useEffect(() => {
    if (isDataStale() && !loading.tides) {
      refreshTides()
    }
  }, [isDataStale, loading.tides, refreshTides])

  return {
    tidesData,
    refreshTides,
    retryRefreshTides,
    isDataStale,
    loading: loading.tides,
    error: errors.tides,
  }
}
