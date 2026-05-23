"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

import { useTranslations } from "next-intl"
import { useGeolocation } from "../hooks/use-geolocation"
import { Waves, MapPin } from "lucide-react"
import costaRicaDestinations from "../lib/shared/destinations"
import MapTooltipContent from "./MapTooltipContent"
import GoogleMapsWrapper from "./GoogleMapsWrapper"
import Tides from "./Tides"
import { stringToEnum } from "../lib/utils"

export enum TabOfSea {
  TidesAndWaves = "tides and waves",
}

interface BeachConditions {
  destinationId: string
  destination: string
  name: string
  lat: number
  lon: number
  region: string
  tides: {
    extremes: Array<{
      time: string
      height: number
      type: "high" | "low"
    }>
    nextHigh: {
      time: string
      height: number
      type: "high" | "low"
    } | null
    nextLow: {
      time: string
      height: number
      type: "high" | "low"
    } | null
    currentTide: "rising" | "falling" | null
  }
  waves: {
    current: {
      height: number
      direction: number
      time: string
    }
    forecast: Array<{
      time: string
      height: number
      direction: number
    }>
    average24h: number
    max24h: number
  }
  surfConditions: "excellent" | "good" | "fair" | "poor"
  lastUpdated: string
}

const getDestinationsWithSeaData = (beachData: BeachConditions[] | null) => {
  if (!beachData) return null
  const beachMap: Record<string, BeachConditions> = {}
  beachData.forEach(
    (beach: BeachConditions) => (beachMap[beach.destinationId] = beach),
  )

  const destinations = Object.entries(costaRicaDestinations)
    .filter(([key, dest]) => beachMap[key])
    .map(([key, dest]: [string, any]) => {
      const beach = beachMap[key]
      if (!beach) return { ...dest, content: "No sea data" }
      return {
        ...dest,
        content: (
          <MapTooltipContent
            data={{
              icon: null,
              description: `Waves: ${beach.waves.current.height.toFixed(1)}m`,
            }}
          >
            <div className="space-y-2">
              <div className="text-lg font-bold">
                <Waves className="inline h-4 w-4 mr-1" />
                {beach.waves.current.height.toFixed(1)}m waves
              </div>
              <div className="text-sm capitalize">
                {beach.surfConditions} surf
              </div>
              <div className="text-xs text-muted-foreground">
                {beach.tides.currentTide === "rising"
                  ? "🌊 Rising"
                  : "🌊 Falling"}{" "}
                tide
              </div>
              {beach.tides.nextHigh && (
                <div className="text-xs text-muted-foreground">
                  Next high:{" "}
                  {new Date(beach.tides.nextHigh.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </MapTooltipContent>
        ),
      }
    })
  return destinations
}

export function SeaPage() {
  const t = useTranslations("WeatherPage") // Reusing WeatherPage translations for now
  const [activeTab, setActiveTab] = useState(TabOfSea.TidesAndWaves)
  const [beachData, setBeachData] = useState<BeachConditions[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { position, isInCostaRica } = useGeolocation()

  // Fetch beach data
  const fetchBeachData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/beaches")
      if (!response.ok) {
        throw new Error("Failed to fetch beach data")
      }
      const data = await response.json()
      setBeachData(data.destinations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Fetch beach data on mount
  useEffect(() => {
    fetchBeachData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-muted-foreground" />
          <h2>{t("seaConditions") || "Sea Conditions"}</h2>
        </div>
        <button
          onClick={fetchBeachData}
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
            {t("seaMap") || "Sea Conditions Map"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={val =>
              setActiveTab(
                stringToEnum(val, TabOfSea) || TabOfSea.TidesAndWaves,
              )
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="tides and waves">
                <Waves className="h-4 w-4 mr-2" />
                Tides and waves
              </TabsTrigger>
              <TabsTrigger value="regional">
                <MapPin className="h-4 w-4 mr-2" />
                Regional Overview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tides and waves" className="mt-0">
              {beachData ? (
                <GoogleMapsWrapper
                  destinations={getDestinationsWithSeaData(beachData)}
                />
              ) : (
                <div className="h-[700px] flex items-center justify-center">
                  {loading ? "Loading sea data..." : "No sea data available"}
                </div>
              )}
            </TabsContent>

            <TabsContent value="regional" className="mt-0 space-y-4">
              <Tides />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
