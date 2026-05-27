import { useEffect } from "react"
import { useWeatherData } from "../providers/WeatherDataProvider"

export function useWeatherPage() {
  const { weatherData, refreshWeather, loading, errors } = useWeatherData()

  useEffect(() => {
    if (weatherData.length === 0) {
      refreshWeather()
    }
  }, [])

  return { weatherData, refreshWeather, loading: loading.weather, error: errors.weather }
}

export function useRadarPage() {
  const { radarData, refreshRadar, loading, errors } = useWeatherData()

  useEffect(() => {
    if (radarData.length === 0) {
      refreshRadar()
    }
  }, [])

  return { radarData, refreshRadar, loading: loading.radar, error: errors.radar }
}

export function useSeaPage() {
  const { tidesData, refreshTides, loading, errors } = useWeatherData()

  useEffect(() => {
    if (tidesData.length === 0) {
      refreshTides()
    }
  }, [])

  return { tidesData, refreshTides, loading: loading.tides, error: errors.tides }
}
