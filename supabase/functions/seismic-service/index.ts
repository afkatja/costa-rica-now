import { corsHeaders } from "../_shared/cors.ts"
import cheerio from "https://esm.sh/cheerio@1.0.0-rc.12"

const normalizeOvsicori = (quake: any) => ({
  id: `ovsicori-${quake["Fecha y Hora Local"].replace(
    /\D/g,
    ""
  )}-${quake.lat.toFixed(3)}-${quake.lon.toFixed(3)}`,
  source: "ovsicori",
  magnitude: parseFloat(quake.Magnitud),
  location: quake.Ubicacion,
  lat: quake.lat,
  lon: quake.lon,
  depth: quake["Prof. km"] ? parseFloat(quake["Prof. km"]) : null,
  time: new Date(`${quake["Fecha y Hora Local"]} UTC-6`).getTime(), // Costa Rica local time → timestamp
  felt: null, // OVSICORI doesn’t provide direct “felt” count
  intensity: null, // no direct intensity
  tsunami: false, // not available
  status: quake.Autor || "unknown",
  url: quake.url,
})

// Costa Rica bounding box coordinates
const COSTA_RICA_BOUNDS = {
  minLatitude: 8.0,
  maxLatitude: 11.5,
  minLongitude: -86.0,
  maxLongitude: -82.5,
}

// Unified event structure
interface SeismicEvent {
  id: string
  source: "usgs" | "ovsicori" | "manual"
  magnitude: number
  location: string
  lat: number
  lon: number
  depth: number
  time: number // Unix timestamp in milliseconds
  felt?: number
  intensity?: number
  tsunami: boolean
  url?: string
  status?: string
}

interface FetchParams {
  startDate: string // ISO format: YYYY-MM-DD
  endDate: string
  minMagnitude?: number
  maxMagnitude?: number
}

// Fetch USGS data
async function fetchUSGSData(params: FetchParams): Promise<SeismicEvent[]> {
  const { startDate, endDate, minMagnitude = 2.5, maxMagnitude } = params

  const queryParams = new URLSearchParams({
    format: "geojson",
    starttime: startDate,
    endtime: endDate,
    minlatitude: COSTA_RICA_BOUNDS.minLatitude.toString(),
    maxlatitude: COSTA_RICA_BOUNDS.maxLatitude.toString(),
    minlongitude: COSTA_RICA_BOUNDS.minLongitude.toString(),
    maxlongitude: COSTA_RICA_BOUNDS.maxLongitude.toString(),
    minmagnitude: minMagnitude.toString(),
  })

  if (maxMagnitude !== undefined) {
    queryParams.append("maxmagnitude", maxMagnitude.toString())
  }

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?${queryParams.toString()}`

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Supabase-Edge-Function/1.0",
    },
  })

  if (!response.ok) {
    throw new Error(`USGS API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Transform to unified format
  return data.features.map((feature: any) => ({
    id: `usgs-${feature.id}`,
    source: "usgs" as const,
    magnitude: feature.properties.mag,
    location: feature.properties.place,
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
    depth: feature.geometry.coordinates[2],
    time: feature.properties.time,
    felt: feature.properties.felt,
    intensity: feature.properties.cdi,
    tsunami: feature.properties.tsunami === 1,
    url: feature.properties.url,
    status: feature.properties.status,
  }))
}

// Fetch OVSICORI data
async function fetchOVSICORIData(params: FetchParams): Promise<SeismicEvent[]> {
  const { startDate } = params

  // Parse year and month from startDate
  const date = new Date(startDate)
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // JavaScript months are 0-indexed

  const url = `https://www.ovsicori.una.ac.cr/sistemas/ssentido/Automapames_fix.php?anno=${year}&mes=${month}`

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Supabase-Edge-Function/1.0",
      },
    })

    if (!response.ok) {
      console.warn(`OVSICORI fetch warning: ${response.status}`)
      return []
    }

    const html = await response.text()
    const regex =
      /L\.marker\(\[([\d\.-]+),([\d\.-]+)\][\s\S]*?bindPopup\('([\s\S]*?)',/g

    const earthquakes = []
    let match

    while ((match = regex.exec(html)) !== null) {
      const [_, lat, lon, popupHtml] = match

      // Optional: parse the popupHtml with cheerio for easy extraction
      const $ = cheerio.load(popupHtml)
      const data = {}
      $("tr").each((i, el) => {
        const tds = $(el).find("td")
        const key = $(tds[0])
          .text()
          .trim()
          .replace(/[:\[\]]/g, "")
        const value = $(tds[1]).text().trim()
        data[key] = value
      })

      earthquakes.push({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        url,
        ...data,
      })
    }

    return earthquakes.map(normalizeOvsicori)
  } catch (error) {
    console.error("OVSICORI fetch error:", error)
    return []
  }
}

