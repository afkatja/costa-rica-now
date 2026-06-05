// Re-export seismic types from shared types for backward compatibility
// This ensures all components use the same type definitions
export type {
  SeismicEvent,
  SeismicSource,
  SeismicDataResponse,
  SeismicErrorResponse,
  SeismicApiResponse,
  SeismicResponseMetadata,
  SeismicEventStats,
  SeismicApiParams,
  ValidationResult,
  DateValidationResult,
} from "./shared"

// Legacy exports for backward compatibility - these are now available from shared types
// Keeping these exports to avoid breaking existing imports
export type {
  SeismicEvent as LegacySeismicEvent,
  SeismicDataResponse as LegacySeismicDataResponse,
} from "./shared"
