import { COSTA_RICA_VOLCANOES, VOLCANO_COORDINATES } from "../_shared/coords.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.56/deno-dom-wasm.ts"

// Type definitions for volcano data contract
interface VolcanoEruptionEvent {
  date: string
  details: string
  power: string
}

interface VolcanoDetails {
  [key: string]: string
}

interface VolcanoSubDetails {
  [key: string]: string
}

interface Volcano {
  id: string
  name: string
  url: string
  details: VolcanoDetails
  subDetails: VolcanoSubDetails
  history: VolcanoEruptionEvent[]
}

interface VolcanoesRequest {
  country?: string
  timeCode?: string
}

// Eruption time code mappings
const ERUPTION_TIME_CODES: Record<string, { label: string; range: string }> = {
  D1: { label: "Historical", range: ">= 1964" },
  D2: { label: "Historical", range: "1900 - 1963" },
  D3: { label: "Historical", range: "1800 - 1899" },
  D4: { label: "Historical", range: "1700 - 1799" },
  D5: { label: "Historical", range: "1500 - 1699" },
  D6: { label: "Historical", range: "1 - 1499" },
  D7: { label: "Holocene", range: "Holocene" },
}

async function scrapeVolcanoData(
  volcanoId: string,
  volcanoName: string,
): Promise<Volcano | null> {
  try {
    const url = `https://volcano.si.edu/volcano.cfm?vn=${volcanoId}`
    // Fetch the main volcano page
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch ${volcanoName}: ${response.status}`)
    }

    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, "text/html")

    if (!doc) {
      throw new Error("Failed to parse HTML")
    }

    // Extract basic volcano info
    const volcanoData: Volcano = {
      name: volcanoName,
      id: volcanoId,
      url,
      details: {},
      subDetails: {},
      history: [],
    }

    const info = doc.querySelector(".volcano-info-table")

    if (info) {
      const titleCells = info.querySelectorAll("li.title")
      const valueCells = info.querySelectorAll("li.shaded")

      // Pair titles with values
      for (let i = 0; i < Math.min(titleCells.length, valueCells.length); i++) {
        const key = titleCells[i].textContent?.trim() || ""
        const value = valueCells[i].textContent?.trim() || ""
        if (key) {
          volcanoData.details[key] = value
        }
      }
    }

    const subinfo = doc.querySelector(".volcano-subinfo-table")
    if (subinfo) {
      const titleCells = subinfo.querySelectorAll("li.title")
      const valueCells = subinfo.querySelectorAll("li.clear")

      // Pair titles with values
      for (let i = 0; i < Math.min(titleCells.length, valueCells.length); i++) {
        const key = titleCells[i].textContent?.trim() || ""
        const value = valueCells[i].textContent?.trim() || ""
        if (key) {
          volcanoData.subDetails[key] = value
        }
      }
    }

    const allSections = doc.querySelectorAll(".tabbed-content")
    for (const section of allSections) {
      const h5 = section.querySelector("h5")
      if (h5?.textContent?.includes("History")) {
        const historyTable = section.querySelector(".Eruption-Accordion")
        if (historyTable) {
          const rows = historyTable.querySelectorAll(
            ".Eruption-AccordionHeader",
          )

          for (const row of rows) {
            volcanoData.history.push({
              date: row.textContent?.trim() || "",
              details:
                row.querySelectorAll("span")[1]?.textContent?.trim() || "",
              power: row.querySelectorAll("span")[2]?.textContent?.trim() || "",
            })
          }
        }
      }
    }

    return volcanoData
  } catch (error) {
    console.error(`Error scraping ${volcanoName}:`, error)
    return null
  }
}

// Filter volcanoes based on time code
/**
 * Filters volcanoes by eruption time code.
 *
 * @param volcanoes - Array of volcano objects to filter
 * @param timeCode - Time code from ERUPTION_TIME_CODES (e.g., "D1", "D2", etc.)
 * @returns Filtered array of volcanoes that have at least one eruption in the specified time range
 *
 * Behavior:
 * - timeCode === "D1" or undefined: Returns all volcanoes (no filter)
 * - timeCode === "D7" (Holocene): Returns volcanoes with any eruption history
 * - Unknown timeCode: Treated as no filter (returns all volcanoes) with a warning
 * - Other time codes: Returns volcanoes with at least one eruption in the specified year range
 */
function filterVolcanoesByTimeCode(
  volcanoes: Volcano[],
  timeCode?: string,
): Volcano[] {
  // Handle D1 (most recent) or no filter - return all volcanoes
  if (!timeCode || timeCode === "D1") {
    return volcanoes
  }

  // Get the time code configuration
  const timeCodeConfig = ERUPTION_TIME_CODES[timeCode]

  // Treat unknown time codes as no filter (return all volcanoes)
  if (!timeCodeConfig) {
    console.warn(`Unknown timeCode: ${timeCode}, returning all volcanoes`)
    return volcanoes
  }

  // Parse the range to get start and end years
  const range = timeCodeConfig.range

  // Handle D7 (Holocene) - this is a special case
  if (range === "Holocene") {
    // Holocene is approximately the last 11,700 years
    // For practical purposes, we'll treat this as "any eruption in history"
    return volcanoes.filter(volcano => volcano.history.length > 0)
  }

  // Parse ranges like ">= 1964", "1900 - 1963", etc.
  let startYear: number | null = null
  let endYear: number | null = null

  if (range.startsWith(">=")) {
    // Range like ">= 1964"
    startYear = parseInt(range.replace(">=", "").trim(), 10)
    endYear = null // No upper bound
  } else if (range.includes("-")) {
    // Range like "1900 - 1963"
    const [start, end] = range.split("-").map(s => parseInt(s.trim(), 10))
    startYear = start
    endYear = end
  }

  // If we couldn't parse the range, return all volcanoes
  if (startYear === null || isNaN(startYear)) {
    console.warn(`Could not parse range for timeCode ${timeCode}: ${range}`)
    return volcanoes
  }

  // Filter volcanoes based on eruption history
  return volcanoes.filter(volcano => {
    // Check if any eruption falls within the time range
    return volcano.history.some(event => {
      const eventDate = parseEventDate(event.date)
      if (!eventDate) {
        return false // Skip invalid dates
      }

      const eventYear = eventDate.getFullYear()

      if (endYear === null) {
        // Only lower bound (e.g., ">= 1964")
        return eventYear >= startYear
      } else {
        // Both bounds (e.g., "1900 - 1963")
        return eventYear >= startYear && eventYear <= endYear
      }
    })
  })
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Parse request parameters
    let requestData: VolcanoesRequest = {}
    if (req.method === "POST") {
      try {
        requestData = await req.json()
      } catch (e) {
        console.warn("Invalid JSON in request body, using defaults")
      }
    }

    const { country, timeCode } = requestData

    // Validate country parameter
    if (country && country !== "Costa Rica") {
      return new Response(
        JSON.stringify({
          error: "Currently only Costa Rica is supported",
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Scrape volcano data for all Costa Rica volcanoes
    const volcanoPromises = Object.entries(COSTA_RICA_VOLCANOES).map(
      ([name, id]) => scrapeVolcanoData(id, name),
    )

    let volcanoes = (await Promise.all(volcanoPromises)).filter(
      Boolean,
    ) as Volcano[]

    // Apply time code filtering if specified
    volcanoes = filterVolcanoesByTimeCode(volcanoes, timeCode)

    // Enhance volcano data with computed properties for client compatibility
    const enhancedVolcanoes = volcanoes.map(volcano => {
      const coords = VOLCANO_COORDINATES[volcano.id]
      const status = determineVolcanoStatus(volcano)

      // Map status to alert level for display
      let alertLevel = "Verde"
      if (status === "Activo") alertLevel = "Roja"
      else if (status === "Durmiente") alertLevel = "Amarilla"

      return {
        ...volcano,
        // Add coordinates for map display
        lat: coords?.lat || 0,
        lng: coords?.lng || 0,
        // Add computed properties that the client expects
        computedStatus: status,
        computedEruptionTime: timeCode
          ? ERUPTION_TIME_CODES[timeCode]?.range
          : "Unknown",
        // Add map display properties
        alertLevel,
        elevation:
          volcano.subDetails["Summit Elevation"] ||
          volcano.subDetails["Elevation"] ||
          "Unknown",
      }
    })

    const response = {
      success: true,
      volcanoes: enhancedVolcanoes,
      metadata: {
        requestedAt: new Date().toISOString(),
        source: "Smithsonian GVP Volcano Pages",
        filters: {
          country: country || "All",
          timeCode: timeCode || "All",
        },
        count: enhancedVolcanoes.length,
      },
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Volcanic service error:", error)

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
})

// Helper function to determine volcano status based on available data
function determineVolcanoStatus(volcano: Volcano): string {
  // Check if volcano is marked as active in details
  if (volcano.details["Status"]?.toLowerCase().includes("active")) {
    return "Activo"
  }

  // Check eruption history for recent activity using dynamic rolling window
  const ACTIVE_YEARS_WINDOW = 5 // Configurable: number of years to consider as "recent"
  const cutoffDate = new Date()
  cutoffDate.setFullYear(cutoffDate.getFullYear() - ACTIVE_YEARS_WINDOW)

  const recentEruptions = volcano.history.filter(event => {
    try {
      // Robust date parsing: handle various formats (YYYY, YYYY-MM, YYYY-MM-DD, etc.)
      const eventDate = parseEventDate(event.date)
      if (!eventDate) {
        // Skip invalid dates gracefully
        return false
      }
      return eventDate >= cutoffDate
    } catch (error) {
      // Log parse failures and skip invalid dates
      console.warn(`Failed to parse eruption date "${event.date}":`, error)
      return false
    }
  })

  if (recentEruptions.length > 0) {
    return "Activo"
  }

  // Default to dormant if no clear status
  return "Durmiente"
}

/**
 * Robustly parse various date formats from eruption history
 * Handles: YYYY, YYYY-MM, YYYY-MM-DD, and other common formats
 */
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") {
    return null
  }

  // Extract year from the date string (handles various formats)
  const yearMatch = dateStr.match(/(\d{4})/)
  if (!yearMatch) {
    return null
  }

  const year = parseInt(yearMatch[1], 10)
  if (isNaN(year) || year < 1000 || year > 9999) {
    return null
  }

  // Try to parse as full date first
  const parsedDate = new Date(dateStr)
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate
  }

  // Fallback: create date from year only (set to January 1st)
  return new Date(year, 0, 1)
}
