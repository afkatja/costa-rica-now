/**
 * API Response Adapters
 * Implements adapter pattern to decouple components from specific API response structures
 */

import { SeismicEvent, SeismicSource } from "../types/seismic"
import { Volcano, AlertLevel } from "../types/volcano"
import { NetworkError, ValidationError } from "../utils/error-handling"

// =============================================================================
// BASE ADAPTER INTERFACE
// =============================================================================

export interface ApiResponseAdapter<T, R> {
  transform(data: T): R
  validate(data: unknown): data is T
  getErrorMessage(error: unknown): string
}

// =============================================================================
// SEISMIC DATA ADAPTERS
// =============================================================================

// Raw API response types (these can change without affecting components)
interface RawSeismicEvent {
  id: string
  time: number | string
  latitude: number
  longitude: number
  depth?: number | null
  magnitude: number
  location: string
  source: SeismicSource
  url?: string
  status?: string
  felt?: number
  formattedDateTime?: string
  formattedTime?: string
}

interface RawSeismicResponse {
  success: boolean
  data?: RawSeismicEvent[]
  error?: string
  totalCount?: number
  stats?: {
    magnitudeRange?: { min: number; max: number }
    feltCount?: number
  }
}

export class SeismicEventAdapter implements ApiResponseAdapter<
  RawSeismicEvent,
  SeismicEvent
> {
  transform(raw: RawSeismicEvent): SeismicEvent {
    return {
      id: raw.id,
      time:
        typeof raw.time === "string" ? new Date(raw.time).getTime() : raw.time,
      lat: raw.latitude,
      lon: raw.longitude,
      depth: raw.depth ?? null,
      magnitude: raw.magnitude,
      location: raw.location,
      source: raw.source,
      url: raw.url,
      status: raw.status,
      felt: raw.felt,
      formattedDateTime: raw.formattedDateTime,
      formattedTime: raw.formattedTime,
      tsunami: false, // Default value, can be updated if needed
    }
  }

  validate(data: unknown): data is RawSeismicEvent {
    if (!data || typeof data !== "object") return false

    const raw = data as any
    return (
      typeof raw.id === "string" &&
      (typeof raw.time === "number" || typeof raw.time === "string") &&
      typeof raw.latitude === "number" &&
      typeof raw.longitude === "number" &&
      typeof raw.magnitude === "number" &&
      typeof raw.location === "string" &&
      typeof raw.source === "string"
    )
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof NetworkError) {
      return "Failed to fetch seismic data. Please check your connection."
    }
    if (error instanceof ValidationError) {
      return "Invalid seismic data received."
    }
    if (error instanceof Error) {
      return `Seismic data error: ${error.message}`
    }
    return "Unknown error occurred while fetching seismic data."
  }
}

export class SeismicResponseAdapter implements ApiResponseAdapter<
  RawSeismicResponse,
  { events: SeismicEvent[]; totalCount: number; stats?: any }
> {
  private eventAdapter = new SeismicEventAdapter()

  transform(raw: RawSeismicResponse): {
    events: SeismicEvent[]
    totalCount: number
    stats?: any
  } {
    if (!raw.success || !raw.data) {
      throw new Error(raw.error || "Failed to fetch seismic data")
    }

    const events = raw.data.map(event => this.eventAdapter.transform(event))

    return {
      events,
      totalCount: raw.totalCount || events.length,
      stats: raw.stats,
    }
  }

  validate(data: unknown): data is RawSeismicResponse {
    if (!data || typeof data !== "object") return false

    const raw = data as any
    return (
      typeof raw.success === "boolean" &&
      (raw.success ? Array.isArray(raw.data) : true)
    )
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof NetworkError) {
      return "Failed to fetch seismic data. Please check your connection."
    }
    if (error instanceof ValidationError) {
      return "Invalid seismic data received."
    }
    if (error instanceof Error) {
      return `Seismic data error: ${error.message}`
    }
    return "Unknown error occurred while fetching seismic data."
  }
}

// =============================================================================
// VOLCANIC DATA ADAPTERS
// =============================================================================

interface RawVolcano {
  id: string
  name: string
  latitude: number
  longitude: number
  alertLevel?: AlertLevel
  lastActivity?: string
  description?: string
  url?: string
  details?: Record<string, string>
  subDetails?: Record<string, string>
  history?: Array<{ date: string; details: string; power: string }>
  computedStatus?: string
  computedEruptionTime?: string
  elevation?: string
}

interface RawVolcanicResponse {
  success: boolean
  volcanoes?: RawVolcano[]
  error?: string
}

