// Volcano data types to reinforce the contract between server and client

export interface VolcanoEruptionEvent {
  date: string
  details: string
  power: string
}

export interface VolcanoDetails {
  [key: string]: string
}

export interface VolcanoSubDetails {
  [key: string]: string
}

export interface Volcano {
  id: string // Using string to match server implementation
  name: string
  url: string
  details: VolcanoDetails
  subDetails: VolcanoSubDetails
  history: VolcanoEruptionEvent[]
}

export interface VolcanoesResponse {
  success: boolean
  volcanoes: Volcano[]
  metadata: {
    requestedAt: string
    source: string
  }
}

export interface VolcanoesRequest {
  country?: string
  timeCode?: string
}

// Status types for volcano activity
export type VolcanoStatus = "Activo" | "Durmiente" | "Extinto"

// Time eruption codes
export type EruptionTimeCode = "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7"

// Eruption time code mappings
export const ERUPTION_TIME_CODES: Record<
  string,
  { label: string; range: string }
> = {
  D1: { label: "Historical", range: ">= 1964" },
  D2: { label: "Historical", range: "1900 - 1963" },
  D3: { label: "Historical", range: "1800 - 1899" },
  D4: { label: "Historical", range: "1700 - 1799" },
  D5: { label: "Historical", range: "1500 - 1699" },
  D6: { label: "Historical", range: "1 - 1499" },
  D7: { label: "Holocene", range: "Holocene" },
}
