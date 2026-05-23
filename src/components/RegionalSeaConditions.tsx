"use client"
import React from "react"
import { useTranslations } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import costaRicaDestinations from "../lib/shared/destinations"
import { Waves, Droplets } from "lucide-react"

export enum TabOfSea {
  TidesAndWaves = "tides and waves",
}

const RegionalSeaConditions = ({ activeTab }: { activeTab: TabOfSea }) => {
  const t = useTranslations("WeatherPage")

  // Mock sea data - in real implementation this would come from API
  const getRegionalSeaData = () => {
    const regionMap = new Map<
      string,
      [
        string,
        (typeof costaRicaDestinations)[keyof typeof costaRicaDestinations],
      ]
    >()
    Object.entries(costaRicaDestinations).forEach(([key, dest]) => {
      if (!regionMap.has(dest.region)) {
        regionMap.set(dest.region, [key, dest])
      }
    })

    return Array.from(regionMap.values())
      .filter(([key, dest]) => {
        // Only show coastal regions for sea conditions
        const coastalRegions = ["Pacific Coast", "Guanacaste", "Southern Caribbean", "Northern Caribbean", "Central Pacific Coast", "Southern Pacific"]
        return coastalRegions.includes(dest.region)
      })
      .map(([key, dest]) => ({
        name: dest.name,
        region: dest.region,
        data: {
          waveHeight: Math.random() * 2 + 0.5, // Mock wave height
          surfConditions: ["excellent", "good", "fair", "poor"][Math.floor(Math.random() * 4)],
          currentTide: Math.random() > 0.5 ? "rising" : "falling",
        },
        type: "sea" as const,
      }))
  }

  const regionalData = getRegionalSeaData()

  const getTitle = () => {
    switch (activeTab) {
      case TabOfSea.TidesAndWaves:
        return t("coastalConditions")
      default:
        return ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          {t("Title")}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            {getTitle()}
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

                {item.type === "sea" && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Waves className="h-5 w-5 text-blue-500" />
                      <p className="text-sm font-medium">
                        {t("regionalWeather.coastalConditions")}
                      </p>
                    </div>
                    {item.data.waveHeight && (
                      <p className="text-lg font-medium mb-1">
                        {item.data.waveHeight.toFixed(1)}m{" "}
                        {t("regionalWeather.waves")}
                      </p>
                    )}
                    {item.data.surfConditions && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {t("regionalWeather.surf")}: {item.data.surfConditions}
                      </p>
                    )}
                    {item.data.currentTide && (
                      <p className="text-xs text-muted-foreground">
                        {t("regionalWeather.tide")}: {item.data.currentTide}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground py-8">
              {t("regionalWeather.noData", { tab: activeTab })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default RegionalSeaConditions
