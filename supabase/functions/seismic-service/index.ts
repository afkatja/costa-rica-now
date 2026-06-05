import { COSTA_RICA_BOUNDS } from "../_shared/coords.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { withEdgeHandler } from "../_shared/edge-handler.ts"

// Import new modules
import {
  DEDUPLICATION_THRESHOLDS,
  TIMEOUT_CONFIG,
  MAGNITUDE_FILTERS,
  SOURCE_PRIORITY,
  API_ENDPOINTS,
  REQUEST_HEADERS,
  DATE_RANGE_CONFIG,
  PAGINATION_DEFAULTS,
} from "./config.ts"
import { parseOvsicoriTableRows, parseRSNXML } from "./xml-parser.ts"
import { fetchWithRetry } from "./retry.ts"
import { SeismicEvent, FetchParams } from "./types.ts"

// Add Deno type for Edge Functions
declare const Deno: any

// Helper function to validate date strings
function validateDateString(dateString: string): {
  valid: boolean
  date?: Date
} {
  if (!dateString || typeof dateString !== "string") {
    return { valid: false }
  }

  const date = new Date(dateString)
  return {
    valid: !isNaN(date.getTime()),
    date: !isNaN(date.getTime()) ? date : undefined,
  }
}

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

// Helper function to format time only for Costa Rica locale
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Helper function to add formatted fields to SeismicEvent
function addFormattedFields(event: SeismicEvent): SeismicEvent {
  return {
    ...event,
    formattedTime: formatTime(event.time),
    formattedDateTime: formatDateTime(event.time),
  }
}

// OVSICORI table parsing is now in xml-parser module

// Unified event structure is now in types.ts

function getSourceCounts(events: SeismicEvent[]) {
  return {
    total: events.length,
    usgs: events.filter(event => event.source === "usgs").length,
    ovsicori: events.filter(event => event.source === "ovsicori").length,
    rsn: events.filter(event => event.source === "rsn").length,
    manual: events.filter(event => event.source === "manual").length,
  }
}

function getFetchSummary(
  result: PromiseSettledResult<SeismicEvent[]>,
):
  | { status: "fulfilled"; count: number }
  | { status: "rejected"; reason: string } {
  if (result.status === "fulfilled") {
    return {
      status: result.status,
      count: result.value.length,
    }
  }

  return {
    status: result.status,
    reason:
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason),
  }
}

// Fetch USGS data with retry logic
async function fetchUSGSData(params: FetchParams): Promise<SeismicEvent[]> {
  const {
    startDate,
    endDate,
    minMagnitude = MAGNITUDE_FILTERS.USGS_MIN,
    maxMagnitude,
  } = params

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

  const url = `${API_ENDPOINTS.USGS}?${queryParams.toString()}`

  try {
    const response = await fetchWithRetry({
      url,
      headers: REQUEST_HEADERS.DEFAULT,
      timeoutMs: TIMEOUT_CONFIG.USGS_TIMEOUT_MS,
    })

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
      }),
    )
  } catch (error) {
    console.error(`USGS fetch failed:`, error)
    throw error
  }
}

// Fetch OVSICORI data with retry logic
async function fetchOVSICORIData(params: FetchParams): Promise<SeismicEvent[]> {
  const { startDate, endDate } = params

  const url = API_ENDPOINTS.OVSICORI

  try {
    const response = await fetchWithRetry({
      url,
      headers: REQUEST_HEADERS.DEFAULT,
      timeoutMs: TIMEOUT_CONFIG.OVSICORI_TIMEOUT_MS,
    })

    const html = await response.text()
    const parseResult = parseOvsicoriTableRows(html, url)

    // Log any parsing issues
    if (parseResult.errors.length > 0) {
      console.error(
        "[seismic-service] OVSICORI parsing errors:",
        parseResult.errors,
      )
    }
    if (parseResult.warnings.length > 0) {
      console.warn(
        "[seismic-service] OVSICORI parsing warnings:",
        parseResult.warnings,
      )
    }

    const events = parseResult.events.filter(
      (event: SeismicEvent) =>
        event.magnitude >= MAGNITUDE_FILTERS.OVSICORI_MIN,
    )
    const startTime = new Date(`${startDate}T00:00:00-06:00`).getTime()
    const endTime = new Date(`${endDate}T23:59:59-06:00`).getTime()

    const filteredEvents = events.filter(
      (event: SeismicEvent) => event.time >= startTime && event.time <= endTime,
    )

    console.log("[seismic-service] OVSICORI table parse", {
      parsed: events.length,
      startDate,
      endDate,
      inRange: filteredEvents.length,
      errors: parseResult.errors.length,
      warnings: parseResult.warnings.length,
    })

    return filteredEvents
  } catch (error) {
    console.error("OVSICORI fetch error:", error)
    return []
  }
}

