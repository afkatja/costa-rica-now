import React, { memo } from "react"
import { TabsContent } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Button } from "./ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination"

import {
  Activity,
  MapPin,
  Clock,
  AlertTriangle,
  TrendingUp,
  Filter,
  X,
  Navigation,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { SeismicEvent } from "../types/seismic"
import { useGeolocation } from "../hooks/use-geolocation"
import { usePagination } from "../hooks/use-pagination"
import LoadingSpinner from "./Loader"
import { FilterSummaryBadges } from "./FilterSummaryBadges"
import {
  EarthquakesProps as SharedEarthquakesProps,
  TimeFilter,
  SourceFilter,
} from "../types/shared"
import { DISTANCE_THRESHOLDS, MAGNITUDE_THRESHOLDS } from "../constants/seismic"
import { SEISMIC_CONFIG } from "../config/seismic"
import {
  hasActiveFilters,
  createMagnitudeFilter,
  createLocationFilter,
  safeFilterOperation,
} from "../utils/filter-helpers"
import { formatDateTime } from "../utils/date-formatter"

// Use the shared EarthquakesProps interface
type EarthquakesProps = SharedEarthquakesProps

// Memoized individual earthquake item to prevent unnecessary re-renders
interface EarthquakeItemProps {
  earthquake: SeismicEvent
  getMagnitudeColor: (magnitude: number) => string
  getMagnitudeBadge: (
    magnitude: number,
  ) => "default" | "secondary" | "destructive" | "outline"
  t: (key: string, values?: Record<string, string | number>) => string
}

const EarthquakeItem = memo(function EarthquakeItem({
  earthquake,
  getMagnitudeColor,
  getMagnitudeBadge,
  t,
}: EarthquakeItemProps) {
  return (
    <div key={earthquake.id} className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={getMagnitudeBadge(earthquake.magnitude)}
            className={getMagnitudeColor(earthquake.magnitude)}
          >
            M {earthquake.magnitude}
          </Badge>
          {earthquake.felt && earthquake.felt > 0 && (
            <Badge variant="outline" className="text-xs">
              {t("felt")} {earthquake.felt}
            </Badge>
          )}
        </div>
        {earthquake.url && (
          <div className="text-sm text-muted-foreground">
            <a
              href={earthquake.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {t("source")}: {earthquake.source}
            </a>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {earthquake.location}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {earthquake.formattedDateTime ||
            earthquake.formattedTime ||
            formatDateTime(earthquake.time)}
        </div>
        <div className="text-sm text-muted-foreground">
          {t("depth")}:{" "}
          {earthquake.depth ? `${earthquake.depth} km` : t("unknown")}
        </div>
        {earthquake.status && (
          <div className="text-sm text-muted-foreground">
            {t("status")}: {earthquake.status}
          </div>
        )}
      </div>
    </div>
  )
})

const Earthquakes = ({
  earthquakes,
  totalCount,
  stats,
  currentPage,
  itemsPerPage,
  loading = false,
  onPageChange,
  filters,
  onFilterChange,
  position,
  requestLocation,
}: EarthquakesProps) => {
  const t = useTranslations("Earthquakes")

  const geolocation = useGeolocation()
  const currentPosition = position || geolocation.position
  const currentRequestLocation = requestLocation || geolocation.requestLocation

  // Filter handlers
  const handleTimeFilterChange = (value: TimeFilter) => {
    onFilterChange.setTimeFilter(value)
  }

  const handleMagnitudeFilterChange = (value: string) => {
    const filter = safeFilterOperation(
      () => createMagnitudeFilter(value),
      { enabled: false, minimum: undefined },
      "Failed to create magnitude filter",
    )
    onFilterChange.setMagnitudeFilter(filter)
  }

  const handleSourceFilterChange = (value: SourceFilter) => {
    onFilterChange.setSourceFilter(value)
  }

  const handleLocationFilterToggle = () => {
    if (!currentPosition) {
      currentRequestLocation?.()
    }

    const filter = safeFilterOperation(
      () =>
        createLocationFilter(
          !filters.locationFilter.enabled,
          currentPosition,
          DISTANCE_THRESHOLDS.DEFAULT_RADIUS,
        ),
      { enabled: false, radiusKm: DISTANCE_THRESHOLDS.DEFAULT_RADIUS },
      "Failed to create location filter",
    )

    onFilterChange.setLocationFilter(filter)
  }

  const clearAllFilters = () => {
    onFilterChange.clearAllFilters()
  }

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= MAGNITUDE_THRESHOLDS.SIGNIFICANT) return "text-gray-100"
    if (magnitude >= MAGNITUDE_THRESHOLDS.MODERATE) return "text-orange-500"
    if (magnitude >= MAGNITUDE_THRESHOLDS.LIGHT) return "text-yellow-600"
    return "text-green-600"
  }

  const getMagnitudeBadge = (magnitude: number) => {
    if (magnitude >= MAGNITUDE_THRESHOLDS.SIGNIFICANT) return "destructive"
    if (magnitude >= MAGNITUDE_THRESHOLDS.MODERATE) return "secondary"
    return "outline"
  }

  const maxMagnitude = stats?.magnitudeRange?.max || null

  // Use pagination hook
  const { totalPages, startIndex, endIndex, paginationPages } = usePagination({
    currentPage,
    totalCount,
    itemsPerPage,
  })

  // Get paginated earthquakes for current page
  const paginatedEarthquakes = earthquakes?.slice(startIndex, endIndex) || []

  // Check if any filters are active using helper function
  const hasActiveFiltersValue = hasActiveFilters(filters)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" className="text-primary" />
        <span className="ml-2 text-muted-foreground">{t("loading")}</span>
      </div>
    )
  }

  if (!earthquakes)
    return (
      <TabsContent value="earthquakes" className="space-y-y">
        {t("noData")}
      </TabsContent>
    )

  return (
    <>
      {/* Earthquakes Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-medium">{totalCount}</div>
                <div className="text-sm text-muted-foreground">
                  {hasActiveFiltersValue
                    ? t("filteredResults")
                    : t("earthquakesLast7Days")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-medium">
                  {maxMagnitude ? `M ${maxMagnitude}` : t("na")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("maximumMagnitude")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-medium">
                  {stats?.feltCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">{t("felt")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t("filters")}
            </CardTitle>
            {hasActiveFiltersValue && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                {t("clearFilters")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("timePeriod")}</label>
              <Select
                value={filters.timeFilter}
                onValueChange={handleTimeFilterChange}
                defaultValue={TimeFilter.All}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TimeFilter).map(value => (
                    <SelectItem key={value} value={value}>
                      {t(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Magnitude Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("minimumMagnitude")}
              </label>
              <Select
                value={
                  filters.magnitudeFilter
                    ? SEISMIC_CONFIG.MAGNITUDE_FILTER_VALUE
                    : "all"
                }
                onValueChange={handleMagnitudeFilterChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allMagnitudes")}</SelectItem>
                  <SelectItem value={SEISMIC_CONFIG.MAGNITUDE_FILTER_VALUE}>
                    M {SEISMIC_CONFIG.MIN_MAGNITUDE_FILTER}.0+
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("source")}</label>
              <Select
                value={filters.sourceFilter}
                onValueChange={handleSourceFilterChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allSources")}</SelectItem>
                  <SelectItem value="usgs">USGS</SelectItem>
                  <SelectItem value="ovsicori">OVSICORI</SelectItem>
                  <SelectItem value="rsn">RSN</SelectItem>
                  <SelectItem value="manual">{t("manual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("nearby")}</label>
              <div className="space-y-2">
                <Button
                  variant={filters.locationFilter ? "default" : "outline"}
                  size="sm"
                  onClick={handleLocationFilterToggle}
                  className="w-full"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {currentPosition ? t("within50km") : t("enableLocation")}
                </Button>
                {filters.locationFilter && !currentPosition && (
                  <p className="text-xs text-muted-foreground">
                    {t("locationRequired")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          <FilterSummaryBadges
            timeFilter={filters.timeFilter}
            magnitudeFilter={filters.magnitudeFilter}
            sourceFilter={filters.sourceFilter}
            locationFilter={filters.locationFilter}
            currentPosition={currentPosition}
            onTimeFilterChange={handleTimeFilterChange}
            onMagnitudeFilterChange={handleMagnitudeFilterChange}
            onSourceFilterChange={handleSourceFilterChange}
            onLocationFilterToggle={handleLocationFilterToggle}
            t={t}
          />
        </CardContent>
      </Card>

      {/* Recent Earthquakes */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentEarthquakes")}</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedEarthquakes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFiltersValue ? t("noFilteredResults") : t("noData")}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedEarthquakes?.map((earthquake: SeismicEvent) => (
                <EarthquakeItem
                  key={earthquake.id}
                  earthquake={earthquake}
                  getMagnitudeColor={getMagnitudeColor}
                  getMagnitudeBadge={getMagnitudeBadge}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              {paginationPages.map((page, index) => (
                <PaginationItem key={index}>
                  {page === "..." ? (
                    <span className="px-3 py-2 text-muted-foreground">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => onPageChange(page as number)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}

export default Earthquakes
