/**
 * Shared types for frontend and edge function communication
 * Consolidates common interfaces and provides stricter typing
 */

import { DISTANCE_THRESHOLDS, MAGNITUDE_THRESHOLDS } from "../constants/seismic"

// =============================================================================
// SOURCE TYPES
// =============================================================================

/** Valid seismic data sources */
export type SeismicSource = "rsn" | "usgs" | "ovsicori" | "manual"

/** Source priority configuration for deduplication */
export const SOURCE_PRIORITY: Record<SeismicSource, number> = {
  usgs: 3,
  rsn: 2,
  ovsicori: 1,
  manual: 0,
} as const

// =============================================================================
// FILTER TYPES
// =============================================================================

/** Time filter options with strict typing */
export enum TimeFilter {
  All = "allTime",
  Last24Hours = "24h",
  Last3Days = "3d",
  Week = "week",
  Month = "month",
}

/** Source filter options with strict typing */
export enum SourceFilter {
  All = "allSources",
  USGS = "usgs",
  OVSICORI = "ovsicori",
  RSN = "rsn",
  Manual = "manual",
}

/** Magnitude filter configuration */
export interface MagnitudeFilter {
  enabled: boolean
  minimum?: number
  maximum?: number
}

/** Location filter configuration */
export interface LocationFilter {
  enabled: boolean
  latitude?: number
  longitude?: number
  radiusKm?: number
}

/** Complete filter configuration with strict typing */
export interface SeismicFilters {
  timeFilter: TimeFilter
  magnitudeFilter: MagnitudeFilter
  sourceFilter: SourceFilter
  locationFilter: LocationFilter
}

/** Filter actions interface */
export interface SeismicFilterActions {
  setTimeFilter: (value: TimeFilter) => void
  setMagnitudeFilter: (filter: MagnitudeFilter) => void
  setSourceFilter: (value: SourceFilter) => void
  setLocationFilter: (filter: LocationFilter) => void
  clearAllFilters: () => void
}

/** Filter validation result */
export interface FilterValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// =============================================================================
// SEISMIC EVENT TYPES
// =============================================================================

/** Core seismic event structure */
export interface SeismicEvent {
  id: string
  source: SeismicSource
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
  // Client-side formatted fields
  formattedTime?: string
  formattedDateTime?: string
}

