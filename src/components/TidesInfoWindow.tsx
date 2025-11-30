"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import MapTooltipContent from "./MapTooltipContent"

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
  const [data, setData] = useState<BeachConditions | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchForBeach() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/beaches?destination=${encodeURIComponent(beach.id)}`
        )
        if (!res.ok) {
          throw new Error(`API error ${res.status}`)
        }
        const json = await res.json()
        if (!mounted) return
        setData(json)
      } catch (err: any) {
        if (!mounted) return
        console.error("Error loading beach conditions:", err)
        setError(err.message || "Failed to load")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchForBeach()
    return () => {
      mounted = false
    }
  }, [beach.id])

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

  if (error || !data) {
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

  const waveDir = getWaveDirection(data.waves.current.direction)
  const nextForecast = data.waves.forecast.slice(1, 4)

  return (
    <MapTooltipContent
      data={{
        icon: "https://static.vecteezy.com/system/resources/previews/059/837/606/non_2x/ocean-waves-icon-water-symbol-sea-waves-wave-water-ripple-line-vector.jpg",
        description: `Region: ${data.region}`,
      }}
    >
      <div className="p-2 max-w-xs">
        {data.waves && (
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
              <strong>{data.waves.current.height.toFixed(1)}m</strong> @{" "}
              {data.waves.current.direction}° {waveDir}
            </p>
            {nextForecast.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Next 6h:{" "}
                {nextForecast.map(f => `${f.height.toFixed(1)}m`).join(" → ")}
              </p>
            )}
            <p className="text-xs text-gray-600">
              24h avg: {data.waves.average24h}m | max: {data.waves.max24h}m
            </p>
          </div>
        )}

        {!!data.tides.extremes.length && (
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
              {data.tides.nextHigh && (
                <p className="text-sm">
                  High: <strong>{formatTime(data.tides.nextHigh.time)}</strong>{" "}
                  ({data.tides.nextHigh.height.toFixed(1)}m)
                  {data.tides.currentTide === "rising" && " ⬆️"}
                </p>
              )}
              {data.tides.nextLow && (
                <p className="text-sm">
                  Low: <strong>{formatTime(data.tides.nextLow.time)}</strong> (
                  {data.tides.nextLow.height.toFixed(1)}m)
                  {data.tides.currentTide === "falling" && " ⬇️"}
                </p>
              )}
              {data.tides.currentTide && (
                <p className="text-xs text-gray-600 mt-1">
                  Tide is currently {data.tides.currentTide}
                </p>
              )}
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm">
                <span className="font-semibold">Conditions:</span>{" "}
                <span
                  className={`capitalize ${
                    data.surfConditions === "excellent"
                      ? "text-green-600"
                      : data.surfConditions === "good"
                      ? "text-blue-600"
                      : data.surfConditions === "fair"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {data.surfConditions}
                </span>
                {data.surfConditions === "excellent" && " for surfing"}
              </p>
            </div>
          </>
        )}
      </div>
    </MapTooltipContent>
  )
}

export default TidesInfoWindow
