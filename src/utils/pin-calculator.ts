import { useMemo } from "react"
import { SeismicEvent } from "../types/seismic"
import { Volcano } from "../types/volcano"
import { getEventColorScheme } from "./color-scheme"
import { ColorSet } from "../components/Marker"

export interface MapPin {
  id: string
  lat: number
  lng: number
  name: string
  markerColor: ColorSet
  content: React.ReactNode
}

/**
 * Memoized hook for calculating map pins from seismic events
 * @param locations - Array of seismic events or volcanoes
 * @param type - Type of data ("earthquake" | "volcano")
 * @param renderContent - Function to render tooltip content
 * @returns Memoized array of map pins
 */
export const useMapPins = (
  locations: SeismicEvent[] | Volcano[] | null,
  type: "earthquake" | "volcano",
  renderContent: (
    loc: SeismicEvent | Volcano,
    name: string,
    color: string,
  ) => React.ReactNode,
): MapPin[] => {
  return useMemo(() => {
    if (!locations) return []

    return locations.map(loc => {
      const isEarthquake = type === "earthquake"
      const lat = (loc as any).coordinates?.lat || loc.lat
      const lng =
        (loc as any).coordinates?.lon ||
        (loc as any).lng ||
        (loc as SeismicEvent).lon
      const name = isEarthquake
        ? (loc as SeismicEvent).location
        : (loc as Volcano).name

      const magnitude = isEarthquake
        ? (loc as SeismicEvent).magnitude
        : undefined
      const alertLevel = isEarthquake ? undefined : (loc as Volcano).alertLevel

      const markerColor = getEventColorScheme(type, magnitude, alertLevel)
      const colorPoint = markerColor.base

      return {
        id: loc.id,
        lat,
        lng,
        name,
        markerColor,
        content: renderContent(loc, name, colorPoint),
      }
    })
  }, [locations, type, renderContent])
}

/**
 * Create a stable key for memoization based on location data
 * @param locations - Array of locations
 * @returns Stable string key for memoization
 */
export const createLocationKey = (
  locations: SeismicEvent[] | Volcano[] | null,
): string => {
  if (!locations || locations.length === 0) return "empty"

  return locations
    .map(
      loc =>
        `${loc.id}-${loc.lat}-${(loc as any).lng || (loc as SeismicEvent).lon}`,
    )
    .sort()
    .join("|")
}

/**
 * Memoized function for calculating individual pin data
 * @param loc - Single location
 * @param type - Type of data
 * @param renderContent - Function to render content
 * @returns Calculated pin data
 */
export const calculatePin = (
  loc: SeismicEvent | Volcano,
  type: "earthquake" | "volcano",
  renderContent: (
    loc: SeismicEvent | Volcano,
    name: string,
    color: string,
  ) => React.ReactNode,
): MapPin => {
  const isEarthquake = type === "earthquake"
  const lat = (loc as any).coordinates?.lat || loc.lat
  const lng =
    (loc as any).coordinates?.lon || (loc as any).lng || (loc as any).lon
  const name = isEarthquake
    ? (loc as SeismicEvent).location
    : (loc as Volcano).name

  const magnitude = isEarthquake ? (loc as SeismicEvent).magnitude : undefined
  const alertLevel = isEarthquake ? undefined : (loc as Volcano).alertLevel

  const markerColor = getEventColorScheme(type, magnitude, alertLevel)
  const colorPoint = markerColor.base

  return {
    id: loc.id,
    lat,
    lng,
    name,
    markerColor,
    content: renderContent(loc, name, colorPoint),
  }
}
