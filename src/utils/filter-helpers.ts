import { MAGNITUDE_THRESHOLDS } from "../constants/seismic"
import { SEISMIC_CONFIG } from "../config/seismic"
import {
  TimeFilter,
  SourceFilter,
  MagnitudeFilter,
  LocationFilter,
} from "../types/shared"
import { ValidationError, handleAsyncError } from "./error-handling"

/**
 * Check if any filters are currently active
 * Simplifies complex conditional logic for filter state checking
 */
export function hasActiveFilters(filters: {
  timeFilter: TimeFilter
  magnitudeFilter: MagnitudeFilter
  sourceFilter: SourceFilter
  locationFilter: LocationFilter
}): boolean {
  return (
    filters.timeFilter !== TimeFilter.All ||
    filters.magnitudeFilter.enabled ||
    filters.sourceFilter !== SourceFilter.All ||
    filters.locationFilter.enabled
  )
}

/**
 * Create a magnitude filter from a string value
 * Simplifies the magnitude filter creation logic
 */
export function createMagnitudeFilter(value: string): MagnitudeFilter {
  const enabled = value === SEISMIC_CONFIG.MAGNITUDE_FILTER_VALUE
  return {
    enabled,
    minimum: enabled ? MAGNITUDE_THRESHOLDS.FILTER_MINIMUM : undefined,
  }
}

/**
 * Create a location filter with proper validation
 * Standardizes location filter creation and error handling
 */
export function createLocationFilter(
  enabled: boolean,
  currentPosition: { latitude: number; longitude: number } | null,
  radiusKm: number = 50,
): LocationFilter {
  if (!enabled) {
    return {
      enabled: false,
      radiusKm,
    }
  }

  if (!currentPosition) {
    // Return disabled filter if no position is available
    return {
      enabled: false,
      radiusKm,
    }
  }

  // Validate coordinates
  if (currentPosition.latitude < -90 || currentPosition.latitude > 90) {
    throw new ValidationError("Invalid latitude value")
  }
  if (currentPosition.longitude < -180 || currentPosition.longitude > 180) {
    throw new ValidationError("Invalid longitude value")
  }
  if (radiusKm <= 0) {
    throw new ValidationError("Radius must be positive")
  }

  return {
    enabled: true,
    latitude: currentPosition.latitude,
    longitude: currentPosition.longitude,
    radiusKm,
  }
}

/**
 * Safe filter operation wrapper
 * Uses standardized error handling for filter operations
 */
export function safeFilterOperation<T>(
  operation: () => T,
  fallback: T,
  errorMessage?: string,
): T {
  try {
    return operation()
  } catch (error) {
    console.error(errorMessage || "Filter operation failed:", error)
    return fallback
  }
}

/**
 * Async safe filter operation wrapper
 * For async filter operations with standardized error handling
 */
export function safeAsyncFilterOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage?: string,
): Promise<T> {
  return handleAsyncError(operation, {
    fallback,
    context: errorMessage || "Filter operation",
  })
}
