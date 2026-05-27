// XML parsing module for seismic data with proper error handling

import { SeismicEvent } from "./types.ts"

export interface ParseResult {
  events: SeismicEvent[]
  errors: string[]
  warnings: string[]
}

export class XMLParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = "XMLParseError"
  }
}

/**
 * Parse OVSICORI HTML table rows into seismic events
 */
export function parseOvsicoriTableRows(html: string, url: string): ParseResult {
  const result: ParseResult = {
    events: [],
    errors: [],
    warnings: [],
  }

  if (!html || typeof html !== "string") {
    result.errors.push("Invalid HTML input: empty or not a string")
    return result
  }

  try {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch
    let processedRows = 0
    let skippedRows = 0

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      processedRows++

      try {
        const cells = Array.from(
          rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
        ).map(cellMatch => cleanOvsicoriCell(cellMatch[1]))

        if (cells.length < 9) {
          skippedRows++
          result.warnings.push(
            `Row ${processedRows}: Insufficient cells (${cells.length} < 9)`,
          )
          continue
        }

        const [date, time, magnitude, depth, lat, lon, location, felt, author] =
          cells
        const latitude = parseFloat(lat)
        const longitude = parseFloat(lon)
        const magnitudeValue = parseFloat(magnitude)
        const depthValue = parseFloat(depth)

        // Validate required fields
        if (!date || !time) {
          skippedRows++
          result.warnings.push(`Row ${processedRows}: Missing date or time`)
          continue
        }

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          skippedRows++
          result.warnings.push(
            `Row ${processedRows}: Invalid coordinates (${lat}, ${lon})`,
          )
          continue
        }

        if (Number.isNaN(magnitudeValue)) {
          skippedRows++
          result.warnings.push(
            `Row ${processedRows}: Invalid magnitude (${magnitude})`,
          )
          continue
        }

        const event = createOvsicoriEvent({
          date,
          time,
          magnitude: magnitudeValue,
          depth: Number.isNaN(depthValue) ? null : depthValue,
          latitude,
          longitude,
          location,
          felt: felt.toLowerCase() === "sí" ? 1 : 0,
          author: author || "unknown",
          url,
        })

        result.events.push(event)
      } catch (rowError) {
        skippedRows++
        const errorMsg =
          rowError instanceof Error ? rowError.message : String(rowError)
        result.errors.push(`Row ${processedRows}: ${errorMsg}`)
      }
    }

    console.log(
      `[xml-parser] OVSICORI parse summary: ${result.events.length} events, ${skippedRows} skipped, ${processedRows} total rows`,
    )

    if (result.events.length === 0 && processedRows > 0) {
      result.warnings.push("No valid events parsed from any rows")
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(`HTML parsing failed: ${errorMsg}`)
    throw new XMLParseError(
      "Failed to parse OVSICORI HTML table",
      error instanceof Error ? error : undefined,
    )
  }

  return result
}

/**
 * Parse RSN XML data into seismic events
 */
