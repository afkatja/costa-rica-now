"use client"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

import { useTranslations } from "next-intl"
import { Waves } from "lucide-react"
import Tides from "./Tides"

/** Sea page tab identifiers */
export enum TabOfSea {
  TidesAndWaves = "tides",
}

import { useSeaPage } from "../hooks/useWeatherData"
import type { TideData } from "../providers/WeatherDataProvider"

interface RegionalItem {
  name: string
  region: string
  data: TideData
  type: "tides"
}

/** Sea page — displays tide data and coastal conditions for Costa Rica beaches */
export function SeaPage() {
  const t = useTranslations("SeaPage") // Use dedicated SeaPage translations
  const r = useTranslations("SeaPage.coastalConditions") // Use dedicated coastal conditions translations
  const { tidesData, refreshTides, loading, error } = useSeaPage()

  const regionalData: RegionalItem[] = tidesData
    .filter((tide: TideData) => tide.available)
    .map((tide: TideData) => ({
      name: tide.name,
      region: tide.region,
      data: tide,
      type: "tides" as const,
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-muted-foreground" />
          <h2>{t("seaConditions") || "Sea Conditions"}</h2>
        </div>
        <button
          onClick={refreshTides}
          disabled={loading}
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          aria-label={loading ? "Refreshing sea data" : "Refresh sea data"}
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              {t("loading") || "Loading..."}
            </>
          ) : (
            <>{t("refresh") || "Refresh"}</>
          )}
        </button>
      </div>
      {/* Error display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            {t("seaConditions") || "Sea Conditions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tidesData.length > 0 ? (
            <div className="space-y-6">
              <Tides />
            </div>
          ) : (
            <div className="h-[700px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                  <Waves className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-muted-foreground">
                  {loading
                    ? t("loadingData") || "Loading sea data..."
                    : t("noDataAvailable") || "No sea data available"}
                </p>
                {!loading && (
                  <button
                    onClick={refreshTides}
                    className="text-sm text-primary hover:underline"
                    aria-label="Try loading sea data again"
                  >
                    {t("tryAgain") || "Try again"}
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            {t("currentConditions")}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {r("coastalConditions")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {regionalData.length > 0 ? (
              regionalData.map((item: RegionalItem, index) => (
                <div
                  key={`${item.region}-${item.type}-${index}`}
                  className={`p-4 rounded-lg border ${item.type}`}
                >
                  <h5 className="font-medium mb-2">
                    <span className="sr-only">Location:</span>
                    {item.name} - {item.region}
                  </h5>
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Waves className="h-5 w-5 text-blue-500" />
                      <p className="text-sm font-medium">
                        {r("coastalConditions")}
                      </p>
                    </div>
                    {item.data.waveHeight && (
                      <p className="text-lg font-medium mb-1">
                        {item.data.waveHeight.toFixed(1)}m {r("waves")}
                      </p>
                    )}
                    {item.data.waveDirection && (
                      <p className="text-lg font-medium mb-1">
                        {item.data.waveDirection.toFixed(1)}°{" "}
                        {r("waveDirection")} ({item.data.waveDirectionCardinal})
                      </p>
                    )}
                    {item.data.surfConditions && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {r("surf")}: {item.data.surfConditions}
                      </p>
                    )}
                    {item.data.currentTide && item.data.nextHigh && (
                      <p className="text-xs text-muted-foreground">
                        {r("tide")}: {item.data.currentTide}
                      </p>
                    )}
                  </>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-8">
                <div className="space-y-2">
                  <p>{r("noData") || "No coastal data available"}</p>
                  <button
                    onClick={refreshTides}
                    className="text-sm text-primary hover:underline"
                    aria-label="Refresh coastal data"
                  >
                    {t("refreshData") || "Refresh data"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
