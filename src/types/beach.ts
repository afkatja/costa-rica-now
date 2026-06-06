/** Complete beach/marine conditions for a coastal destination */
export interface BeachConditions {
  destinationId: string
  destination: string
  name: string
  lat: number
  lon: number
  region: string
  tides: {
    extremes: Array<{
      time: string
      height: number
      type: "high" | "low"
    }>
    nextHigh: {
      time: string
      height: number
      type: "high" | "low"
    } | null
    nextLow: {
      time: string
      height: number
      type: "high" | "low"
    } | null
    currentTide: "rising" | "falling" | null
  }
  waves: {
    current: {
      height: number
      direction: number
      directionCardinal: string
      time: string
    }
    forecast: Array<{
      time: string
      height: number
      direction: number
      directionCardinal: string
    }>
    average24h: number
    max24h: number
  }
  surfConditions: "excellent" | "good" | "fair" | "poor"
  lastUpdated: string
}
