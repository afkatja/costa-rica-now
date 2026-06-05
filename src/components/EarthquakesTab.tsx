"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Loader2 } from "lucide-react"
import { SeismicMap } from "./SeismicMap"
import { useTranslations } from "next-intl"
import { GeolocationPosition } from "../hooks/use-geolocation"
import Earthquakes from "./Earthquakes"
import {
  SeismicFilters,
  SeismicFilterActions,
  SeismicEvent,
  SeismicEventStats,
  SeismicResponseMetadata,
} from "../types/shared"
import { SEISMIC_CONFIG } from "../config/seismic"

interface SeismicProperties {
  mag: number
  place: string
  time: number
  url?: string
  tsunami?: boolean
}

interface SeismicFeature {
  id: string
  geometry: {
    type: string
    coordinates: [number, number, number?]
  }
  properties: SeismicProperties
}

interface SeismicData {
  type: string
  metadata: SeismicResponseMetadata
  events: SeismicEvent[]
}

interface SeismicError {
  message?: string
  code?: number
}

interface EarthquakesTabProps {
  seismicData: SeismicData | null
  seismicLoading: boolean
  seismicError: SeismicError | null
  mutateSeismic: () => void
  currentPage: number
  onPageChange: (page: number) => void
  filters: SeismicFilters
  onFilterChange: SeismicFilterActions
  position: GeolocationPosition | null
  requestLocation: () => void
  geoLoading: boolean
}

export function EarthquakesTab({
  seismicData,
  seismicLoading,
  seismicError,
  mutateSeismic,
  currentPage,
  onPageChange,
  filters,
  onFilterChange,
  position,
  requestLocation,
  geoLoading,
}: EarthquakesTabProps) {
  const t = useTranslations("SeismicPage")

  return (
    <div className="space-y-4">
      {/* Earthquakes Map */}
      <Card>
        <CardHeader>
          <CardTitle>{t("mapTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {seismicLoading || geoLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t("loading")}</span>
            </div>
          ) : seismicError ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">{t("error")}</div>
              <div className="text-sm text-muted-foreground mb-4">
                {seismicError instanceof Error
                  ? seismicError.message
                  : String(seismicError)}
              </div>
              <button
                onClick={() => mutateSeismic?.()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {t("retry")}
              </button>
            </div>
          ) : (
            <SeismicMap
              locations={seismicData?.events ?? []}
              type="earthquake"
            />
          )}
        </CardContent>
      </Card>

      <Earthquakes
        earthquakes={seismicData?.events ?? []}
        totalCount={seismicData?.metadata?.stats?.total ?? 0}
        stats={
          seismicData?.metadata?.stats ?? {
            total: 0,
            sources: { usgs: 0, ovsicori: 0, rsn: 0, manual: 0 },
            magnitudeRange: null,
            feltCount: 0,
          }
        }
        currentPage={currentPage}
        itemsPerPage={SEISMIC_CONFIG.ITEMS_PER_PAGE}
        loading={seismicLoading}
        onPageChange={onPageChange}
        filters={filters}
        onFilterChange={onFilterChange}
        position={position}
        requestLocation={requestLocation}
      />
    </div>
  )
}
