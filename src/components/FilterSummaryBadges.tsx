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
    locationFilter.enabled

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
            <X
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onTimeFilterChange(TimeFilter.All)}
            />
          </Badge>
        )}
        {magnitudeFilter.enabled && (
          <Badge variant="secondary">
            M {magnitudeFilter.minimum || 5.0}+
            <X
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onMagnitudeFilterChange("all")}
            />
          </Badge>
        )}
        {sourceFilter !== SourceFilter.All && (
          <Badge variant="secondary">
            {sourceFilter.toUpperCase()}
            <X
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onSourceFilterChange(SourceFilter.All)}
            />
          </Badge>
        )}
        {locationFilter.enabled && currentPosition && (
          <Badge variant="secondary">
            {t("within50km")}
            <X
              className="h-3 w-3 ml-1 cursor-pointer"
              onClick={() => onLocationFilterToggle()}
            />
          </Badge>
        )}
      </div>
    </div>
  )
}