// Deduplicate events based on proximity, time, and magnitude
function deduplicateEvents(events: SeismicEvent[]): SeismicEvent[] {
  const deduplicated: SeismicEvent[] = []

  for (const event of events) {
    const isDuplicate = deduplicated.some(existing => {
      // Consider it a duplicate if:
      // - Within 5 minutes
      // - Within ~50km (0.5 degrees)
      // - Magnitude difference < 0.3
      const timeDiff = Math.abs(event.time - existing.time)
      const latDiff = Math.abs(event.latitude - existing.latitude)
      const lonDiff = Math.abs(event.longitude - existing.longitude)
      const magDiff = Math.abs(event.magnitude - existing.magnitude)

      return (
        timeDiff < 300000 && // 5 minutes in milliseconds
        latDiff < 0.5 &&
        lonDiff < 0.5 &&
        magDiff < 0.3
      )
    })

    if (!isDuplicate) {
      deduplicated.push(event)
    } else {
      // Prefer OVSICORI over USGS for duplicates (local source is more accurate)
      const existingIndex = deduplicated.findIndex(existing => {
        const timeDiff = Math.abs(event.time - existing.time)
        const latDiff = Math.abs(event.latitude - existing.latitude)
        const lonDiff = Math.abs(event.longitude - existing.longitude)
        const magDiff = Math.abs(event.magnitude - existing.magnitude)

        return (
          timeDiff < 300000 && latDiff < 0.5 && lonDiff < 0.5 && magDiff < 0.3
        )
      })

      if (
        existingIndex !== -1 &&
        event.source === "ovsicori" &&
        deduplicated[existingIndex].source === "usgs"
      ) {
        deduplicated[existingIndex] = event // Replace USGS with OVSICORI
      }
    }
  }

  return deduplicated
}

// Sort events by time (newest first)
function sortEvents(events: SeismicEvent[]): SeismicEvent[] {
  return events.sort((a, b) => b.time - a.time)
}

// Main handler
Deno.serve(async req => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { type, ...params } = body

    if (type !== "earthquake") {
      return new Response(
        JSON.stringify({
          error: 'Invalid type. Currently only "earthquake" is supported',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Fetch from all available sources in parallel
    const [usgsEvents, ovsicoriEvents] = await Promise.allSettled([
      fetchUSGSData(params),
      fetchOVSICORIData(params),
    ])

    const allEvents: SeismicEvent[] = []

    // Collect USGS events
    if (usgsEvents.status === "fulfilled") {
      allEvents.push(...usgsEvents.value)
    } else {
      console.error("USGS fetch failed:", usgsEvents.reason)
    }

    // Collect OVSICORI events
    if (ovsicoriEvents.status === "fulfilled") {
      allEvents.push(...ovsicoriEvents.value)
    } else {
      console.error("OVSICORI fetch failed:", ovsicoriEvents.reason)
    }

    // Filter events by requested date range (if provided) to avoid returning
    // a full month of OVSICORI data when callers requested a narrower window.
    const filterEventsByDateRange = (
      events: SeismicEvent[],
      start?: string,
      end?: string
    ) => {
      if (!start && !end) return events

      const startTs = start
        ? new Date(start).getTime()
        : new Date().getTime() - 24 * 60 * 60 * 1000
      const endTs = end ? new Date(end).getTime() : new Date().getTime()

      return events.filter(e => e.time >= startTs && e.time <= endTs)
    }

    const filteredEvents = filterEventsByDateRange(
      allEvents,
      params.startDate as string,
      params.endDate as string
    )

    // Deduplicate and sort
    const uniqueEvents = deduplicateEvents(filteredEvents)
    const sortedEvents = sortEvents(uniqueEvents)

    // Calculate statistics
    const stats = {
      total: sortedEvents.length,
      sources: {
        usgs: sortedEvents.filter(e => e.source === "usgs").length,
        ovsicori: sortedEvents.filter(e => e.source === "ovsicori").length,
        manual: sortedEvents.filter(e => e.source === "manual").length,
      },
      magnitudeRange:
        sortedEvents.length > 0
          ? {
              min: Math.min(...sortedEvents.map(e => e.magnitude)),
              max: Math.max(...sortedEvents.map(e => e.magnitude)),
              average:
                sortedEvents.reduce((sum, e) => sum + e.magnitude, 0) /
                sortedEvents.length,
            }
          : null,
      feltCount: sortedEvents.filter(e => e.felt && e.felt > 0).length,
    }

    return new Response(
      JSON.stringify({
        success: true,
        allEvents,
        events: sortedEvents,
        metadata: {
          type,
          requestedAt: new Date().toISOString(),
          region: "Costa Rica",
          dateRange: {
            start: params.startDate,
            end: params.endDate,
          },
          stats,
          sources: {
            usgs: usgsEvents.status === "fulfilled" ? "success" : "failed",
            ovsicori:
              ovsicoriEvents.status === "fulfilled" ? "partial" : "failed", // partial until parser is implemented
          },
          notes: [
            "USGS includes earthquakes M2.5+ in Costa Rica region",
            "OVSICORI integration pending - needs HTML parsing implementation",
            "Duplicates are automatically removed based on time/location proximity",
          ],
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Service error:", error)

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
