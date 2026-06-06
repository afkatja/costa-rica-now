"use client"

import React from "react"
import MapTooltipContent from "./MapTooltipContent"
import { useSeaPage } from "../hooks/useWeatherData"
import { Waves, Droplets } from "lucide-react"

/** A coastal location with optional coordinates */
type BeachLocation = {
  id: string
  name?: string
  lat?: number
  lon?: number
  region?: string
}

/** Converts a bearing in degrees to a cardinal compass direction */
function getWaveDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

/** Formats an ISO timestamp to a localized time string (h:MM AM/PM) */
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/** Map info window showing tides, waves, and surf conditions for a beach */
const TidesInfoWindow = ({ beach }: { beach: BeachLocation }) => {
  const { tidesData, loading, error } = useSeaPage()

  // Find the specific beach data from the provider
  const beachData = tidesData.find(tide => tide.location === beach.id)

  if (loading) {
    return (
      <MapTooltipContent
        data={{
          icon: "",
          description: "Loading tides and waves...",
        }}
      >
        <div className="p-4 space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </MapTooltipContent>
    )
  }

  if (error || !beachData) {
    return (
      <MapTooltipContent
        data={{
          icon: "",
          description: "Tides and waves",
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Droplets className="h-4 w-4" />
            <span>
              {error
                ? "Unable to load marine data. Please try again later."
                : "No marine data available for this location."}
            </span>
          </div>
        </div>
      </MapTooltipContent>
    )
  }

  const waveDir =
    beachData.waveDirectionCardinal ||
    getWaveDirection(beachData.waveDirection || 0)

  const nextForecast = beachData.waveForecast?.slice(1, 7) || []

  return (
    <MapTooltipContent
      data={{
        icon: "https://openweathermap.org/img/wn/03d@2x.png", // Scattered clouds icon for marine conditions
        description: `Region: ${beachData.region}`,
      }}
    >
      <div className="p-2 max-w-xs">
        {beachData.waveHeight && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Waves className="h-8 w-8 text-blue-500" />
              <span className="font-semibold">Waves</span>
            </div>
            <p className="text-sm">
              <strong>{beachData.waveHeight.toFixed(1)}m</strong> @{" "}
              {beachData.waveDirection}° {waveDir}
            </p>
            {nextForecast.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Next 6h:{" "}
                {nextForecast.map(f => `${f.height.toFixed(1)}m`).join(" → ")}
              </p>
            )}
            <p className="text-xs text-gray-600">
              24h avg: {beachData.waveAverage24h}m | max: {beachData.waveMax24h}
              m
            </p>
          </div>
        )}

        <>
          <div className="mb-3 pt-2 border-t">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="h-6 w-6 text-cyan-500" />
              <span className="font-semibold">Tides</span>
            </div>
            {beachData.nextHigh && (
              <p className="text-sm">
                High: <strong>{formatTime(beachData.nextHigh.time)}</strong> (
                {beachData.nextHigh.height.toFixed(1)}m)
                {beachData.currentTide === "rising" && " ⬆️"}
              </p>
            )}
            {beachData.nextLow && (
              <p className="text-sm">
                Low: <strong>{formatTime(beachData.nextLow.time)}</strong> (
                {beachData.nextLow.height.toFixed(1)}m)
                {beachData.currentTide === "falling" && " ⬇️"}
              </p>
            )}
            {beachData.currentTide && (
              <p className="text-xs text-gray-600 mt-1">
                Tide is currently {beachData.currentTide}
              </p>
            )}
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm">
              <span className="font-semibold">Conditions:</span>{" "}
              <span
                className={`capitalize ${
                  beachData.surfConditions === "excellent"
                    ? "text-green-600"
                    : beachData.surfConditions === "good"
                      ? "text-blue-600"
                      : beachData.surfConditions === "fair"
                        ? "text-yellow-600"
                        : "text-red-600"
                }`}
              >
                {beachData.surfConditions}
              </span>
              {beachData.surfConditions === "excellent" && " for surfing"}
            </p>
          </div>
        </>
      </div>
    </MapTooltipContent>
  )
}

export default TidesInfoWindow
