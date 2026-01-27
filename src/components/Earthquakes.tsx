import React, { useState, useMemo, memo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
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
  Mountain,
  Thermometer,
  TrendingUp,
  Filter,
  X,
  Navigation,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { SeismicEvent } from "../types/seismic"
import { useGeolocation } from "../hooks/use-geolocation"
import LoadingSpinner from "./Loader"
import { TimeFilter, SourceFilter } from "../types/filters"

interface EarthquakesProps {
  earthquakes: SeismicEvent[] | null
  totalCount: number
  stats: any
  currentPage: number
  itemsPerPage: number
  loading?: boolean
  onPageChange: (page: number) => void
  filters?: {
    timeFilter: TimeFilter
    magnitudeFilter: boolean
    sourceFilter: SourceFilter
    locationFilter: boolean
  }
  onFilterChange?: {
    setTimeFilter: (value: TimeFilter) => void
    setMagnitudeFilter: (value: boolean) => void
    setSourceFilter: (value: SourceFilter) => void
    setLocationFilter: (value: boolean) => void
  }
  position?: {
    latitude: number
    longitude: number
    accuracy?: number
  } | null
  requestLocation?: () => void
}

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
            new Date(earthquake.time).toLocaleString("es-CR")}
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

  // Use filter props if provided, otherwise fall back to local state for backwards compatibility
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    filters?.timeFilter || TimeFilter.All,
  )
  const [magnitudeFilter, setMagnitudeFilter] = useState(
    filters?.magnitudeFilter || false,
  )
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(
    filters?.sourceFilter || SourceFilter.All,
  )
  const [locationFilter, setLocationFilter] = useState(
    filters?.locationFilter || false,
  )

  // Sync with props when they change
  React.useEffect(() => {
    if (filters) {
      setTimeFilter(filters.timeFilter)
      setMagnitudeFilter(filters.magnitudeFilter)
      setSourceFilter(filters.sourceFilter)
      setLocationFilter(filters.locationFilter)
    }
  }, [filters])

  const geolocation = useGeolocation()
  const currentPosition = position || geolocation.position
  const currentRequestLocation = requestLocation || geolocation.requestLocation
  // const isWithinRadius = geolocation.isWithinRadius

  // Filter handlers - use props if provided, otherwise update local state
  const handleTimeFilterChange = (value: TimeFilter) => {
    if (onFilterChange?.setTimeFilter) {
      onFilterChange.setTimeFilter(value)
    } else {
      setTimeFilter(value)
    }
  }

  const handleMagnitudeFilterChange = (value: string) => {
    const newValue = value === "5+"
    if (onFilterChange?.setMagnitudeFilter) {
      onFilterChange.setMagnitudeFilter(newValue)
    } else {
      setMagnitudeFilter(newValue)
    }
  }

  const handleSourceFilterChange = (value: SourceFilter) => {
    if (onFilterChange?.setSourceFilter) {
      onFilterChange.setSourceFilter(value)
    } else {
      setSourceFilter(value)
    }
  }

  const handleLocationFilterToggle = () => {
    if (!currentPosition) {
      currentRequestLocation?.()
    }
    const newValue = !locationFilter
    if (onFilterChange?.setLocationFilter) {
      onFilterChange.setLocationFilter(newValue)
    } else {
      setLocationFilter(newValue)
    }
  }

  const clearAllFilters = () => {
    if (onFilterChange) {
      onFilterChange.setTimeFilter(TimeFilter.All)
      onFilterChange.setMagnitudeFilter(false)
      onFilterChange.setSourceFilter(SourceFilter.All)
      onFilterChange.setLocationFilter(false)
    } else {
      setTimeFilter(TimeFilter.All)
      setMagnitudeFilter(false)
      setSourceFilter(SourceFilter.All)
      setLocationFilter(false)
    }
  }

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 6) return "text-red-600"
    if (magnitude >= 4.5) return "text-orange-500"
    if (magnitude >= 3) return "text-yellow-600"
    return "text-green-600"
  }

  const getMagnitudeBadge = (magnitude: number) => {
    if (magnitude >= 6) return "destructive"
    if (magnitude >= 4.5) return "secondary"
    return "outline"
  }

  const maxMagnitude = stats?.magnitudeRange?.max || null

  // Check if we should show server-side filtered results
  const isServerSideFiltered = filters !== undefined

  // Pagination for filtered results
  const filteredTotalCount = isServerSideFiltered
    ? totalCount
    : earthquakes?.length || 0
  const totalPages = Math.ceil(filteredTotalCount / itemsPerPage)
  const displayEarthquakes = isServerSideFiltered
    ? earthquakes
    : earthquakes?.slice(0, filteredTotalCount) || []
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEarthquakes = isServerSideFiltered
    ? displayEarthquakes || []
    : (displayEarthquakes || []).slice(startIndex, startIndex + itemsPerPage)

  // Generate pagination pages with ellipsis
  const getPaginationPages = () => {
    const pages: (number | string)[] = []
    const showEllipsisThreshold = 7

    if (totalPages <= showEllipsisThreshold) {
      // Show all pages if total is small
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Always show first page
    pages.push(1)

    if (currentPage <= 4) {
      // Near the beginning
      pages.push(2, 3, 4, 5)
      pages.push("...")
    } else if (currentPage >= totalPages - 3) {
      // Near the end
      pages.push("...")
      pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1)
    } else {
      // In the middle
      pages.push("...")
      pages.push(currentPage - 1, currentPage, currentPage + 1)
      pages.push("...")
    }

    // Always show last page
    pages.push(totalPages)

    return pages
  }

  const hasActiveFilters = isServerSideFiltered
    ? filters &&
      (filters.timeFilter !== TimeFilter.All ||
        filters.magnitudeFilter ||
        filters.sourceFilter !== SourceFilter.All ||
        filters.locationFilter)
    : timeFilter !== TimeFilter.All ||
      magnitudeFilter ||
      sourceFilter !== SourceFilter.All ||
      locationFilter

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
                <div className="text-2xl font-medium">{filteredTotalCount}</div>
                <div className="text-sm text-muted-foreground">
                  {hasActiveFilters
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
            {hasActiveFilters && (
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
                value={timeFilter}
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
                value={magnitudeFilter ? "5+" : "all"}
                onValueChange={handleMagnitudeFilterChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allMagnitudes")}</SelectItem>
                  <SelectItem value="5+">M 5.0+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("source")}</label>
              <Select
                value={sourceFilter}
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
                  variant={locationFilter ? "default" : "outline"}
                  size="sm"
                  onClick={handleLocationFilterToggle}
                  className="w-full"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {currentPosition ? t("within50km") : t("enableLocation")}
                </Button>
                {locationFilter && !currentPosition && (
                  <p className="text-xs text-muted-foreground">
                    {t("locationRequired")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
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
                      onClick={() => handleTimeFilterChange(TimeFilter.All)}
                    />
                  </Badge>
                )}
                {magnitudeFilter && (
                  <Badge variant="secondary">
                    M 5.0+
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => handleMagnitudeFilterChange("all")}
                    />
                  </Badge>
                )}
                {sourceFilter !== SourceFilter.All && (
                  <Badge variant="secondary">
                    {sourceFilter.toUpperCase()}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => handleSourceFilterChange(SourceFilter.All)}
                    />
                  </Badge>
                )}
                {locationFilter && currentPosition && (
                  <Badge variant="secondary">
                    {t("within50km")}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => handleLocationFilterToggle()}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}
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
              {hasActiveFilters ? t("noFilteredResults") : t("noData")}
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
              {getPaginationPages().map((page, index) => (
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