// Fetch RSN data with retry logic and multiple configurations
async function fetchRSNData(params: FetchParams): Promise<SeismicEvent[]> {
  const {
    startDate,
    endDate,
    minMagnitude = MAGNITUDE_FILTERS.RSN_MIN,
    maxMagnitude,
  } = params

  console.log(
    `[seismic-service] Fetching RSN data for range: ${startDate} to ${endDate}`,
  )

  const queryParams = new URLSearchParams({
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

  const url = `${API_ENDPOINTS.RSN}?${queryParams.toString()}`

  // Try different request configurations
  const requestConfigs = [
    {
      name: "Browser-like",
      headers: REQUEST_HEADERS.BROWSER_LIKE,
    },
    {
      name: "Minimal",
      headers: REQUEST_HEADERS.MINIMAL,
    },
    {
      name: "Seismic Service",
      headers: REQUEST_HEADERS.SEISMIC_SERVICE,
    },
  ]

  for (const config of requestConfigs) {
    try {
      console.log(`[seismic-service] Trying RSN with ${config.name} headers`)

      const response = await fetchWithRetry({
        url,
        headers: config.headers,
        timeoutMs: TIMEOUT_CONFIG.RSN_TIMEOUT_MS,
      })

      const xmlText = await response.text()

      if (
        xmlText.length > 0 &&
        (xmlText.includes("<isc") || xmlText.includes("<?xml"))
      ) {
        console.log(`[seismic-service] RSN success with ${config.name} headers`)
        const parseResult = parseRSNXML(xmlText, startDate, endDate)

        // Log any parsing issues
        if (parseResult.errors.length > 0) {
          console.error(
            "[seismic-service] RSN parsing errors:",
            parseResult.errors,
          )
        }
        if (parseResult.warnings.length > 0) {
          console.warn(
            "[seismic-service] RSN parsing warnings:",
            parseResult.warnings,
          )
        }

        console.log(
          `[seismic-service] RSN parsed ${parseResult.events.length} events`,
        )
        return parseResult.events
      } else {
        console.warn(
          `[seismic-service] RSN response not XML with ${config.name}`,
        )
      }
    } catch (error) {
      console.warn(`[seismic-service] RSN failed with ${config.name}:`, error)
      continue
    }
  }

  console.log(
    "[seismic-service] All RSN configurations failed - returning empty array",
  )
  return []
}

// RSN XML parsing is now in xml-parser module

// Deduplicate events based on proximity, time, and magnitude using configuration constants
function deduplicateEvents(events: SeismicEvent[]): SeismicEvent[] {
  const deduplicated: SeismicEvent[] = []

  for (const event of events) {
    const isDuplicate = deduplicated.some(existing => {
      if (event.source === existing.source) {
        return false
      }

      // Use configuration constants for deduplication thresholds
      const timeDiff = Math.abs(event.time - existing.time)
      const distanceKm = calculateDistance(
        event.lat,
        event.lon,
        existing.lat,
        existing.lon,
      )
      const magDiff = Math.abs(event.magnitude - existing.magnitude)

      return (
        timeDiff < DEDUPLICATION_THRESHOLDS.TIME_MS &&
        distanceKm < DEDUPLICATION_THRESHOLDS.DISTANCE_KM &&
        magDiff < DEDUPLICATION_THRESHOLDS.MAGNITUDE_DIFF
      )
    })

    if (!isDuplicate) {
      deduplicated.push(event)
    } else {
      // Find the existing duplicate to potentially replace
      const existingIndex = deduplicated.findIndex(existing => {
        if (event.source === existing.source) {
          return false
        }

        const timeDiff = Math.abs(event.time - existing.time)
        const distanceKm = calculateDistance(
          event.lat,
          event.lon,
          existing.lat,
          existing.lon,
        )
        const magDiff = Math.abs(event.magnitude - existing.magnitude)

        return (
          timeDiff < DEDUPLICATION_THRESHOLDS.TIME_MS &&
          distanceKm < DEDUPLICATION_THRESHOLDS.DISTANCE_KM &&
          magDiff < DEDUPLICATION_THRESHOLDS.MAGNITUDE_DIFF
        )
      })

      // Use source priority configuration for deduplication
      if (existingIndex !== -1) {
        const existing = deduplicated[existingIndex]
        const eventPriority = SOURCE_PRIORITY[event.source] || 0
        const existingPriority = SOURCE_PRIORITY[existing.source] || 0

        // Replace if current event has higher priority
        if (eventPriority > existingPriority) {
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
  lon2: number,
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
  radiusKm?: number,
): SeismicEvent[] {
  if (!lat || !lon || !radiusKm) return events

  return events.filter(
    event => calculateDistance(lat, lon, event.lat, event.lon) <= radiusKm,
  )
}

// Sort events by time (newest first)
function sortEvents(events: SeismicEvent[]): SeismicEvent[] {
  return events.sort((a, b) => b.time - a.time)
}

// Main handler
Deno.serve(
  withEdgeHandler(async (req: Request) => {
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
          },
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
        const startDateValidation = validateDateString(params.startDate)
        if (!startDateValidation.valid) {
          return new Response(
            JSON.stringify({
              error: "Invalid startDate parameter",
              message: "startDate must be a valid date string",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          )
        }

        const startDate = startDateValidation.date!
        // Use configuration for date range extension
        startDate.setMonth(
          startDate.getMonth() - DATE_RANGE_CONFIG.FILTER_EXTENSION_MONTHS,
        )
        adjustedParams.startDate = startDate.toISOString().split("T")[0] // YYYY-MM-DD format
      }

      console.log("[seismic-service] request", {
        type,
        params,
        hasFilters: Boolean(hasFilters),
        fetchParams: hasFilters ? adjustedParams : params,
      })

      // Fetch from all available sources in parallel
      const [usgsEvents, ovsicoriEvents, rsnEvents] = await Promise.allSettled([
        fetchUSGSData(hasFilters ? adjustedParams : params),
        fetchOVSICORIData(hasFilters ? adjustedParams : params),
        fetchRSNData(hasFilters ? adjustedParams : params),
      ])

      console.log("[seismic-service] source fetch results", {
        usgs: getFetchSummary(usgsEvents),
        ovsicori: getFetchSummary(ovsicoriEvents),
        rsn: getFetchSummary(rsnEvents),
      })

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
        end?: string,
      ) => {
        if (!start && !end) return events

        let startTs: number
        let endTs: number

        if (start) {
          const startValidation = validateDateString(start)
          if (!startValidation.valid) {
            throw new Error(`Invalid startDate parameter: ${start}`)
          }
          // Apply Costa Rica timezone offset (-06:00) for full day coverage
          const startDate = startValidation.date!
          startTs =
            new Date(
              startDate.getFullYear(),
              startDate.getMonth(),
              startDate.getDate(),
              0,
              0,
              0,
            ).getTime() +
            Math.abs(DATE_RANGE_CONFIG.COSTA_RICA_TIMEZONE_OFFSET) *
              60 *
              60 *
              1000
        } else {
          startTs = new Date().getTime() - 24 * 60 * 60 * 1000
        }

        if (end) {
          const endValidation = validateDateString(end)
          if (!endValidation.valid) {
            throw new Error(`Invalid endDate parameter: ${end}`)
          }
          // Apply Costa Rica timezone offset (-06:00) for full day coverage
          const endDate = endValidation.date!
          endTs =
            new Date(
              endDate.getFullYear(),
              endDate.getMonth(),
              endDate.getDate(),
              23,
              59,
              59,
              999,
            ).getTime() +
            Math.abs(DATE_RANGE_CONFIG.COSTA_RICA_TIMEZONE_OFFSET) *
              60 *
              60 *
              1000
        } else {
          endTs = new Date().getTime()
        }

        return events.filter(e => e.time >= startTs && e.time <= endTs)
      }

      const filteredEvents = filterEventsByDateRange(
        allEvents,
        params.startDate as string,
        params.endDate as string,
      )

      console.log("[seismic-service] after date filter", {
        before: getSourceCounts(allEvents),
        after: getSourceCounts(filteredEvents),
        removed: allEvents.length - filteredEvents.length,
        startDate: params.startDate,
        endDate: params.endDate,
      })

      // Filter events by magnitude range
      const magnitudeFilteredEvents = filteredEvents.filter(event => {
        const meetsMin =
          params.minMagnitude !== undefined
            ? event.magnitude >= params.minMagnitude
            : true
        const meetsMax =
          params.maxMagnitude !== undefined
            ? event.magnitude <= params.maxMagnitude
            : true
        return meetsMin && meetsMax
      })

      console.log("[seismic-service] after magnitude filter", {
        before: getSourceCounts(filteredEvents),
        after: getSourceCounts(magnitudeFilteredEvents),
        removed: filteredEvents.length - magnitudeFilteredEvents.length,
        minMagnitude: params.minMagnitude,
        maxMagnitude: params.maxMagnitude,
      })

      // Apply location filtering if requested
      const locationFilteredEvents = filterEventsByLocation(
        magnitudeFilteredEvents,
        params.lat,
        params.lon,
        params.radiusKm,
      )

      console.log("[seismic-service] after location filter", {
        before: getSourceCounts(magnitudeFilteredEvents),
        after: getSourceCounts(locationFilteredEvents),
        removed: magnitudeFilteredEvents.length - locationFilteredEvents.length,
        lat: params.lat,
        lon: params.lon,
        radiusKm: params.radiusKm,
      })

      // If source filter is applied, return all events from that source (no deduplication)
      // Otherwise, deduplicate events and return the merged result
      let processedEvents: SeismicEvent[]
      if (params.source) {
        processedEvents = locationFilteredEvents.filter(
          event => event.source === params.source,
        )
      } else {
        // Deduplicate when no specific source is requested
        processedEvents = deduplicateEvents(locationFilteredEvents)
      }

      const sortedEvents = sortEvents(processedEvents)

      console.log("[seismic-service] after source/dedup processing", {
        sourceFilter: params.source,
        before: getSourceCounts(locationFilteredEvents),
        after: getSourceCounts(processedEvents),
        removed: locationFilteredEvents.length - processedEvents.length,
      })

      // Apply pagination using configuration defaults
      const limit = params.limit || PAGINATION_DEFAULTS.DEFAULT_LIMIT
      const offset = params.offset || PAGINATION_DEFAULTS.DEFAULT_OFFSET
      const paginatedEvents = sortedEvents.slice(offset, offset + limit)

      console.log("[seismic-service] pagination result", {
        totalBeforePagination: sortedEvents.length,
        returned: paginatedEvents.length,
        limit,
        offset,
        hasMore: offset + limit < sortedEvents.length,
        returnedCounts: getSourceCounts(paginatedEvents),
      })

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
              "OVSICORI includes recent earthquakes from the public table feed",
              "When filters are applied, data from previous month is fetched for better filtering options",
              "When specific source is requested, all events from that source are returned without deduplication",
              "Duplicates across sources are automatically removed based on time/location proximity when no source filter is applied",
            ],
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
        },
      )
    }
  }),
)
