import { COSTA_RICA_BOUNDS } from "../_shared/coords.ts"
import { corsHeaders } from "../_shared/cors.ts"
// import { load } from "https://esm.sh/cheerio@1.0.0-rc.12"

// Add Deno type for Edge Functions
declare const Deno: any

// Helper function to format datetime for Costa Rica locale
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("es-CR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Helper function to add formatted fields to SeismicEvent
function addFormattedFields(event: SeismicEvent): SeismicEvent {
  return {
    ...event,
    formattedTime: formatDateTime(event.time),
    formattedDateTime: formatDateTime(event.time),
  }
}

const normalizeOvsicori = (quake: any): SeismicEvent => ({
  id: `ovsicori-${quake["Fecha y Hora Local"].replace(
    /\D/g,
    ""
  )}-${quake.lat.toFixed(3)}-${quake.lon.toFixed(3)}`,
  source: "ovsicori" as const,
  magnitude: parseFloat(quake.Magnitud),
  location: quake.Ubicacion,
  lat: quake.lat,
  lon: quake.lon,
  depth: quake["Prof. km"] ? parseFloat(quake["Prof. km"]) : null,
  time: new Date(`${quake["Fecha y Hora Local"]} UTC-6`).getTime(), // Costa Rica local time → timestamp
  // felt: null, // OVSICORI doesn't provide direct "felt" count
  // intensity: null, // no direct intensity
  tsunami: false, // not available
  status: quake.Autor || "unknown",
  url: quake.url,
})

// Unified event structure
interface SeismicEvent {
  id: string
  source: "rsn" | "usgs" | "ovsicori" | "manual"
  magnitude: number
  location: string
  lat: number
  lon: number
  depth: number | null
  time: number // Unix timestamp in milliseconds
  felt?: number
  intensity?: number
  tsunami: boolean
  url?: string
  status?: string
  // Formatted date/time fields for client convenience
  formattedTime?: string
  formattedDateTime?: string
}

interface FetchParams {
  startDate: string // ISO format: YYYY-MM-DD
  endDate: string
  minMagnitude?: number
  maxMagnitude?: number
  source?: "usgs" | "ovsicori" | "rsn" | "manual"
  lat?: number
  lon?: number
  radiusKm?: number
  limit?: number
  offset?: number
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

  // Transform to unified format and add formatted fields
  return data.features.map((feature: any) =>
    addFormattedFields({
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
    })
  )
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

      // parse the popupHtml with simple regex for easy extraction
      const trMatches = popupHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
      const data: Record<string, string> = {}

      trMatches.forEach(trHtml => {
        const tdMatches = trHtml.match(/<td[^>]*>([^<]*)<\/td>/gi) || []
        if (tdMatches.length >= 2) {
          const keyMatch = tdMatches[0]?.match(/<td[^>]*>([^<]*)<\/td>/i)
          const valueMatch = tdMatches[1].match(/<td[^>]*>([^<]*)<\/td>/i)

          if (keyMatch && valueMatch) {
            const key = keyMatch[1].trim().replace(/[:\[\]]/g, "")
            const value = valueMatch[1].trim()
            data[key] = value
          }
        }
      })

      earthquakes.push({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        url,
        ...data,
      })
    }

    return earthquakes
      .map(normalizeOvsicori)
      .map(addFormattedFields)
      .filter(event => event.magnitude >= 2.5)
  } catch (error) {
    console.error("OVSICORI fetch error:", error)
    return []
  }
}

