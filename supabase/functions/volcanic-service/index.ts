import { COSTA_RICA_VOLCANOES, isWithinCostaRica } from "../_shared/coords.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

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
  volcanoName: string
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
            ".Eruption-AccordionHeader"
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
function filterVolcanoesByTimeCode(
  volcanoes: Volcano[],
  timeCode?: string
): Volcano[] {
  if (!timeCode || timeCode === "D1") {
    return volcanoes // Return all volcanoes for D1 (most recent) or no filter
  }

  // For other time codes, we would implement filtering logic based on eruption history
  // This is a placeholder - in a real implementation, you'd analyze the history data
  return volcanoes
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
        }
      )
    }

    // Scrape volcano data for all Costa Rica volcanoes
    const volcanoPromises = Object.entries(COSTA_RICA_VOLCANOES).map(
      ([name, id]) => scrapeVolcanoData(id, name)
    )

    let volcanoes = (await Promise.all(volcanoPromises)).filter(
      Boolean
    ) as Volcano[]

    // Apply time code filtering if specified
    volcanoes = filterVolcanoesByTimeCode(volcanoes, timeCode)

    // Enhance volcano data with computed properties for client compatibility
    const enhancedVolcanoes = volcanoes.map(volcano => ({
      ...volcano,
      // Add computed properties that the client expects
      computedStatus: determineVolcanoStatus(volcano),
      computedEruptionTime: timeCode
        ? ERUPTION_TIME_CODES[timeCode]?.range
        : "Unknown",
    }))

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
      }
    )
  }
})

// Helper function to determine volcano status based on available data
function determineVolcanoStatus(volcano: Volcano): string {
  // Check if volcano is marked as active in details
  if (volcano.details["Status"]?.toLowerCase().includes("active")) {
    return "Activo"
  }

  // Check eruption history for recent activity
  const recentEruptions = volcano.history.filter(event => {
    const dateStr = event.date.toLowerCase()
    return (
      dateStr.includes("2020") ||
      dateStr.includes("2019") ||
      dateStr.includes("2018")
    )
  })

  if (recentEruptions.length > 0) {
    return "Activo"
  }

  // Default to dormant if no clear status
  return "Durmiente"
}
