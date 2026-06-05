/**
 * Shared types for Supabase Edge Functions
 * Re-exports from frontend shared types for consistency
 */

// Re-export all seismic types from the frontend shared types
export type {
  SeismicEvent,
  SeismicSource,
  SeismicApiParams,
  SeismicDataResponse,
  SeismicErrorResponse,
  SeismicApiResponse,
  SeismicResponseMetadata,
  SeismicEventStats,
  ValidationResult,
  DateValidationResult,
  GeographicBounds,
  SeismicServiceConfig,
} from "../../../src/types/shared.ts"

// Edge function specific types
export interface EdgeFunctionRequest<T = any> {
  method: string
  headers: Record<string, string>
  body?: T
  url: string
}

export interface EdgeFunctionResponse<T = any> {
  status: number
  headers: Record<string, string>
  body?: T
}

export interface CorsHeaders {
  "Access-Control-Allow-Origin": string
  "Access-Control-Allow-Headers": string
  "Access-Control-Allow-Methods": string
  "Access-Control-Max-Age": string
}

// API endpoint configurations
export interface ApiEndpointConfig {
  url: string
  timeout: number
  retryAttempts: number
  headers: Record<string, string>
}

// Source fetch results
export interface SourceFetchResult {
  source: string
  status: "success" | "failed" | "partial"
  count: number
  error?: string
  duration?: number
}

// Fetch statistics
export interface FetchStatistics {
  total: number
  sources: Record<string, number>
  duration: number
  errors: string[]
  warnings: string[]
}
