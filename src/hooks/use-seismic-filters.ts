"use client"

import { useState, useCallback } from "react"
import { useDebounce } from "./use-debounce"
import {
  TimeFilter,
  SourceFilter,
  SeismicFilters,
  SeismicFilterActions,
  UseSeismicFiltersReturn,
  MagnitudeFilter,
  LocationFilter,
  FilterValidationResult,
  createDefaultSeismicFilters,
} from "../types/shared"
import { SEISMIC_CONFIG } from "../config/seismic"

export function useSeismicFilters(): UseSeismicFiltersReturn {
  // Initialize with default filters
  const [filters, setFilters] = useState<SeismicFilters>(
    createDefaultSeismicFilters(),
  )

  // Debounce filter values to prevent excessive API calls
  const debouncedTimeFilter = useDebounce(
    filters.timeFilter,
    SEISMIC_CONFIG.FILTER_DEBOUNCE_DELAY,
  )
  const debouncedMagnitudeFilter = useDebounce(
    filters.magnitudeFilter,
    SEISMIC_CONFIG.FILTER_DEBOUNCE_DELAY,
  )
  const debouncedSourceFilter = useDebounce(
    filters.sourceFilter,
    SEISMIC_CONFIG.FILTER_DEBOUNCE_DELAY,
  )
  const debouncedLocationFilter = useDebounce(
    filters.locationFilter,
    SEISMIC_CONFIG.FILTER_DEBOUNCE_DELAY,
  )

  // Create debounced filters object
  const debouncedFilters: SeismicFilters = {
    timeFilter: debouncedTimeFilter,
    magnitudeFilter: debouncedMagnitudeFilter,
    sourceFilter: debouncedSourceFilter,
    locationFilter: debouncedLocationFilter,
  }

  // Filter action handlers
  const setTimeFilter = useCallback((value: TimeFilter) => {
    setFilters(prev => ({ ...prev, timeFilter: value }))
  }, [])

  const setMagnitudeFilter = useCallback((filter: MagnitudeFilter) => {
    setFilters(prev => ({ ...prev, magnitudeFilter: filter }))
  }, [])

  const setSourceFilter = useCallback((value: SourceFilter) => {
    setFilters(prev => ({ ...prev, sourceFilter: value }))
  }, [])

  const setLocationFilter = useCallback((filter: LocationFilter) => {
    setFilters(prev => ({ ...prev, locationFilter: filter }))
  }, [])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(createDefaultSeismicFilters())
  }, [])

  // Check if any filters are active
  const hasActiveFilters =
    filters.timeFilter !== TimeFilter.All ||
    filters.magnitudeFilter.enabled ||
    filters.sourceFilter !== SourceFilter.All ||
    filters.locationFilter.enabled

  // Validate current filters
  const validateFilters = useCallback((): FilterValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate magnitude filter
    if (filters.magnitudeFilter.enabled) {
      if (
        filters.magnitudeFilter.minimum !== undefined &&
        filters.magnitudeFilter.minimum < 0
      ) {
        errors.push("Minimum magnitude must be positive")
      }
      if (
        filters.magnitudeFilter.maximum !== undefined &&
        filters.magnitudeFilter.maximum < 0
      ) {
        errors.push("Maximum magnitude must be positive")
      }
      if (
        filters.magnitudeFilter.minimum !== undefined &&
        filters.magnitudeFilter.maximum !== undefined &&
        filters.magnitudeFilter.minimum > filters.magnitudeFilter.maximum
      ) {
        errors.push(
          "Minimum magnitude cannot be greater than maximum magnitude",
        )
      }
    }

    // Validate location filter
    if (filters.locationFilter.enabled) {
      if (
        filters.locationFilter.latitude !== undefined &&
        (filters.locationFilter.latitude < -90 ||
          filters.locationFilter.latitude > 90)
      ) {
        errors.push("Latitude must be between -90 and 90")
      }
      if (
        filters.locationFilter.longitude !== undefined &&
        (filters.locationFilter.longitude < -180 ||
          filters.locationFilter.longitude > 180)
      ) {
        errors.push("Longitude must be between -180 and 180")
      }
      if (
        filters.locationFilter.radiusKm !== undefined &&
        filters.locationFilter.radiusKm <= 0
      ) {
        errors.push("Radius must be positive")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }, [filters])

  const actions: SeismicFilterActions = {
    setTimeFilter,
    setMagnitudeFilter,
    setSourceFilter,
    setLocationFilter,
    clearAllFilters,
  }

  return {
    filters,
    debouncedFilters,
    actions,
    hasActiveFilters,
    validateFilters,
  }
}
