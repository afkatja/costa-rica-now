"use client"
import React from "react"
import { useTranslations } from "next-intl"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import costaRicaDestinations from "../lib/shared/destinations"
import { useWeatherData } from "../providers/WeatherDataProvider"
import { CloudRain, Droplets, Waves } from "lucide-react"

const isRadarEnabled = process.env.NEXT_PUBLIC_FEATURE_RADAR_ENABLED === "true"

export enum TabOfRegional {
  Weather = "weather",
  Radar = "radar",
  TidesAndWaves = "tides and waves",
}

const RegionalWeather = ({ activeTab }: { activeTab: TabOfRegional }) => {
  const t = useTranslations("WeatherPage")

  const { weatherData: allWeatherData, radarData, tidesData } = useWeatherData()
  const getRegionalWeather = () => {
    const regionMap = new Map<
      string,
      [
        string,
        (typeof costaRicaDestinations)[keyof typeof costaRicaDestinations]
      ]
    >()
    Object.entries(costaRicaDestinations).forEach(([key, dest]) => {
      if (!regionMap.has(dest.region)) {
        regionMap.set(dest.region, [key, dest])
      }
    })

    return Array.from(regionMap.values())
  }
  const uniqueLocations = getRegionalWeather()

  // Create data for Regional Weather section based on active tab
  const getRegionalData = () => {
    switch (activeTab) {
      case TabOfRegional.Weather:
        return uniqueLocations
          .map(([key, dest]) => {
            console.log({ key, allWeatherData })
            const regionWeather = allWeatherData?.find(
              ({ location }: { location: string }) => location === key
            )

            if (!regionWeather || !regionWeather.current) return null
            return {
              name: dest.name,
              region: dest.region,
              data: regionWeather,
              type: "weather" as const,
            }
          })
          .filter(Boolean)

      case TabOfRegional.Radar:
        if (!isRadarEnabled) return []
        return radarData
          .filter((radar: any) => radar.available)
          .map((radar: any) => ({
            name: radar.name,
            region: radar.region,
            data: radar,
            type: "radar" as const,
          }))

      case TabOfRegional.TidesAndWaves:
        return tidesData
          .filter((tide: any) => tide.available)
          .map((tide: any) => ({
            name: tide.name,
            region: tide.region,
            data: tide,
            type: "tides" as const,
          }))

      default:
        return []
    }
  }

  const regionalData = getRegionalData()

  const getTitle = () => {
    switch (activeTab) {
      case TabOfRegional.Weather:
        return t("currentConditions")
      case TabOfRegional.Radar:
        if (!isRadarEnabled) return t("currentConditions")
        return t("RegionalWeather.precipitation")
      case TabOfRegional.TidesAndWaves:
        return t("RegionalWeather.coastalConditions")
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          {t("RegionalWeather.title")}
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

                {item.type === "weather" && (
                  <>
                    <p className="text-2xl font-medium mb-1">
                      {item.data.current.temperature}°C
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.data.current.description}
                    </p>
                    <p className="flex items-center gap-1 text-xs">
                      <Droplets className="h-3 w-3 text-blue-500" />
                      {item.data.current.humidity}% {t("humidity")}
                    </p>
                  </>
                )}

                {item.type === "radar" && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <CloudRain className="h-5 w-5 text-blue-500" />
                      <p className="text-sm font-medium">
                        {t("RegionalWeather.precipitation")}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("RegionalWeather.status")}:{" "}
                      {item.data.available
                        ? t("RegionalWeather.active")
                        : t("RegionalWeather.unavailable")}
                    </p>
                    {item.data.lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        {t("RegionalWeather.updated")}:{" "}
                        {new Date(item.data.lastUpdated).toLocaleTimeString()}
                      </p>
                    )}
                  </>
                )}

                {item.type === "tides" && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Waves className="h-5 w-5 text-blue-500" />
                      <p className="text-sm font-medium">
                        {t("RegionalWeather.coastalConditions")}
                      </p>
                    </div>
                    {item.data.waveHeight && (
                      <p className="text-lg font-medium mb-1">
                        {item.data.waveHeight.toFixed(1)}m{" "}
                        {t("RegionalWeather.waves")}
                      </p>
                    )}
                    {item.data.surfConditions && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {t("RegionalWeather.surf")}: {item.data.surfConditions}
                      </p>
                    )}
                    {item.data.currentTide && (
                      <p className="text-xs text-muted-foreground">
                        {t("RegionalWeather.tide")}: {item.data.currentTide}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground py-8">
              {t("RegionalWeather.noData", { tab: activeTab })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default RegionalWeather
