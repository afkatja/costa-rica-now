"use client"

import { useState, useEffect } from "react"
import {
  Cloud,
  Sun,
  CloudRain,
  Zap,
  Snowflake,
  Wind,
  Eye,
  Droplets,
  Thermometer,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WeatherData {
  location: string
  name: string
  type: "current" | "forecast"
  current?: {
    temperature: number
    feels_like: number
    humidity: number
    description: string
    main: string
    icon: string
    wind_speed: number
    pressure: number
    visibility: number
  }
  city: string
  country: string
  cached_at: string
}

interface WeatherDisplayProps {
  weather: WeatherData[]
  compact?: boolean
  className?: string
}

const getWeatherIcon = (condition: string, iconCode?: string) => {
  const iconProps = { size: 20, className: "text-gray-50" }

  switch (condition.toLowerCase()) {
    case "clear":
      return <Sun {...iconProps} />
    case "clouds":
      return <Cloud {...iconProps} />
    case "rain":
    case "drizzle":
      return <CloudRain {...iconProps} />
    case "thunderstorm":
      return <Zap {...iconProps} />
    case "snow":
      return <Snowflake {...iconProps} />
    case "mist":
    case "fog":
    case "haze":
      return <Cloud {...iconProps} />
    default:
      return <Sun {...iconProps} />
  }
}

const getBackgroundGradient = (condition: string) => {
  switch (condition.toLowerCase()) {
    case "clear":
      return "from-orange-400 to-yellow-500"
    case "clouds":
      return "from-gray-400 to-gray-500"
    case "rain":
    case "drizzle":
      return "from-blue-400 to-blue-600"
    case "thunderstorm":
      return "from-purple-500 to-indigo-600"
    case "snow":
      return "from-blue-200 to-blue-400"
    default:
      return "from-emerald-400 to-teal-500"
  }
}

const getTemperatureColor = (temp: number) => {
  if (temp >= 30) return "text-red-600"
  if (temp >= 25) return "text-orange-500"
  if (temp >= 20) return "text-yellow-600"
  if (temp >= 15) return "text-green-600"
  return "text-blue-600"
}

export function WeatherDisplay({
  weather,
  compact = false,
  className,
}: WeatherDisplayProps) {
  if (!weather || weather.length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-2 my-3", className)}>
        {weather.slice(0, 4).map(w => {
          if (!w.current) return null

          return (
            <div
              key={w.location}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-gray-50 text-sm",
                `bg-gradient-to-r ${getBackgroundGradient(w.current.main)}`
              )}
            >
              {getWeatherIcon(w.current.main, w.current.icon)}
              <span className="font-medium">{w.name}</span>
              <span
                className={`${getTemperatureColor(
                  w.current.temperature
                )} font-bold`}
              >
                {w.current.temperature}°C
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 my-4", className)}
    >
      {weather.map(w => {
        if (!w.current) return null

        const { current } = w

        return (
          <div
            key={w.location}
            className={cn(
              "relative overflow-hidden rounded-xl p-4 text-gray-50",
              `bg-gradient-to-br ${getBackgroundGradient(current.main)}`
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="opacity-80" />
                <h3 className="font-semibold">{w.name}</h3>
              </div>
              {getWeatherIcon(current.main, current.icon)}
            </div>

            {/* Main Temperature */}
            <div className="mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {current.temperature}°
                </span>
                <span className="text-lg opacity-80">C</span>
              </div>
              <p className="text-sm opacity-90 capitalize">
                {current.description}
              </p>
              <p className="text-xs opacity-75">
                Feels like {current.feels_like}°C
              </p>
            </div>

            {/* Weather Details */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1 opacity-80">
                <Droplets size={14} />
                <span>{current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1 opacity-80">
                <Wind size={14} />
                <span>{current.wind_speed} m/s</span>
              </div>
              <div className="flex items-center gap-1 opacity-80">
                <Eye size={14} />
                <span>{(current.visibility / 1000).toFixed(1)} km</span>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gray-50/10 -translate-y-10 translate-x-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-gray-50/5 translate-y-8 -translate-x-8"></div>
          </div>
        )
      })}
    </div>
  )
}

export function WeatherAlert({ weather }: { weather: WeatherData[] }) {
  const alerts = weather.filter(w => {
    if (!w.current) return false
    const { current } = w

    // Check for weather alerts
    return (
      current.main === "Thunderstorm" ||
      current.temperature >= 35 ||
      current.wind_speed > 10
    )
  })

  if (alerts.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-gray-50 text-xs font-bold">!</span>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-amber-800 mb-1">
            Weather Advisory
          </h4>
          <div className="text-sm text-amber-700 space-y-1">
            {alerts.map(w => {
              const messages = []
              if (w.current?.main === "Thunderstorm") {
                messages.push(
                  `⚡ Thunderstorm alert in ${w.name} - consider indoor activities`
                )
              }
              if (w.current && w.current.temperature >= 35) {
                messages.push(
                  `🌡️ High temperature in ${w.name} (${w.current.temperature}°C) - stay hydrated`
                )
              }
              if (w.current && w.current.wind_speed > 10) {
                messages.push(
                  `💨 Strong winds in ${w.name} (${w.current.wind_speed} m/s)`
                )
              }
              return messages.map((msg, i) => (
                <p key={`${w.location}-${i}`}>{msg}</p>
              ))
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
