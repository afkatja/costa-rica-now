import { ColorSet, baseColorScheme } from "../components/Marker"
import { AlertLevel } from "../types/volcano"

/**
 * Get color scheme for earthquake magnitude
 * @param magnitude - Earthquake magnitude value
 * @returns ColorSet for the magnitude range
 */
export const getMagnitudeColorScheme = (magnitude: number): ColorSet => {
  if (magnitude >= 6) return baseColorScheme.alert
  if (magnitude >= 4.5 && magnitude < 6) return baseColorScheme.warn
  if (magnitude >= 3 && magnitude < 4.5) return baseColorScheme.minor
  return baseColorScheme.default
}

/**
 * Get color scheme for volcano alert level
 * @param alertLevel - Volcano alert level
 * @returns ColorSet for the alert level
 */
export const getVolcanoColorScheme = (alertLevel: AlertLevel): ColorSet => {
  switch (alertLevel) {
    case "Roja":
      return baseColorScheme.alert
    case "Amarilla":
      return baseColorScheme.minor
    case "Verde":
    default:
      return baseColorScheme.default
  }
}

/**
 * Get color scheme for seismic event (earthquake or volcano)
 * @param type - Type of event ("earthquake" | "volcano")
 * @param magnitude - Magnitude for earthquakes
 * @param alertLevel - Alert level for volcanoes
 * @returns ColorSet for the event
 */
export const getEventColorScheme = (
  type: "earthquake" | "volcano",
  magnitude?: number,
  alertLevel?: AlertLevel
): ColorSet => {
  if (type === "earthquake" && magnitude !== undefined) {
    return getMagnitudeColorScheme(magnitude)
  }
  if (type === "volcano" && alertLevel !== undefined) {
    return getVolcanoColorScheme(alertLevel)
  }
  return baseColorScheme.default
}
