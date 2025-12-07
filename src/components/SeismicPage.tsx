"use client"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { SeismicMap } from "./SeismicMap"
import { mockSeismicData } from "../utils/mockSeismicData"
import {
  Activity,
  AlertTriangle,
  Mountain,
  Thermometer,
  Loader2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "../utils/supabase/client"
import { useGeolocation } from "../hooks/use-geolocation"
import Earthquakes from "./Earthquakes"
import Volcanoes from "./Volcanoes"
import { useTranslations } from "next-intl"

export const formatDateTime = (timeString: string) => {
  return new Date(timeString).toLocaleString("es-CR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SeismicPage() {
  const t = useTranslations("SeismicPage")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [earthquakes, setEarthquakes] = useState<any[]>([])
  const [totalEarthquakes, setTotalEarthquakes] = useState(0)
  const [earthquakeStats, setEarthquakeStats] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [volcanoes, setVolcanoes] = useState<any[]>([])
  const [volcanoLoading, setVolcanoLoading] = useState(false)
  const [volcanoError, setVolcanoError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"earthquakes" | "volcanoes">(
    "earthquakes"
  )
  const {
    position,
    loading: geoLoading,
    error: geoError,
    requestLocation,
    isInCostaRica,
  } = useGeolocation()

  // Request location permission on mount
  useEffect(() => {
    if (!position && !geoLoading && !geoError) {
      requestLocation()
    }
    // if (geoError) setError(geoError)
  }, [position, geoLoading, geoError, requestLocation])

  const fetchSeismicData = async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      const response = await supabase.functions.invoke("seismic-service", {
        body: {
          startDate: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          type: "earthquake",
          limit: itemsPerPage,
          offset,
        },
      })
      console.log("SEISMIC DATA", { response })
      setEarthquakes(response.data.events)
      setTotalEarthquakes(response.data.metadata.stats.total)
      setEarthquakeStats(response.data.metadata.stats)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching seismic data", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const fetchVolcanoes = async () => {
    try {
      setVolcanoLoading(true)
      setVolcanoError(null)
      const response = await supabase.functions.invoke("volcanic-service", {
        body: {
          country: "Costa Rica",
          timeCode: "D1",
        },
      })
      console.log({ volcanos: response.data.volcanoes })

      setVolcanoes(response.data.volcanoes)
    } catch (error) {
      console.error("Error fetching volcanic data", error)
      setVolcanoError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setVolcanoLoading(false)
    }
  }

  // Request location permission and fetch seismic data on mount
  useEffect(() => {
    if (!position && !geoLoading && !geoError) {
      requestLocation()
    }
    // if (geoError) setError(geoError)
  }, [position, geoLoading, geoError, requestLocation])

  useEffect(() => {
    console.log({ activeTab })

    if (activeTab === "earthquakes") fetchSeismicData()
    if (activeTab === "volcanoes") fetchVolcanoes()
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2>{t("title")}</h2>
      </div>

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
          {/* Earthquakes Map */}
          <Card>
            <CardHeader>
              <CardTitle>{t("mapTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || geoLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    {t("loading")}
                  </span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-2">{t("error")}</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    {error}
                  </div>
                  <button
                    onClick={() => fetchSeismicData(currentPage)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : (
                <SeismicMap locations={earthquakes} type="earthquake" />
              )}
            </CardContent>
          </Card>

          <Earthquakes
            earthquakes={earthquakes}
            totalCount={totalEarthquakes}
            stats={earthquakeStats}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={fetchSeismicData}
          />
        </TabsContent>

        <TabsContent value="volcanoes" className="space-y-4">
          {/* Volcanoes Map */}
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Actividad Volcánica</CardTitle>
            </CardHeader>
            <CardContent>
              {volcanoLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    {t("loading")}
                  </span>
                </div>
              ) : volcanoError ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-2">{t("error")}</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    {volcanoError}
                  </div>
                  <button
                    onClick={() => fetchVolcanoes()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    {t("retry")}
                  </button>
                </div>
              ) : (
                <SeismicMap locations={volcanoes} type="volcano" />
              )}
            </CardContent>
          </Card>

          {volcanoes && volcanoes.length ? (
            <Volcanoes volcanoes={volcanoes} />
          ) : null}
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
