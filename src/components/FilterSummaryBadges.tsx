import React from "react"
import { Badge } from "./ui/badge"
import { X } from "lucide-react"
import {
  TimeFilter,
  SourceFilter,
  MagnitudeFilter,
  LocationFilter,
} from "../types/shared"

interface FilterSummaryBadgesProps {
  timeFilter: TimeFilter
  magnitudeFilter: MagnitudeFilter
  sourceFilter: SourceFilter
  locationFilter: LocationFilter
  currentPosition?: {
    latitude: number
    longitude: number
    accuracy?: number
  } | null
  onTimeFilterChange: (value: TimeFilter) => void
  onMagnitudeFilterChange: (value: string) => void
  onSourceFilterChange: (value: SourceFilter) => void
  onLocationFilterToggle: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}

export function FilterSummaryBadges({
  timeFilter,
  magnitudeFilter,
  sourceFilter,
  locationFilter,
  currentPosition,
  onTimeFilterChange,
  onMagnitudeFilterChange,
  onSourceFilterChange,
  onLocationFilterToggle,
  t,
}: FilterSummaryBadgesProps) {
  const hasActiveFilters =
    timeFilter !== TimeFilter.All ||
    magnitudeFilter.enabled ||
    sourceFilter !== SourceFilter.All ||
    (locationFilter.enabled && currentPosition)

  if (!hasActiveFilters) {
    return null
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex flex-wrap gap-2">
        {timeFilter !== TimeFilter.All && (
          <Badge variant="secondary">
            {timeFilter === TimeFilter.Last24Hours && t("24h")}
            {timeFilter === TimeFilter.Last3Days && t("3d")}
            {timeFilter === TimeFilter.Week && t("week")}
            {timeFilter === TimeFilter.Month && t("month")}
            <button
              type="button"
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onTimeFilterChange(TimeFilter.All)}
              aria-label="Remove time filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {magnitudeFilter.enabled && (
          <Badge variant="secondary">
            M {magnitudeFilter.minimum || 5.0}+
            <button
              type="button"
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onMagnitudeFilterChange("all")}
              aria-label="Remove magnitude filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {sourceFilter !== SourceFilter.All && (
          <Badge variant="secondary">
            {sourceFilter.toUpperCase()}
            <button
              type="button"
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onSourceFilterChange(SourceFilter.All)}
              aria-label="Remove source filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {locationFilter.enabled && currentPosition && (
          <Badge variant="secondary">
            {t("within50km")}
            <button
              type="button"
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onLocationFilterToggle()}
              aria-label="Remove location filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  )
}
