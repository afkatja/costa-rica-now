import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { useTranslations } from "next-intl"
import {
  Clock,
  CloudRain,
  Droplets,
  Eye,
  Loader2,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react"
import { mockWeatherData } from "../utils/mockWeatherData"
import WeatherIcons from "../lib/WeatherIcons"

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const WeatherCurrent = ({
  weatherData,
  weatherLoading,
  weatherError,
  fetchWeatherData,
  locationName,
}: {
  weatherData: any
  weatherLoading?: boolean
  weatherError?: string | null
  fetchWeatherData: () => void
  locationName: string
}) => {
  const t = useTranslations("WeatherPage")
  const { current: mockCurrent } = mockWeatherData

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-bold">
          {t("currentConditions")} {locationName}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {t("lastUpdated")}:{" "}
          {weatherData
            ? formatTime(weatherData.cached_at)
            : formatTime(mockCurrent.lastUpdated)}
        </div>
      </CardHeader>
      <CardContent>
        {weatherLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading weather data...
            </span>
          </div>
        ) : weatherError ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Failed to load weather data</div>
            <div className="text-sm text-muted-foreground mb-4">
              {weatherError}
            </div>
            <button
              onClick={fetchWeatherData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center flex">
              <WeatherIcons
                iconType={
                  weatherData
                    ? weatherData.current.main.toLowerCase()
                    : mockCurrent.icon
                }
              />
              <div className="ml-2">
                <p className="text-3xl font-medium">
                  {weatherData
                    ? weatherData.current.temperature
                    : mockCurrent.temperature}
                  °C
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("feelsLike")}:{" "}
                  {weatherData
                    ? weatherData.current.feels_like
                    : mockCurrent.feelsLike}
                  °C
                </p>
                <p className="text-sm mt-1">
                  {weatherData
                    ? weatherData.current.description
                    : mockCurrent.description}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                <span className="text-sm">
                  {t("humidity")}:{" "}
                  {weatherData
                    ? weatherData.current.humidity
                    : mockCurrent.humidity}
                  %
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-gray-500" />
                <span className="text-sm">
                  {t("wind")}:{" "}
                  {weatherData
                    ? Math.round(weatherData.current.wind_speed * 3.6)
                    : mockCurrent.windSpeed}{" "}
                  km/h
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-gray-500" />
                <span className="text-sm">
                  {t("visibility")}:{" "}
                  {weatherData
                    ? Math.round(weatherData.current.visibility / 1000)
                    : mockCurrent.visibility}{" "}
                  km
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <span className="text-sm">
                  {t("pressure")}:{" "}
                  {weatherData
                    ? weatherData.current.pressure
                    : mockCurrent.pressure}{" "}
                  hPa
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {weatherData && weatherData.current.uv_index && (
                <div className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm">
                    {t("uv")}:{" "}
                    {weatherData
                      ? weatherData.current.uv_index
                      : mockCurrent.uvIndex}
                  </span>
                </div>
              )}
              {weatherData && weatherData.current.cloudCover && (
                <div className="flex items-center gap-2">
                  <CloudRain className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">
                    {t("clouds")}:{" "}
                    {weatherData ? "N/A" : mockCurrent.cloudCover}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WeatherCurrent
