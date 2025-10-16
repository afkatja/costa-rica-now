"use client"
import React, { useEffect, useState } from "react"
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps"
import costaRicaDestinations from "../lib/shared/destinations"
import Image from "next/image"
import { Droplets, Eye, Thermometer, Wind } from "lucide-react"
import { supabase } from "../utils/supabase/client"

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

interface WeatherData {
  location: string
  name: string
  type: string
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
  city: string
  country: string
  cached_at: string
}

const GoogleMapsWrapper = () => {
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>(
    {}
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [infoVisible, setInfoVisible] = useState<string | null>(null)

  const destinations = Object.entries(costaRicaDestinations)

  // Create marker refs for each destination
  const markerRefs = destinations.map(() => useAdvancedMarkerRef())

  const getWeatherIcon = (iconCode: string) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
  }

  const formatWeatherDescription = (description: string) => {
    return description.charAt(0).toUpperCase() + description.slice(1)
  }

  const fetchWeatherData = async () => {
    try {
      setLoading(true)
      setError(null)

      const locationKeys = destinations.map(([key]) => key)

      const { data, error } = await supabase.functions.invoke(
        "weather-service",
        {
          body: {
            locations: locationKeys,
            type: "current",
          },
        }
      )

      if (error) throw new Error(`Weather service error: ${error}`)

      const result = await data?.data

      if (!result) throw new Error("No response from weather API")

      if (result.weather) {
        const weatherMap: Record<string, WeatherData> = {}
        result.weather.forEach((weather: WeatherData) => {
          weatherMap[weather.location] = weather
        })
        setWeatherData(weatherMap)
      }
    } catch (err) {
      console.error("Error fetching weather data:", err)
      setError(
        err instanceof Error ? err.message : "Failed to fetch weather data"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeatherData()
  }, [])

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId={process.env.NEXT_PUBLIC_GMAPS_MAP_ID as string}
        style={{ width: "100%", height: "100%" }}
        defaultCenter={{ lat: 9.9092, lng: -83.7417 }}
        defaultZoom={8}
      >
        {destinations.map(([key, destination], index) => {
          const weather = weatherData[key]
          const [markerRef, marker] = markerRefs[index]

          return (
            <div key={`map-marker-${key}`}>
              <AdvancedMarker
                position={{ lat: destination.lat, lng: destination.lon }}
                title={destination.name}
                onClick={() => setInfoVisible(key)}
                ref={markerRef}
              >
                <Image
                  alt="map marker"
                  src="/marker.svg"
                  height={20}
                  width={26}
                />
              </AdvancedMarker>
              {key === infoVisible && (
                <InfoWindow
                  key={`map-tooltip-${key}`}
                  anchor={marker}
                  onClose={() => setInfoVisible(null)}
                  headerContent={
                    <h3 className="font-semibold text-lg mb-2 ml-2">
                      {destination.name}
                    </h3>
                  }
                >
                  <div className="min-w-[200px]">
                    {loading ? (
                      <div className="text-sm text-gray-500">
                        Loading weather...
                      </div>
                    ) : error ? (
                      <div className="text-sm text-red-500">
                        Weather data unavailable
                      </div>
                    ) : weather ? (
                      <div className="space-y-2 p-2">
                        <div className="flex items-center gap-2">
                          {weather.current.icon && (
                            <Image
                              src={getWeatherIcon(weather.current.icon)}
                              alt="Weather icon"
                              width={64}
                              height={64}
                              className="object-cover"
                            />
                          )}
                          <div>
                            <div className="text-2xl font-bold">
                              {weather.current.temperature}°C
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatWeatherDescription(
                                weather.current.description
                              )}
                            </div>
                          </div>
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
                            <span>
                              {Math.round(weather.current.visibility / 1000)} km
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No weather data available
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </div>
          )
        })}
      </Map>
    </APIProvider>
  )
}

export default GoogleMapsWrapper
