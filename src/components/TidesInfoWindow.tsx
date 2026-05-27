"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import MapTooltipContent from "./MapTooltipContent"
import { useSeaPage } from "../hooks/useWeatherData"

type BeachLocation = {
  id: string
  name?: string
  lat?: number
  lon?: number
  region?: string
}

type TideExtreme = {
  time: string
  height: number
  type: "high" | "low"
}

type BeachConditions = {
  destinationId: string
  destination: string
  lat: number
  lon: number
  region: string
  tides: {
    extremes: TideExtreme[]
    nextHigh: TideExtreme | null
    nextLow: TideExtreme | null
    currentTide: "rising" | "falling" | null
  }
  waves: {
    current: { height: number; direction: number; time: string }
    forecast: Array<{ time: string; height: number; direction: number }>
    average24h: number
    max24h: number
  }
  surfConditions: "excellent" | "good" | "fair" | "poor"
  lastUpdated: string
}

// Get wave direction as compass bearing
function getWaveDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

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
        <div className="p-2">Loading...</div>
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
        <div className="p-2 text-sm text-red-600">
          {error ? `Error: ${error}` : "No data available"}
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
        icon: "https://static.vecteezy.com/system/resources/previews/059/837/606/non_2x/ocean-waves-icon-water-symbol-sea-waves-wave-water-ripple-line-vector.jpg",
        description: `Region: ${beachData.region}`,
      }}
    >
      <div className="p-2 max-w-xs">
        {beachData.waveHeight && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Image
                src="https://static.vecteezy.com/system/resources/previews/059/838/535/non_2x/ocean-waves-icon-water-symbol-graphic-sea-waves-wave-water-ripple-flow-water-splash-shape-vector.jpg"
                alt="Waves"
                width={40}
                height={40}
              />
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

        {beachData.nextHigh && beachData.nextLow && (
          <>
            <div className="mb-3 pt-2 border-t">
              <div className="flex items-center gap-2 mb-1">
                <Image
                  src="https://static.vecteezy.com/system/resources/previews/036/666/679/non_2x/wave-free-vector.png"
                  alt="Tides"
                  width={30}
                  height={30}
                />
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
        )}
      </div>
    </MapTooltipContent>
  )
}

export default TidesInfoWindow
