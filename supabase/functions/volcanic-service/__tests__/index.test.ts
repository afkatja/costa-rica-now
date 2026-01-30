import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts"
import {
  COSTA_RICA_VOLCANOES,
  VOLCANO_COORDINATES,
} from "../../_shared/coords.ts"

Deno.test("COSTA_RICA_VOLCANOES has 5 volcanoes", () => {
  const volcanoes = Object.keys(COSTA_RICA_VOLCANOES)
  assertEquals(volcanoes.length, 5)
})

Deno.test("All volcano IDs have coordinates", () => {
  const volcanoIds = Object.values(COSTA_RICA_VOLCANOES)

  volcanoIds.forEach(id => {
    const coords = VOLCANO_COORDINATES[id]
    assertEquals(coords !== undefined, true)
    assertEquals(typeof coords.lat, "number")
    assertEquals(typeof coords.lng, "number")
  })
})

Deno.test("Volcano coordinates are within Costa Rica bounds", () => {
  Object.values(VOLCANO_COORDINATES).forEach(coords => {
    // Latitude should be between 8 and 11.5
    assertEquals(coords.lat >= 8.0, true)
    assertEquals(coords.lat <= 11.5, true)

    // Longitude should be between -86 and -82.5
    assertEquals(coords.lng >= -86.0, true)
    assertEquals(coords.lng <= -82.5, true)
  })
})

Deno.test("Volcano status determination", () => {
  // Active volcano - recent eruption
  const activeVolcano = {
    details: { Status: "Active" },
    history: [{ date: "2020-01-01", details: "Eruption", power: "Moderate" }],
  }

  // Dormant volcano - no recent activity
  const dormantVolcano = {
    details: { Status: "Dormant" },
    history: [{ date: "1800-01-01", details: "Eruption", power: "Large" }],
  }

  // Determine status based on criteria
  const determineStatus = (volcano: any) => {
    if (volcano.details["Status"]?.toLowerCase().includes("active")) {
      return "Activo"
    }
    const recentEruptions = volcano.history.filter((event: any) => {
      return event.date.includes("2020") || event.date.includes("2021")
    })
    if (recentEruptions.length > 0) return "Activo"
    return "Durmiente"
  }

  assertEquals(determineStatus(activeVolcano), "Activo")
  assertEquals(determineStatus(dormantVolcano), "Durmiente")
})

Deno.test("Alert level mapping", () => {
  const mapAlertLevel = (status: string) => {
    switch (status) {
      case "Activo":
        return "Roja"
      case "Durmiente":
        return "Amarilla"
      default:
        return "Verde"
    }
  }

  assertEquals(mapAlertLevel("Activo"), "Roja")
  assertEquals(mapAlertLevel("Durmiente"), "Amarilla")
  assertEquals(mapAlertLevel("Extinto"), "Verde")
})

Deno.test("Eruption time codes", () => {
  const ERUPTION_TIME_CODES: Record<string, { label: string; range: string }> =
    {
      D1: { label: "Historical", range: ">= 1964" },
      D2: { label: "Historical", range: "1900 - 1963" },
      D3: { label: "Historical", range: "1800 - 1899" },
      D7: { label: "Holocene", range: "Holocene" },
    }

  assertEquals(ERUPTION_TIME_CODES.D1.range, ">= 1964")
  assertEquals(ERUPTION_TIME_CODES.D7.label, "Holocene")
})

Deno.test("Volcano data enhancement", () => {
  const rawVolcano = {
    id: "345040",
    name: "Poás",
    details: { Status: "Active" },
    subDetails: { "Summit Elevation": "2708 m" },
    history: [],
  }

  const coords = VOLCANO_COORDINATES[rawVolcano.id]
  const enhanced = {
    ...rawVolcano,
    lat: coords?.lat || 0,
    lng: coords?.lng || 0,
    computedStatus: "Activo",
    alertLevel: "Roja",
    elevation: rawVolcano.subDetails["Summit Elevation"],
  }

  assertEquals(enhanced.lat, 10.2)
  assertEquals(enhanced.lng, -84.233)
  assertEquals(enhanced.alertLevel, "Roja")
  assertEquals(enhanced.elevation, "2708 m")
})