export function parseRSNXML(
  xmlText: string,
  startDate?: string,
  endDate?: string,
): ParseResult {
  const result: ParseResult = {
    events: [],
    errors: [],
    warnings: [],
  }

  if (!xmlText || typeof xmlText !== "string") {
    result.errors.push("Invalid XML input: empty or not a string")
    return result
  }

  if (!xmlText.includes("<isc") && !xmlText.includes("<?xml")) {
    result.errors.push(
      "Input does not appear to be valid XML (missing XML declaration or root element)",
    )
    return result
  }

  try {
    console.log("[xml-parser] Parsing RSN XML data...")

    const eventMatches =
      xmlText.match(/<event[^>]*>([\s\S]*?)<\/event>/gi) || []
    console.log(`[xml-parser] Found ${eventMatches.length} event elements`)

    if (eventMatches.length === 0) {
      result.warnings.push("No event elements found in XML")
      return result
    }

    let processedEvents = 0
    let skippedEvents = 0

    for (let index = 0; index < eventMatches.length; index++) {
      const eventXml = eventMatches[index]
      processedEvents++

      try {
        const event = parseRSNEvent(eventXml, index)

        if (!event) {
          skippedEvents++
          result.warnings.push(`Event ${index + 1}: Failed to parse event data`)
          continue
        }

        // Only include RSN-related events
        if (event.isRsnRelated) {
          const { isRsnRelated, ...eventData } = event
          result.events.push(addFormattedFields(eventData))
        } else {
          skippedEvents++
          result.warnings.push(
            `Event ${index + 1}: Not RSN-related (networks: ${event.networks.join(", ")})`,
          )
        }
      } catch (eventError) {
        skippedEvents++
        const errorMsg =
          eventError instanceof Error ? eventError.message : String(eventError)
        result.errors.push(`Event ${index + 1}: ${errorMsg}`)
      }
    }

    console.log(
      `[xml-parser] RSN parse summary: ${result.events.length} events, ${skippedEvents} skipped, ${processedEvents} total events`,
    )

    if (result.events.length === 0 && processedEvents > 0) {
      result.warnings.push("No RSN-related events found in XML data")
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(`XML parsing failed: ${errorMsg}`)
    throw new XMLParseError(
      "Failed to parse RSN XML data",
      error instanceof Error ? error : undefined,
    )
  }

  return result
}

/**
 * Helper function to clean OVSICORI cell content
 */
function cleanOvsicoriCell(cell: string): string {
  return cell
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Create an OVSICORI event object
 */
function createOvsicoriEvent(data: {
  date: string
  time: string
  magnitude: number
  depth: number | null
  latitude: number
  longitude: number
  location: string
  felt: number
  author: string
  url: string
}): SeismicEvent {
  const {
    date,
    time,
    magnitude,
    depth,
    latitude,
    longitude,
    location,
    felt,
    author,
    url,
  } = data

  return {
    id: `ovsicori-${date.replace(/\D/g, "")}${time.replace(/\D/g, "")}-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
    source: "ovsicori",
    magnitude,
    location,
    lat: latitude,
    lon: longitude,
    depth,
    time: new Date(`${date} ${time} UTC-6`).getTime(),
    felt,
    tsunami: false,
    status: author,
    url,
  }
}

/**
 * Parse a single RSN event from XML
 */
function parseRSNEvent(
  eventXml: string,
  index: number,
): (SeismicEvent & { isRsnRelated: boolean; networks: string[] }) | null {
  try {
    // Extract event ID
    const idMatch = eventXml.match(/publicid="([^"]*)"/i)
    const id = idMatch ? idMatch[1] : `isc-${Date.now()}-${index}`

    // Extract preferred origin data
    const preferredOriginMatch = eventXml.match(
      /<origin[^>]*preferred="true"[^>]*>([\s\S]*?)<\/origin>/i,
    )
    const originMatch =
      preferredOriginMatch ||
      eventXml.match(/<origin[^>]*>([\s\S]*?)<\/origin>/i)

    if (!originMatch) {
      throw new Error("No origin element found")
    }

    const originData = parseOriginData(originMatch[1])
    if (!originData) {
      throw new Error("Failed to parse origin data")
    }

    // Extract magnitude data
    const magnitudeData = parseMagnitudeData(eventXml)
    if (!magnitudeData) {
      throw new Error("Failed to parse magnitude data")
    }

    // Extract location description
    const location = parseLocationDescription(
      eventXml,
      originData.lat,
      originData.lon,
    )

    // Extract network information
    const networks = extractNetworks(eventXml)
    const isRsnRelated = isRSNRelated(networks, location)

    return {
      id: `rsn-${id}`,
      source: "rsn" as const,
      magnitude: magnitudeData.magnitude,
      location,
      lat: originData.lat,
      lon: originData.lon,
      depth: originData.depth,
      time: originData.time,
      felt: undefined,
      intensity: undefined,
      tsunami: false,
      url: `http://www.isc.ac.uk/iscbulletin/search/event/${id}`,
      status: "reviewed",
      isRsnRelated,
      networks,
    }
  } catch (error) {
    console.error(`[xml-parser] Failed to parse RSN event ${index}:`, error)
    return null
  }
}

/**
 * Parse origin data from XML
 */
function parseOriginData(
  originXml: string,
): { time: number; lat: number; lon: number; depth: number | null } | null {
  try {
    // Extract time
    const timeMatch = originXml.match(
      /<time[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i,
    )
    const timeStr = timeMatch ? timeMatch[1].trim() : ""

    if (!timeStr) {
      throw new Error("Missing time value")
    }

    const time = new Date(timeStr).getTime()
    if (Number.isNaN(time)) {
      throw new Error(`Invalid time format: ${timeStr}`)
    }

    // Extract latitude
    const latMatch = originXml.match(
      /<latitude[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i,
    )
    const lat = latMatch ? parseFloat(latMatch[1].trim()) : NaN

    if (Number.isNaN(lat)) {
      throw new Error("Invalid or missing latitude")
    }

    // Extract longitude
    const lonMatch = originXml.match(
      /<longitude[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i,
    )
    const lon = lonMatch ? parseFloat(lonMatch[1].trim()) : NaN

    if (Number.isNaN(lon)) {
      throw new Error("Invalid or missing longitude")
    }

    // Extract depth
    const depthMatch = originXml.match(
      /<depth[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i,
    )
    const depth = depthMatch ? parseFloat(depthMatch[1].trim()) : null

    return { time, lat, lon, depth }
  } catch (error) {
    console.error("[xml-parser] Origin data parsing failed:", error)
    return null
  }
}

/**
 * Parse magnitude data from XML
 */
function parseMagnitudeData(eventXml: string): { magnitude: number } | null {
  try {
    const preferredMagMatch = eventXml.match(
      /<magnitude[^>]*preferred="true"[^>]*>([\s\S]*?)<\/magnitude>/i,
    )
    const magMatch =
      preferredMagMatch ||
      eventXml.match(/<magnitude[^>]*>([\s\S]*?)<\/magnitude>/i)

    if (!magMatch) {
      throw new Error("No magnitude element found")
    }

    const magValueMatch = magMatch[1].match(
      /<mag[^>]*>[\s]*<value[^>]*>([^<]*)<\/value>/i,
    )
    const magnitude = magValueMatch ? parseFloat(magValueMatch[1].trim()) : NaN

    if (Number.isNaN(magnitude)) {
      throw new Error("Invalid magnitude value")
    }

    return { magnitude }
  } catch (error) {
    console.error("[xml-parser] Magnitude data parsing failed:", error)
    return null
  }
}

/**
 * Parse location description from XML
 */
function parseLocationDescription(
  eventXml: string,
  lat: number,
  lon: number,
): string {
  const descMatch = eventXml.match(
    /<description[^>]*>[\s]*<text[^>]*>([^<]*)<\/text>/i,
  )
  const location = descMatch
    ? descMatch[1].trim()
    : `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`
  return location
}

/**
 * Extract network information from XML
 */
function extractNetworks(eventXml: string): string[] {
  const networks = new Set<string>()

  const creationInfoMatches =
    eventXml.match(/<creationInfo[^>]*>([\s\S]*?)<\/creationInfo>/gi) || []

  creationInfoMatches.forEach(creationInfo => {
    const authorMatch = creationInfo.match(/<author[^>]*>([^<]*)<\/author>/i)
    const agencyMatch = creationInfo.match(
      /<agencyID[^>]*>([^<]*)<\/agencyID>/i,
    )

    if (authorMatch) networks.add(authorMatch[1].toLowerCase().trim())
    if (agencyMatch) networks.add(agencyMatch[1].toLowerCase().trim())
  })

  return Array.from(networks)
}

/**
 * Check if event is RSN-related
 */
function isRSNRelated(networks: string[], location: string): boolean {
  const networkStr = networks.join(",")
  return (
    networkStr.includes("rsn") ||
    networkStr.includes("ucr") ||
    networkStr.includes("tc") ||
    location.toLowerCase().includes("costa rica")
  )
}

/**
 * Helper function to format datetime for Costa Rica locale
 */
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("es-CR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Helper function to format time only for Costa Rica locale
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Helper function to add formatted fields to SeismicEvent
 */
function addFormattedFields(event: SeismicEvent): SeismicEvent {
  return {
    ...event,
    formattedTime: formatTime(event.time),
    formattedDateTime: formatDateTime(event.time),
  }
}
