import { NextRequest, NextResponse } from "next/server"
import { coastalDestinations } from "@/lib/shared/destinations"

export const dynamic = "force-dynamic"

// Types
type TideExtreme = {
  time: string
  height: number
  type: "high" | "low"
}

import { BeachConditions } from "@/types/beach"

// Fetch tides from Marea API
async function fetchTides(lat: number, lon: number) {
  try {
    const apiKey = process.env.MAREA_API_KEY

    const response = await fetch(
      `https://api.marea.ooo/v2/tides?latitude=${lat}&longitude=${lon}`,
      {
        headers: {
          "x-marea-api-token": apiKey!,
        },
      },
    )
    if (!response.ok) {
      // Handle quota exceeded - stop trying
      if (response.status === 403) {
        console.log("Marea API quota exceeded - skipping tide data")
        return "QUOTA_EXCEEDED"
      }

      console.error(
        `Marea API error: ${response.status} ${response.statusText}`,
      )
      return null
    }

    const data = await response.json()
    console.log("Marea API response:", data)
    return data
  } catch (error) {
    console.error("Error fetching tides:", error)
    return null
  }
}

// Fetch detailed marine data from Open-Meteo Marine API
async function fetchMarineData(lat: number, lon: number) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current:
        "wave_height,wave_direction,wave_period,wave_peak_period,wind_wave_height,wind_wave_direction,wind_wave_period,wind_wave_peak_period,swell_wave_height,swell_wave_direction,swell_wave_period,swell_wave_peak_period,sea_level_height_msl,ocean_current_velocity,ocean_current_direction",
      hourly: "wave_height,wave_direction,wave_period",
      forecast_days: "1",
    })

    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${params}`,
    )

    if (!response.ok) {
      console.error(`Open-Meteo Marine API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching marine data:", error)
    return null
  }
}

// Process tide data to find next high/low and current trend
function processTideData(tideData: any) {
  // Handle quota exceeded case
  if (tideData === "QUOTA_EXCEEDED") {
    console.log("Skipping tide processing due to quota exceeded")
    return {
      extremes: [],
      nextHigh: null,
      nextLow: null,
      currentTide: null,
    }
  }

  if (!tideData?.extremes) {
    return {
      extremes: [],
      nextHigh: null,
      nextLow: null,
      currentTide: null,
    }
  }

  const now = new Date()
  const extremes: TideExtreme[] = tideData.extremes.map((e: any) => ({
    time: e.datetime,
    height: e.height,
    type: e.state === "HIGH TIDE" ? "high" : "low",
  }))

  // Find next high and low
  const futureExtremes = extremes.filter(e => new Date(e.time) > now)
  const nextHigh = futureExtremes.find(e => e.type === "high") || null
  const nextLow = futureExtremes.find(e => e.type === "low") || null

  // Determine current tide state from heights data
  let currentTide: "rising" | "falling" | null = null
  if (tideData.heights && tideData.heights.length > 0) {
    const currentHeight = tideData.heights[0]
    if (currentHeight.state === "RISING") {
      currentTide = "rising"
    } else if (currentHeight.state === "FALLING") {
      currentTide = "falling"
    }
  }

  return {
    extremes: extremes.slice(0, 8), // Return next 8 tide changes
    nextHigh,
    nextLow,
    currentTide,
  }
}

