import { NextRequest, NextResponse } from "next/server"
import { coastalDestinations } from "@/lib/shared/destinations"

export const dynamic = "force-dynamic"

// Types
type TideExtreme = {
  time: string
  height: number
  type: "high" | "low"
}

type BeachConditions = {
  destinationId: string
  destination: string
  name: string
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
    current: {
      height: number
      direction: number
      time: string
    }
    forecast: Array<{
      time: string
      height: number
      direction: number
    }>
    average24h: number
    max24h: number
  }
  surfConditions: "excellent" | "good" | "fair" | "poor"
  lastUpdated: string
}

// Fetch tides from Marea API
async function fetchTides(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://api.marea.ooo/v2/tides?latitude=${lat}&longitude=${lon}`,
      {
        headers: {
          "x-marea-api-token": process.env.MAREA_API_KEY!,
        },
      },
    )

    if (!response.ok) {
      console.error(`Marea API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching tides:", error)
    return null
  }
}

// Fetch waves from Open-Meteo Marine API
async function fetchWaves(lat: number, lon: number) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: "wave_height,wave_direction,wave_period",
      forecast_days: "2",
    })

    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${params}`,
    )

    if (!response.ok) {
      console.error(`Open-Meteo API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching waves:", error)
    return null
  }
}

// Process tide data to find next high/low and current trend
function processTideData(tideData: any) {
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
    type: e.type === "HIGH" ? "high" : "low",
  }))

  // Find next high and low
  const futureExtremes = extremes.filter(e => new Date(e.time) > now)
  const nextHigh = futureExtremes.find(e => e.type === "high") || null
  const nextLow = futureExtremes.find(e => e.type === "low") || null

  // Determine if tide is rising or falling
  let currentTide: "rising" | "falling" | null = null
  if (futureExtremes.length > 0) {
    currentTide = futureExtremes[0].type === "high" ? "rising" : "falling"
  }

  return {
    extremes: extremes.slice(0, 8), // Return next 8 tide changes
    nextHigh,
    nextLow,
    currentTide,
  }
}

// Process wave data
function processWaveData(waveData: any) {
  if (!waveData?.hourly) {
    return {
      current: { height: 0, direction: 0, time: new Date().toISOString() },
      forecast: [],
      average24h: 0,
      max24h: 0,
    }
  }

  const { time, wave_height, wave_direction } = waveData.hourly

  // Create forecast array
  const forecast = time.slice(0, 48).map((t: string, i: number) => ({
    time: t,
    height: wave_height[i] || 0,
    direction: wave_direction[i] || 0,
  }))

  // Current conditions (first data point)
  const current = {
    height: wave_height[0] || 0,
    direction: wave_direction[0] || 0,
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

      const [tideData, waveData] = await Promise.all([
        fetchTides(destination.lat, destination.lon),
        fetchWaves(destination.lat, destination.lon),
      ])

      const tides = processTideData(tideData)

      const waves = processWaveData(waveData)

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
            const [tideData, waveData] = await Promise.all([
              fetchTides(destination.lat, destination.lon),
              fetchWaves(destination.lat, destination.lon),
            ])

            const tides = processTideData(tideData)
            const waves = processWaveData(waveData)

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
