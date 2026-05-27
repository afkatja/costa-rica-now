"use client"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

import { useTranslations } from "next-intl"
import { Waves } from "lucide-react"
import Tides from "./Tides"

export enum TabOfSea {
  TidesAndWaves = "tides",
}

import { useSeaPage } from "../hooks/useWeatherData"

export function SeaPage() {
  const t = useTranslations("WeatherPage") // Reusing WeatherPage translations for now
  const r = useTranslations("WeatherPage.regionalWeather") // Reusing WeatherPage translations for now
  const { tidesData, refreshTides, loading, error } = useSeaPage()

  const regionalData = tidesData
    .filter((tide: any) => tide.available)
    .map((tide: any) => ({
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
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
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
              {loading ? "Loading sea data..." : "No sea data available"}
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
              regionalData.map((item: any, index) => (
                <div
                  key={`${item.region}-${item.type}-${index}`}
                  className={`p-4 rounded-lg border ${item.type}`}
                >
                  <h5 className="font-medium mb-2">
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
                {r("noData", { tab: "sea conditions" })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
