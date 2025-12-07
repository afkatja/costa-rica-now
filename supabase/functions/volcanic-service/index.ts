import { COSTA_RICA_VOLCANOES, isWithinCostaRica } from "../_shared/coords.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

async function scrapeVolcanoData(volcanoId: string, volcanoName: string) {
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
    const volcanoData: any = {
      name: volcanoName,
      id: volcanoId,
      url,
    }

    const info = doc.querySelector(".volcano-info-table")

    let details: Record<string, string> = {}
    if (info) {
      const titleCells = info.querySelectorAll("li.title")
      const valueCells = info.querySelectorAll("li.shaded")

      // Pair titles with values
      for (let i = 0; i < Math.min(titleCells.length, valueCells.length); i++) {
        const key = titleCells[i].textContent?.trim() || ""
        const value = valueCells[i].textContent?.trim() || ""
        if (key) {
          details[key] = value
        }
      }
    }
    const subinfo = doc.querySelector(".volcano-subinfo-table")
    let subDetails: Record<string, string> = {}
    if (subinfo) {
      const titleCells = subinfo.querySelectorAll("li.title")
      const valueCells = subinfo.querySelectorAll("li.clear")

      // Pair titles with values
      for (let i = 0; i < Math.min(titleCells.length, valueCells.length); i++) {
        const key = titleCells[i].textContent?.trim() || ""
        const value = valueCells[i].textContent?.trim() || ""
        if (key) {
          subDetails[key] = value
        }
      }
    }
    const allSections = doc.querySelectorAll(".tabbed-content")
    let eruptiveHistory = []
    for (const section of allSections) {
      const h5 = section.querySelector("h5")
      if (h5?.textContent?.includes("History")) {
        const historyTable = section.querySelector(".Eruption-Accordion")
        if (historyTable) {
          const rows = historyTable.querySelectorAll(
            ".Eruption-AccordionHeader"
          )

          for (const row of rows) {
            eruptiveHistory.push({
              date: row.textContent?.trim(),
              details: row.querySelectorAll("span")[1]?.textContent?.trim(),
              power: row.querySelectorAll("span")[2]?.textContent?.trim(),
            })
          }
        }
      }
    }

    const history = eruptiveHistory

    return { ...volcanoData, details, subDetails, history }
  } catch (error) {
    console.error(`Error scraping ${volcanoName}:`, error)
    return null
  }
}

Deno.serve(async req => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const volcanoPromises = Object.entries(COSTA_RICA_VOLCANOES).map(
      ([name, id]) => scrapeVolcanoData(id, name)
    )

    const volcanoes = (await Promise.all(volcanoPromises)).filter(Boolean)

    return new Response(
      JSON.stringify({
        success: true,
        volcanoes,
        metadata: {
          requestedAt: new Date().toISOString(),
          source: "Smithsonian GVP Volcano Pages",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
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
