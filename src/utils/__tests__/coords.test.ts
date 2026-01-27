import { describe, it, expect } from "vitest"
import {
  isWithinCostaRica,
  COSTA_RICA_BOUNDS,
  VOLCANO_COORDINATES,
} from "../../supabase/functions/_shared/coords"

describe("Coordinate Utilities", () => {
  describe("isWithinCostaRica", () => {
    it("should return true for San José (capital of Costa Rica)", () => {
      const result = isWithinCostaRica({ lat: 9.9281, lng: -84.0907 })
      expect(result).toBe(true)
    })

    it("should return true for Liberia (Guanacaste)", () => {
      const result = isWithinCostaRica({ lat: 10.6341, lng: -85.4407 })
      expect(result).toBe(true)
    })

    it("should return true for Puerto Limón (Caribbean coast)", () => {
      const result = isWithinCostaRica({ lat: 9.9913, lng: -83.0359 })
      expect(result).toBe(true)
    })

    it("should return false for Panama City (outside Costa Rica)", () => {
      const result = isWithinCostaRica({ lat: 8.9824, lng: -79.5199 })
      expect(result).toBe(false)
    })

    it("should return false for Managua, Nicaragua (outside Costa Rica)", () => {
      const result = isWithinCostaRica({ lat: 12.1364, lng: -86.2514 })
      expect(result).toBe(false)
    })

    it("should return false for point too far north", () => {
      const result = isWithinCostaRica({ lat: 12.0, lng: -84.0 })
      expect(result).toBe(false)
    })

    it("should return false for point too far south", () => {
      const result = isWithinCostaRica({ lat: 7.0, lng: -84.0 })
      expect(result).toBe(false)
    })

    it("should return false for point too far east", () => {
      const result = isWithinCostaRica({ lat: 9.5, lng: -81.0 })
      expect(result).toBe(false)
    })

    it("should return false for point too far west", () => {
      const result = isWithinCostaRica({ lat: 9.5, lng: -87.0 })
      expect(result).toBe(false)
    })

    it("should return true for point on northern border", () => {
      const result = isWithinCostaRica({
        lat: COSTA_RICA_BOUNDS.maxLatitude,
        lng: -84.0,
      })
      expect(result).toBe(true)
    })

    it("should return true for point on southern border", () => {
      const result = isWithinCostaRica({
        lat: COSTA_RICA_BOUNDS.minLatitude,
        lng: -84.0,
      })
      expect(result).toBe(true)
    })
  })

  describe("VOLCANO_COORDINATES", () => {
    it("should have coordinates for all 5 Costa Rica volcanoes", () => {
      const volcanoIds = [
        "345040", // Poás
        "345033", // Arenal
        "345060", // Irazú
        "345070", // Turrialba
        "345020", // Rincón de la Vieja
      ]

      volcanoIds.forEach(id => {
        expect(VOLCANO_COORDINATES[id]).toBeDefined()
        expect(VOLCANO_COORDINATES[id].lat).toBeDefined()
        expect(VOLCANO_COORDINATES[id].lng).toBeDefined()
      })
    })

    it("should have valid latitude for Poás volcano", () => {
      const poas = VOLCANO_COORDINATES["345040"]
      expect(poas.lat).toBeGreaterThan(8)
      expect(poas.lat).toBeLessThan(12)
    })

    it("should have valid longitude for Poás volcano", () => {
      const poas = VOLCANO_COORDINATES["345040"]
      expect(poas.lng).toBeGreaterThan(-87)
      expect(poas.lng).toBeLessThan(-82)
    })

    it("should have all volcanoes within Costa Rica bounds", () => {
      Object.values(VOLCANO_COORDINATES).forEach(coords => {
        expect(isWithinCostaRica({ lat: coords.lat, lng: coords.lng })).toBe(
          true,
        )
      })
    })
  })
})