// Fetch RSN data with comprehensive debugging
async function fetchRSNData(params: FetchParams): Promise<SeismicEvent[]> {
  const { startDate, endDate, minMagnitude = 2.5, maxMagnitude } = params

  // Test with different date ranges to isolate the issue
  const testRanges = [
    { startDate: "2025-11-01", endDate: "2025-12-31", name: "last_month" },
    { startDate, endDate, name: "requested_range" },
  ]

  for (const range of testRanges) {
    console.log(
      `\n=== Testing RSN data for ${range.name}: ${range.startDate} to ${range.endDate} ===`
    )

    const queryParams = new URLSearchParams({
      starttime: range.startDate,
      endtime: range.endDate,
      minlatitude: COSTA_RICA_BOUNDS.minLatitude.toString(),
      maxlatitude: COSTA_RICA_BOUNDS.maxLatitude.toString(),
      minlongitude: COSTA_RICA_BOUNDS.minLongitude.toString(),
      maxlongitude: COSTA_RICA_BOUNDS.maxLongitude.toString(),
      minmagnitude: minMagnitude.toString(),
    })

    if (maxMagnitude !== undefined) {
      queryParams.append("maxmagnitude", maxMagnitude.toString())
    }

    const url = `https://www.isc.ac.uk/fdsnws/event/1/query?${queryParams.toString()}`

    try {
      // Try multiple request configurations
      const requestConfigs: Array<{
        name: string
        headers: Record<string, string>
        redirect: RequestRedirect
      }> = [
        {
          name: "Browser-like headers",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "no-cache",
          },
          redirect: "follow",
        },
        {
          name: "Minimal headers",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible)",
          },
          redirect: "follow",
        },
        {
          name: "Current Edge Function headers",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; SeismicService/1.0)",
            Accept: "application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "follow",
        },
      ]

      for (const config of requestConfigs) {
        console.log(`\n--- Testing with ${config.name} ---`)

        const response = await fetch(url, {
          method: "GET",
          headers: config.headers,
          redirect: config.redirect,
        })

        console.log(
          `Response status: ${response.status} ${response.statusText}`
        )
        console.log(`Response URL: ${response.url}`)
        console.log(`Redirected: ${response.redirected}`)
        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        )

        if (response.status === 200) {
          const xmlText = await response.text()
          console.log(`Response length: ${xmlText.length} characters`)
          console.log("Response preview:", xmlText.substring(0, 500))

          if (
            xmlText.length > 0 &&
            (xmlText.includes("<isc") || xmlText.includes("<?xml"))
          ) {
            console.log(`✅ SUCCESS: Got XML data with ${config.name}`)
            return await parseRSNXML(xmlText, range.startDate, range.endDate)
          } else {
            console.log(`⚠️  Response is not XML or is empty`)
          }
        } else if (response.status === 204) {
          console.log(`⚠️  204 No Content with ${config.name}`)
        } else {
          console.log(`❌ Error ${response.status} with ${config.name}`)
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`Error testing ${range.name}:`, error)
    }
  }

  console.log("❌ All RSN tests failed - returning empty array")
  return []
}