/** Seismic event creation payload */
export interface CreateSeismicEventPayload {
  source: SeismicSource
  magnitude: number
  location: string
  lat: number
  lon: number
  depth?: number
  time: number
  felt?: number
  intensity?: number
  tsunami?: boolean
  url?: string
  status?: string
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/** API request parameters with strict validation */
export interface SeismicApiParams {
  /** Request type - currently only 'earthquake' supported */
  type: "earthquake"
  /** Date range in ISO format: YYYY-MM-DD */
  startDate: string
  /** Date range in ISO format: YYYY-MM-DD */
  endDate: string
  /** Optional magnitude range filter */
  minMagnitude?: number
  maxMagnitude?: number
  /** Optional source filter */
  source?: SeismicSource
  /** Optional location-based filtering */
  lat?: number
  lon?: number
  radiusKm?: number
  /** Pagination parameters */
  limit?: number
  offset?: number
}

/** API response metadata */
export interface SeismicResponseMetadata {
  type: string
  requestedAt: string
  region: string
  dateRange: {
    start: string
    end: string
    adjustedStart?: string
  }
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  stats: SeismicEventStats
  sources: {
    usgs: "success" | "failed" | "partial"
    ovsicori: "success" | "failed" | "partial"
    rsn: "success" | "failed" | "partial"
  }
  notes: string[]
}

/** Seismic event statistics */
export interface SeismicEventStats {
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

/** Success API response */
export interface SeismicDataResponse {
  success: true
  events: SeismicEvent[]
  metadata: SeismicResponseMetadata
}

/** Error API response */
export interface SeismicErrorResponse {
  success: false
  error: string
  details?: Record<string, any>
}

/** Union type for all possible API responses */
export type SeismicApiResponse = SeismicDataResponse | SeismicErrorResponse

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/** Pagination configuration */
export interface PaginationConfig {
  currentPage: number
  itemsPerPage: number
  totalCount: number
}

/** Pagination calculation result */
export interface PaginationResult {
  totalPages: number
  startIndex: number
  endIndex: number
  paginationPages: (number | string)[][]
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/** Type guard for successful API responses */
export function isSuccessResponse(
  response: SeismicApiResponse,
): response is SeismicDataResponse {
  return response.success === true
}

/** Type guard for error responses */
export function isErrorResponse(
  response: SeismicApiResponse,
): response is SeismicErrorResponse {
  return response.success === false
}

/** Extract event type from source */
export type EventFromSource<T extends SeismicSource> = SeismicEvent & {
  source: T
}

/** Filter events by source type */
export type FilterEventsBySource<T extends SeismicSource> = SeismicEvent & {
  source: T
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/** Parameter validation result */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/** Validation error */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/** Validation warning */
export interface ValidationWarning {
  field: string
  message: string
  code: string
}

/** Date validation result */
export interface DateValidationResult {
  valid: boolean
  date?: Date
  errors: string[]
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/** Seismic service configuration */
export interface SeismicServiceConfig {
  timeoutMs: number
  retryAttempts: number
  retryDelayMs: number
  deduplicationThresholds: {
    timeMs: number
    distanceKm: number
    magnitudeDiff: number
  }
  magnitudeFilters: {
    usgsMin: number
    ovsicoriMin: number
    rsnMin: number
  }
  pagination: {
    defaultLimit: number
    defaultOffset: number
    maxLimit: number
  }
}

/** Costa Rica geographic bounds */
export interface GeographicBounds {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

// =============================================================================
// HOOK TYPES
// =============================================================================

/** Return type for useSeismicFilters hook */
export interface UseSeismicFiltersReturn {
  filters: SeismicFilters
  debouncedFilters: SeismicFilters
  actions: SeismicFilterActions
  hasActiveFilters: boolean
  validateFilters: () => FilterValidationResult
}

/** Return type for usePagination hook */
export interface UsePaginationReturn {
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  paginationPages: (number | string)[][]
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  canGoNext: boolean
  canGoPrev: boolean
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

/** Props for Earthquakes component */
export interface EarthquakesProps {
  earthquakes: SeismicEvent[] | null
  totalCount: number
  stats: SeismicEventStats
  currentPage: number
  itemsPerPage: number
  loading?: boolean
  onPageChange: (page: number) => void
  filters: SeismicFilters
  onFilterChange: SeismicFilterActions
  position?: {
    latitude: number
    longitude: number
    accuracy?: number
  } | null
  requestLocation?: () => void
}

/** Props for individual earthquake item */
export interface EarthquakeItemProps {
  earthquake: SeismicEvent
  getMagnitudeColor: (magnitude: number) => string
  getMagnitudeBadge: (
    magnitude: number,
  ) => "default" | "secondary" | "destructive" | "outline"
  t: (key: string, values?: Record<string, string | number>) => string
}

// =============================================================================
// TYPE EXPORTS FOR EDGE FUNCTIONS
// =============================================================================

/** Types that should be available to edge functions */
export type EdgeFunctionTypes = {
  SeismicEvent: SeismicEvent
  SeismicSource: SeismicSource
  SeismicApiParams: SeismicApiParams
  SeismicDataResponse: SeismicDataResponse
  SeismicErrorResponse: SeismicErrorResponse
  SeismicApiResponse: SeismicApiResponse
  ValidationResult: ValidationResult
  DateValidationResult: DateValidationResult
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Create default magnitude filter */
export function createDefaultMagnitudeFilter(): MagnitudeFilter {
  return {
    enabled: false,
    minimum: MAGNITUDE_THRESHOLDS.FILTER_MINIMUM,
  }
}

/** Create default location filter */
export function createDefaultLocationFilter(): LocationFilter {
  return {
    enabled: false,
    radiusKm: DISTANCE_THRESHOLDS.DEFAULT_RADIUS,
  }
}

/** Create default seismic filters */
export function createDefaultSeismicFilters(): SeismicFilters {
  return {
    timeFilter: TimeFilter.All,
    magnitudeFilter: createDefaultMagnitudeFilter(),
    sourceFilter: SourceFilter.All,
    locationFilter: createDefaultLocationFilter(),
  }
}

/** Validate seismic event data */
export function validateSeismicEvent(
  event: Partial<SeismicEvent>,
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!event.id || typeof event.id !== "string") {
    errors.push({ field: "id", message: "Valid ID required", code: "REQUIRED" })
  }

  if (
    !event.source ||
    !["rsn", "usgs", "ovsicori", "manual"].includes(event.source)
  ) {
    errors.push({
      field: "source",
      message: "Valid source required",
      code: "INVALID_ENUM",
    })
  }

  if (typeof event.magnitude !== "number" || event.magnitude < 0) {
    errors.push({
      field: "magnitude",
      message: "Valid magnitude required",
      code: "INVALID_NUMBER",
    })
  }

  if (typeof event.lat !== "number" || event.lat < -90 || event.lat > 90) {
    errors.push({
      field: "lat",
      message: "Valid latitude required",
      code: "INVALID_RANGE",
    })
  }

  if (typeof event.lon !== "number" || event.lon < -180 || event.lon > 180) {
    errors.push({
      field: "lon",
      message: "Valid longitude required",
      code: "INVALID_RANGE",
    })
  }

  if (
    event.depth !== null &&
    (typeof event.depth !== "number" || event.depth < 0)
  ) {
    errors.push({
      field: "depth",
      message: "Valid depth required or null",
      code: "INVALID_NUMBER",
    })
  }

  if (!event.time || typeof event.time !== "number") {
    errors.push({
      field: "time",
      message: "Valid timestamp required",
      code: "REQUIRED",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