// Process marine data from Open-Meteo
function processWaveData(marineData: any) {
  if (!marineData?.hourly) {
    return {
      current: { height: 0, direction: 0, time: new Date().toISOString() },
      forecast: [],
      average24h: 0,
      max24h: 0,
    }
  }

  const { time, wave_height, wave_direction } = marineData.hourly

  // Create forecast array
  const forecast = time.slice(0, 48).map((t: string, i: number) => ({
    time: t,
    height: wave_height[i] || 0,
    direction: wave_direction[i] || 0,
    directionCardinal: degreesToCardinal(wave_direction[i] || 0),
  }))

  // Current conditions (first data point)
  const current = {
    height: wave_height[0] || 0,
    direction: wave_direction[0] || 0,
    directionCardinal: degreesToCardinal(wave_direction[0] || 0),
    time: time[0],
  }

  // Calculate 24h stats
  const next24hHeights = wave_height
    .slice(0, 24)
    .filter((h: number) => h != null)
  const average24h =
    next24hHeights.length > 0
      ? next24hHeights.reduce((a: number, b: number) => a + b, 0) /
        next24hHeights.length
      : 0
  const max24h = next24hHeights.length > 0 ? Math.max(...next24hHeights) : 0

  return {
    current,
    forecast: forecast.slice(0, 24), // Return 24h forecast
    average24h: Math.round(average24h * 10) / 10,
    max24h: Math.round(max24h * 10) / 10,
  }
}

// Convert degrees to cardinal direction
function degreesToCardinal(degrees: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ]
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

// Determine surf conditions based on wave height
function getSurfConditions(
  waveHeight: number,
): "excellent" | "good" | "fair" | "poor" {
  if (waveHeight >= 1.0 && waveHeight <= 2.5) return "excellent"
  if (waveHeight >= 0.7 && waveHeight < 1.0) return "good"
  if (waveHeight >= 2.5 && waveHeight <= 3.5) return "good"
  if (waveHeight >= 0.4 && waveHeight < 0.7) return "fair"
  if (waveHeight > 3.5 && waveHeight <= 5.0) return "fair"
  return "poor"
}

export async function GET(request: NextRequest) {
  try {
    console.log("Request URL:", request.url)
    console.log("Request method:", request.method)
    const { searchParams } = new URL(request.url)
    const destinationId = searchParams.get("destination")

    // If specific destination requested
    if (destinationId) {
      const destination = coastalDestinations.find(d => d.id === destinationId)
      if (!destination) {
        return NextResponse.json(
          { error: "Destination not found" },
          { status: 404 },
        )
      }

      const [tideData, marineData] = await Promise.all([
        fetchTides(destination.lat, destination.lon),
        fetchMarineData(destination.lat, destination.lon),
      ])

      const tides = processTideData(tideData)

      const waves = processWaveData(marineData)

      const conditions: BeachConditions = {
        destinationId: destination.id,
        destination: destination.name,
        name: destination.name,
        lat: destination.lat,
        lon: destination.lon,
        region: destination.region || "",
        tides,
        waves,
        surfConditions: getSurfConditions(waves.current.height),
        lastUpdated: new Date().toISOString(),
      }

      return NextResponse.json(conditions)
    }
    // Process destinations in batches to avoid overwhelming external APIs
    const BATCH_SIZE = 5
    const allConditions: (BeachConditions | null)[] = []

    for (let i = 0; i < coastalDestinations.length; i += BATCH_SIZE) {
      const batch = coastalDestinations.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async destination => {
          try {
            const [tideData, marineData] = await Promise.all([
              fetchTides(destination.lat, destination.lon),
              fetchMarineData(destination.lat, destination.lon),
            ])

            const tides = processTideData(tideData)
            const waves = processWaveData(marineData)

            const conditions: BeachConditions = {
              destinationId: destination.id,
              destination: destination.name,
              name: destination.name,
              lat: destination.lat,
              lon: destination.lon,
              region: destination.region || "",
              tides,
              waves,
              surfConditions: getSurfConditions(waves.current.height),
              lastUpdated: new Date().toISOString(),
            }

            return conditions
          } catch (error) {
            console.error(`Error fetching data for ${destination.name}:`, error)
            return null
          }
        }),
      )
      allConditions.push(...batchResults)
    }

    // Filter out any failed requests
    const validConditions = allConditions.filter(Boolean)

    return NextResponse.json({
      destinations: validConditions,
      count: validConditions.length,
    })
  } catch (error: any) {
    console.error("Error in beach conditions API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    )
  }
}

// Optional: Add caching middleware or use Next.js route segment config
export const revalidate = 3600 // Revalidate every hour (tides are predictable)