// Helper function to parse RSN XML
async function parseRSNXML(
  xmlText: string,
  startDate: string,
  endDate: string
): Promise<SeismicEvent[]> {
  console.log("Parsing RSN XML data...")

  // Simple regex-based XML parser for ISC format
  const eventMatches = xmlText.match(/<event[^>]*>([\s\S]*?)<\/event>/gi) || []
  console.log(`Found ${eventMatches.length} events`)

  const events = eventMatches.map((eventXml, index) => {
    // Extract event ID
    const idMatch = eventXml.match(/publicid="([^"]*)"/i)
    const id = idMatch ? idMatch[1] : `isc-${Date.now()}-${index}`

    // Extract preferred origin data
    const preferredOriginMatch = eventXml.match(
      /<origin[^>]*preferred="true"[^>]*>([\s\S]*?)<\/origin>/i
    )
    const originMatch =
      preferredOriginMatch ||
      eventXml.match(/<origin[^>]*>([\s\S]*?)<\/origin>/i)

    let timeStr = ""
    let lat = 0
    let lon = 0
    let depth = null

    if (originMatch) {
      const originXml = originMatch[1]

      // Extract time
      const timeMatch = originXml.match(
        /<time[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i
      )
      timeStr = timeMatch ? timeMatch[1].trim() : ""

      // Extract latitude
      const latMatch = originXml.match(
        /<latitude[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i
      )
      lat = latMatch ? parseFloat(latMatch[1].trim()) : 0

      // Extract longitude
      const lonMatch = originXml.match(
        /<longitude[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i
      )
      lon = lonMatch ? parseFloat(lonMatch[1].trim()) : 0

      // Extract depth
      const depthMatch = originXml.match(
        /<depth[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i
      )
      depth = depthMatch ? parseFloat(depthMatch[1].trim()) : null
    }

    const time = timeStr ? new Date(timeStr).getTime() : Date.now()

    // Extract preferred magnitude
    const preferredMagMatch = eventXml.match(
      /<magnitude[^>]*preferred="true"[^>]*>([\s\S]*?)<\/magnitude>/i
    )
    const magMatch =
      preferredMagMatch ||
      eventXml.match(/<magnitude[^>]*>([\s\S]*?)<\/magnitude>/i)

    let magnitude = 0
    if (magMatch) {
      const magValueMatch = magMatch[1].match(
        /<mag[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i
      )
      magnitude = magValueMatch ? parseFloat(magValueMatch[1].trim()) : 0
    }

    // Extract location description
    const descMatch = eventXml.match(
      /<description[^>]*>[\s]*<text[^>]*>([^<]*)<\/text>/i
    )
    const location = descMatch
      ? descMatch[1].trim()
      : `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`

    // Extract network information from creationInfo (author and agencyID)
    const networks = new Set()

    // Extract authors and agencyIDs from origin and magnitude creationInfo
    const creationInfoMatches =
      eventXml.match(/<creationInfo[^>]*>([\s\S]*?)<\/creationInfo>/gi) || []
    creationInfoMatches.forEach(creationInfo => {
      const authorMatch = creationInfo.match(/<author[^>]*>([^<]*)<\/author>/i)
      const agencyMatch = creationInfo.match(
        /<agencyID[^>]*>([^<]*)<\/agencyID>/i
      )

      if (authorMatch) networks.add(authorMatch[1].toLowerCase().trim())
      if (agencyMatch) networks.add(agencyMatch[1].toLowerCase().trim())
    })

    const networkStr = Array.from(networks).join(",")
    const isRsnRelated =
      networkStr.includes("rsn") ||
      networkStr.includes("ucr") ||
      networkStr.includes("tc") ||
      location.toLowerCase().includes("costa rica")

    return {
      id: `rsn-${id}`,
      source: "rsn" as const,
      magnitude,
      location,
      lat,
      lon,
      depth,
      time,
      felt: undefined,
      intensity: undefined,
      tsunami: false,
      url: `http://www.isc.ac.uk/iscbulletin/search/event/${id}`,
      status: "reviewed",
      isRsnRelated,
    }
  })

  console.log(`Parsed ${events.length} events, filtering for RSN-related...`)

  // Filter for RSN/UCR/TC related events and transform to unified format
  return events
    .filter((event: any) => event.isRsnRelated)
    .map((event: any) => {
      const { isRsnRelated, ...eventData } = event
      return addFormattedFields(eventData)
    })
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
      const latDiff = Math.abs(event.lat - existing.lat)
      const lonDiff = Math.abs(event.lon - existing.lon)
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
        const latDiff = Math.abs(event.lat - existing.lat)
        const lonDiff = Math.abs(event.lon - existing.lon)
        const magDiff = Math.abs(event.magnitude - existing.magnitude)

        return (
          timeDiff < 300000 && latDiff < 0.5 && lonDiff < 0.5 && magDiff < 0.3
        )
      })

      // Prefer RSN > OVSICORI > USGS for duplicates
      if (existingIndex !== -1) {
        const existing = deduplicated[existingIndex]
        // RSN takes priority over all
        if (
          event.source.toLowerCase() === "rsn" &&
          existing.source.toLowerCase() !== "rsn"
        ) {
          deduplicated[existingIndex] = event
        }
        // OVSICORI takes priority over USGS only
        else if (event.source === "ovsicori" && existing.source === "usgs") {
          deduplicated[existingIndex] = event
        }
      }
    }
  }

  return deduplicated
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Filter events by location radius
function filterEventsByLocation(
  events: SeismicEvent[],
  lat?: number,
  lon?: number,
  radiusKm?: number
): SeismicEvent[] {
  if (!lat || !lon || !radiusKm) return events

  return events.filter(
    event => calculateDistance(lat, lon, event.lat, event.lon) <= radiusKm
  )
}

// Sort events by time (newest first)
function sortEvents(events: SeismicEvent[]): SeismicEvent[] {
  return events.sort((a, b) => b.time - a.time)
}

// Main handler
Deno.serve(async (req: Request) => {
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

    // Adjust date range when filters are present
    let adjustedParams = { ...params }
    const hasFilters =
      params.source ||
      params.minMagnitude ||
      params.lat ||
      params.lon ||
      params.radiusKm

    if (hasFilters && params.startDate) {
      const startDate = new Date(params.startDate)
      // Go back one month to get more data for filtering
      startDate.setMonth(startDate.getMonth() - 1)
      adjustedParams.startDate = startDate.toISOString().split("T")[0] // YYYY-MM-DD format
    }

    // Fetch from all available sources in parallel
    const [usgsEvents, ovsicoriEvents, rsnEvents] = await Promise.allSettled([
      fetchUSGSData(hasFilters ? adjustedParams : params),
      fetchOVSICORIData(hasFilters ? adjustedParams : params),
      fetchRSNData(hasFilters ? adjustedParams : params),
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
    // Collect RSN events
    if (rsnEvents.status === "fulfilled") {
      allEvents.push(...rsnEvents.value)
    } else {
      console.error("RSN fetch failed:", rsnEvents.reason)
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
      hasFilters
        ? (adjustedParams.startDate as string)
        : (params.startDate as string),
      params.endDate as string
    )

    // Filter events by magnitude range
    const magnitudeFilteredEvents = filteredEvents.filter(event => {
      const meetsMin =
        params.minMagnitude !== undefined
          ? event.magnitude >= params.minMagnitude
          : true
      return meetsMin
    })

    // Apply location filtering if requested
    const locationFilteredEvents = filterEventsByLocation(
      magnitudeFilteredEvents,
      params.lat,
      params.lon,
      params.radiusKm
    )

    // If source filter is applied, return all events from that source (no deduplication)
    // Otherwise, deduplicate events and return the merged result
    let processedEvents: SeismicEvent[]
    if (params.source) {
      processedEvents = locationFilteredEvents.filter(
        event => event.source === params.source
      )
    } else {
      // Deduplicate when no specific source is requested
      processedEvents = deduplicateEvents(locationFilteredEvents)
    }

    const sortedEvents = sortEvents(processedEvents)
    console.log({
      mEvents: allEvents.filter(
        ({ source }: { source: string }) => source.toLowerCase() === "rsn"
      ),
      rsnEvents,
    })

    // Apply pagination if requested
    const limit = params.limit || sortedEvents.length
    const offset = params.offset || 0
    const paginatedEvents = sortedEvents.slice(offset, offset + limit)

    // Calculate statistics (on full dataset)
    const stats = {
      total: sortedEvents.length,
      sources: {
        usgs: sortedEvents.filter(e => e.source === "usgs").length,
        ovsicori: sortedEvents.filter(e => e.source === "ovsicori").length,
        rsn: sortedEvents.filter(e => e.source === "rsn").length,
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
        events: paginatedEvents,
        metadata: {
          type,
          requestedAt: new Date().toISOString(),
          region: "Costa Rica",
          dateRange: {
            start: params.startDate,
            end: params.endDate,
            adjustedStart: hasFilters ? adjustedParams.startDate : undefined,
          },
          pagination: {
            total: sortedEvents.length,
            limit,
            offset,
            hasMore: offset + limit < sortedEvents.length,
          },
          stats,
          sources: {
            usgs: usgsEvents.status === "fulfilled" ? "success" : "failed",
            ovsicori:
              ovsicoriEvents.status === "fulfilled" ? "partial" : "failed",
            rsn: rsnEvents.status === "fulfilled" ? "success" : "failed",
          },
          notes: [
            "USGS includes earthquakes M2.5+ in Costa Rica region",
            "OVSICORI integration pending - needs HTML parsing implementation",
            "When filters are applied, data from previous month is fetched for better filtering options",
            "When specific source is requested, all events from that source are returned without deduplication",
            "Duplicates are automatically removed based on time/location proximity when no source filter is applied",
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
