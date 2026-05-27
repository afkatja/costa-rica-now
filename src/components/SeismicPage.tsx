"use client"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Activity, Mountain } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "../utils/supabase/client"
import { useGeolocation } from "../hooks/use-geolocation"
import { useSeismicFilters } from "../hooks/use-seismic-filters"
import { useTranslations } from "next-intl"
import {
  TimeFilter,
  SourceFilter,
  MagnitudeFilter,
  LocationFilter,
} from "../types/shared"
import { Volcano, VolcanoesResponse } from "../types/volcano"
import useSWR from "swr"
import { SEISMIC_CONFIG } from "../config/seismic"
import { DISTANCE_THRESHOLDS } from "../constants/seismic"
import { SeismicHeader } from "./SeismicHeader"
import { EarthquakesTab } from "./EarthquakesTab"
import { VolcanoesTab } from "./VolcanoesTab"

export function SeismicPage() {
  const t = useTranslations("SeismicPage")
  const [currentPage, setCurrentPage] = useState(1)
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([])
  const [volcanoLoading, setVolcanoLoading] = useState(false)
  const [volcanoError, setVolcanoError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"earthquakes" | "volcanoes">(
    "earthquakes",
  )

  // Use custom hook for filter management
  const { filters, debouncedFilters, actions } = useSeismicFilters()

  const {
    position,
    loading: geoLoading,
    error: geoError,
    requestLocation,
  } = useGeolocation()

  // Request location permission on mount
  useEffect(() => {
    if (!position && !geoLoading && !geoError) {
      requestLocation()
    }
  }, [position, geoLoading, geoError, requestLocation])

  // SWR fetcher for seismic data
  const fetchSeismic = async (key: string) => {
    const [, page, filters] = JSON.parse(key) as [
      string,
      number,
      {
        timeFilter?: TimeFilter
        magnitudeFilter?: boolean
        sourceFilter?: SourceFilter
        locationFilter?: boolean
        latitude?: number
        longitude?: number
      },
    ]
    const offset = (page - 1) * SEISMIC_CONFIG.ITEMS_PER_PAGE
    const now = new Date()
    const timeRanges: Partial<Record<TimeFilter, number>> = {
      [TimeFilter.Last24Hours]: SEISMIC_CONFIG.TIME_RANGES.LAST_24_HOURS,
      [TimeFilter.Last3Days]: SEISMIC_CONFIG.TIME_RANGES.LAST_3_DAYS,
      [TimeFilter.Week]: SEISMIC_CONFIG.TIME_RANGES.WEEK,
      [TimeFilter.Month]: SEISMIC_CONFIG.TIME_RANGES.MONTH,
    }
    let startDate: string
    const endDate = new Date().toISOString().split("T")[0]
    if (
      filters &&
      filters.timeFilter &&
      filters.timeFilter !== TimeFilter.All &&
      timeRanges[filters.timeFilter]
    ) {
      startDate = new Date(now.getTime() - timeRanges[filters.timeFilter]!)
        .toISOString()
        .split("T")[0]
    } else {
      startDate = new Date(now.getTime() - SEISMIC_CONFIG.DEFAULT_TIME_RANGE)
        .toISOString()
        .split("T")[0]
    }
    const requestBody: any = {
      startDate,
      endDate,
      type: "earthquake",
      limit: SEISMIC_CONFIG.ITEMS_PER_PAGE,
      offset,
    }
    if (filters?.magnitudeFilter) {
      requestBody.minMagnitude = SEISMIC_CONFIG.MIN_MAGNITUDE_FILTER
    }
    if (filters?.sourceFilter && filters.sourceFilter !== SourceFilter.All) {
      requestBody.source = filters.sourceFilter
    }
    if (filters?.locationFilter && position) {
      requestBody.lat = position.latitude
      requestBody.lon = position.longitude
      requestBody.radiusKm = SEISMIC_CONFIG.LOCATION_RADIUS_KM
    }
    const response = await supabase.functions.invoke("seismic-service", {
      body: requestBody,
    })
    if (response.error) {
      throw new Error(response.error.message || "Failed to fetch seismic data")
    }
    if (!response.data) {
      throw new Error("No data received from seismic service")
    }
    return response.data
  }

  // SWR hook for seismic data
  const {
    data: seismicData,
    error: seismicError,
    isLoading: seismicLoading,
    mutate: mutateSeismic,
  } = useSWR(
    activeTab === "earthquakes"
      ? JSON.stringify([
          "seismic",
          currentPage,
          {
            timeFilter: debouncedFilters.timeFilter,
            magnitudeFilter: debouncedFilters.magnitudeFilter,
            sourceFilter: debouncedFilters.sourceFilter,
            locationFilter: debouncedFilters.locationFilter,
            latitude: position?.latitude,
            longitude: position?.longitude,
          },
        ])
      : null,
    fetchSeismic,
    {
      dedupingInterval: SEISMIC_CONFIG.SWR_DEDUPING_INTERVAL,
      revalidateOnFocus: false,
    },
  )

  // SWR fetcher for volcano data
  const fetchVolcanoes = async () => {
    const response = await supabase.functions.invoke("volcanic-service", {
      body: { country: "Costa Rica", timeRange: "D1" },
    })
    if (!response.data?.success) {
      throw new Error(response.data?.error || "Failed to fetch volcano data")
    }
    return (response.data as VolcanoesResponse).volcanoes
  }

  // Fetch volcanoes when tab switches
  useEffect(() => {
    if (activeTab === "volcanoes") {
      setVolcanoError(null)
      setVolcanoLoading(true)
      fetchVolcanoes()
        .then(setVolcanoes)
        .catch(err => {
          console.error(err)
          setVolcanoError(err.message)
          setVolcanoes([])
        })
        .finally(() => setVolcanoLoading(false))
    }
  }, [activeTab])

  // Handle filter changes – reset pagination
  const handleFilterChange = useCallback(() => {
    setCurrentPage(1)
  }, [])

  // Enhanced filter handlers that reset pagination
  const enhancedActions = {
    setTimeFilter: (value: TimeFilter) => {
      actions.setTimeFilter(value)
      handleFilterChange()
    },
    setMagnitudeFilter: (value: boolean | MagnitudeFilter) => {
      // Convert boolean to MagnitudeFilter for backward compatibility
      const filter: MagnitudeFilter =
        typeof value === "boolean"
          ? { enabled: value, minimum: SEISMIC_CONFIG.MIN_MAGNITUDE_FILTER }
          : value
      actions.setMagnitudeFilter(filter)
      handleFilterChange()
    },
    setSourceFilter: (value: SourceFilter) => {
      actions.setSourceFilter(value)
      handleFilterChange()
    },
    setLocationFilter: (value: boolean | LocationFilter) => {
      // Convert boolean to LocationFilter for backward compatibility
      const filter: LocationFilter =
        typeof value === "boolean"
          ? { enabled: value, radiusKm: DISTANCE_THRESHOLDS.DEFAULT_RADIUS }
          : value
      actions.setLocationFilter(filter)
      handleFilterChange()
    },
    clearAllFilters: () => {
      actions.clearAllFilters()
      handleFilterChange()
    },
  }

  return (
    <div className="space-y-6">
      <SeismicHeader />

      <Tabs
        defaultValue="earthquakes"
        className="w-full"
        onValueChange={val => setActiveTab(val as "earthquakes" | "volcanoes")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earthquakes" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t("recentEarthquakes")}
          </TabsTrigger>
          <TabsTrigger value="volcanoes" className="flex items-center gap-2">
            <Mountain className="h-4 w-4" />
            {t("volcanicActivity")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earthquakes" className="space-y-4">
          <EarthquakesTab
            seismicData={seismicData}
            seismicLoading={seismicLoading}
            seismicError={seismicError}
            mutateSeismic={mutateSeismic}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            filters={filters}
            onFilterChange={enhancedActions}
            position={position}
            requestLocation={requestLocation}
            geoLoading={geoLoading}
          />
        </TabsContent>

        <TabsContent value="volcanoes" className="space-y-4">
          <VolcanoesTab
            volcanoes={volcanoes}
            volcanoLoading={volcanoLoading}
            volcanoError={volcanoError}
            setVolcanoes={setVolcanoes}
            setVolcanoLoading={setVolcanoLoading}
            setVolcanoError={setVolcanoError}
          />
        </TabsContent>
      </Tabs>

      {/* API Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h4>{t("seismicData")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("seismicDataDescription")}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Badge variant="outline">{t("usgsEarthquakeApi")}</Badge>
              <Badge variant="outline">{t("usgsVolcanoApi")}</Badge>
              <Badge variant="outline">{t("realTimeAlerts")}</Badge>
              <Badge variant="outline">{t("interactiveMaps")}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
