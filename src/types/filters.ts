// Re-export filter enums from shared types for backward compatibility
// These enums provide iteration and type safety for filter options
export { TimeFilter, SourceFilter } from "./shared"

// Additional filter-specific types that extend the shared types
export type {
  SeismicFilters,
  MagnitudeFilter,
  LocationFilter,
  SeismicFilterActions,
  FilterValidationResult,
} from "./shared"
