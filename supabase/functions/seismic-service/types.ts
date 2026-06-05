// Type definitions for seismic service
// Re-export from shared types for consistency with frontend

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
} from "../_shared/types"

// Import SeismicApiParams for use in type alias
import type { SeismicApiParams } from "../_shared/types"

// Legacy type alias for backward compatibility within edge function
export type FetchParams = SeismicApiParams
