// SeismicEvent interface that matches the backend SeismicEvent structure
export interface SeismicEvent {
  id: string
  source: "rsn" | "usgs" | "ovsicori" | "manual"
  magnitude: number
  location: string
  lat: number
  lon: number
  depth: number | null
  time: number // Unix timestamp in milliseconds
  felt?: number
  intensity?: number
  tsunami: boolean
  url?: string
  status?: string
  // Additional fields that might be added by the backend for client convenience
  formattedTime?: string
  formattedDateTime?: string
}

// Seismic data response from the backend service
export interface SeismicDataResponse {
  success: boolean
  events: SeismicEvent[]
  metadata: {
    type: string
    requestedAt: string
    region: string
    dateRange: {
      start: string
      end: string
    }
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
    stats: {
      total: number
      sources: {
        usgs: number
        ovsicori: number
        rsn: number
        manual: number
      }
      magnitudeRange: {
        min: number
        max: number
        average: number
      } | null
      feltCount: number
    }
    sources: {
      usgs: string
      ovsicori: string
      rsn: string
    }
    notes: string[]
  }
}