export class VolcanoAdapter implements ApiResponseAdapter<RawVolcano, Volcano> {
  transform(raw: RawVolcano): Volcano {
    return {
      id: raw.id,
      name: raw.name,
      lat: raw.latitude,
      lng: raw.longitude,
      url: raw.url || "",
      details: raw.details || {},
      subDetails: raw.subDetails || {},
      history: raw.history || [],
      alertLevel: raw.alertLevel,
      computedStatus: raw.computedStatus as any,
      computedEruptionTime: raw.computedEruptionTime,
      elevation: raw.elevation,
    }
  }

  validate(data: unknown): data is RawVolcano {
    if (!data || typeof data !== "object") return false

    const raw = data as any
    return (
      typeof raw.id === "string" &&
      typeof raw.name === "string" &&
      typeof raw.latitude === "number" &&
      typeof raw.longitude === "number"
    )
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof NetworkError) {
      return "Failed to fetch volcanic data. Please check your connection."
    }
    if (error instanceof ValidationError) {
      return "Invalid volcanic data received."
    }
    if (error instanceof Error) {
      return `Volcanic data error: ${error.message}`
    }
    return "Unknown error occurred while fetching volcanic data."
  }
}

export class VolcanicResponseAdapter implements ApiResponseAdapter<
  RawVolcanicResponse,
  Volcano[]
> {
  private volcanoAdapter = new VolcanoAdapter()

  transform(raw: RawVolcanicResponse): Volcano[] {
    if (!raw.success || !raw.volcanoes) {
      throw new Error(raw.error || "Failed to fetch volcanic data")
    }

    return raw.volcanoes.map(volcano => this.volcanoAdapter.transform(volcano))
  }

  validate(data: unknown): data is RawVolcanicResponse {
    if (!data || typeof data !== "object") return false

    const raw = data as any
    return (
      typeof raw.success === "boolean" &&
      (raw.success ? Array.isArray(raw.volcanoes) : true)
    )
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof NetworkError) {
      return "Failed to fetch volcanic data. Please check your connection."
    }
    if (error instanceof ValidationError) {
      return "Invalid volcanic data received."
    }
    if (error instanceof Error) {
      return `Volcanic data error: ${error.message}`
    }
    return "Unknown error occurred while fetching volcanic data."
  }
}

// =============================================================================
// WEATHER DATA ADAPTERS
// =============================================================================

interface RawWeatherData {
  location: string
  temperature: number
  humidity: number
  windSpeed: number
  description: string
  timestamp: number
}

export class WeatherDataAdapter implements ApiResponseAdapter<
  RawWeatherData,
  RawWeatherData
> {
  transform(raw: RawWeatherData): RawWeatherData {
    return {
      ...raw,
      timestamp:
        typeof raw.timestamp === "string"
          ? new Date(raw.timestamp).getTime()
          : raw.timestamp,
    }
  }

  validate(data: unknown): data is RawWeatherData {
    if (!data || typeof data !== "object") return false

    const raw = data as any
    return (
      typeof raw.location === "string" &&
      typeof raw.temperature === "number" &&
      typeof raw.humidity === "number" &&
      typeof raw.windSpeed === "number" &&
      typeof raw.description === "string" &&
      (typeof raw.timestamp === "number" || typeof raw.timestamp === "string")
    )
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof NetworkError) {
      return "Failed to fetch weather data. Please check your connection."
    }
    if (error instanceof ValidationError) {
      return "Invalid weather data received."
    }
    if (error instanceof Error) {
      return `Weather data error: ${error.message}`
    }
    return "Unknown error occurred while fetching weather data."
  }
}

// =============================================================================
// GENERIC ADAPTER FACTORY
// =============================================================================

export class ApiResponseAdapterFactory {
  static createSeismicAdapter(): SeismicResponseAdapter {
    return new SeismicResponseAdapter()
  }

  static createVolcanicAdapter(): VolcanicResponseAdapter {
    return new VolcanicResponseAdapter()
  }

  static createWeatherAdapter(): WeatherDataAdapter {
    return new WeatherDataAdapter()
  }
}

// =============================================================================
// SAFE API RESPONSE HANDLER
// =============================================================================

export async function safeApiResponse<T, R>(
  apiCall: () => Promise<T>,
  adapter: ApiResponseAdapter<T, R>,
): Promise<R> {
  try {
    const response = await apiCall()

    if (!adapter.validate(response)) {
      throw new ValidationError("Invalid API response structure")
    }

    return adapter.transform(response)
  } catch (error) {
    const message = adapter.getErrorMessage(error)
    throw new Error(message)
  }
}
