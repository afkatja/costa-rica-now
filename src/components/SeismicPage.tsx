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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [earthquakes, setEarthquakes] = useState<any | null>(null)
  const {
    position,
    loading: geoLoading,
    error: geoError,
    requestLocation,
    isInCostaRica,
  } = useGeolocation()
  const { volcanoes } = mockSeismicData

  // Request location permission on mount
  useEffect(() => {
    if (!position && !geoLoading && !geoError) {
      requestLocation()
    }
    // if (geoError) setError(geoError)
  }, [position, geoLoading, geoError, requestLocation])

  useEffect(() => {
    let cancelled = false
    const fetchSeismicData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await supabase.functions.invoke("seismic-service", {
          body: {
            startDate: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            type: "earthquake",
          },
        })
        if (!cancelled) {
          console.log("SEISMIC DATA", { response })
          setEarthquakes(response.data.events)
        }
      } catch (error) {
        console.error("Error fetching seismic data", error)
        setError(error)
      } finally {
        setLoading(false)
      }
    }

    fetchSeismicData()

    return () => {
      cancelled = true // Cleanup function
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2>Actividad Sísmica y Volcánica</h2>
      </div>

      {/* Seismic Map */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Actividad Sísmica y Volcánica</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || geoLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading seismic data...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">
                Failed to load seismic data
              </div>
              <div className="text-sm text-muted-foreground mb-4">{error}</div>
              <button
                onClick={fetchSeismicData}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          ) : (
            <SeismicMap locations={earthquakes} />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="earthquakes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earthquakes" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Sismos Recientes
          </TabsTrigger>
          <TabsTrigger value="volcanoes" className="flex items-center gap-2">
            <Mountain className="h-4 w-4" />
            Actividad Volcánica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earthquakes" className="space-y-4">
          <Earthquakes earthquakes={earthquakes} />
        </TabsContent>

        <TabsContent value="volcanoes" className="space-y-4">
          <Volcanoes volcanoes={volcanoes} />
        </TabsContent>
      </Tabs>

      {/* API Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h4>Datos Sísmicos y Volcánicos</h4>
            <p className="text-sm text-muted-foreground">
              Conecte con USGS APIs para datos en tiempo real de terremotos,
              actividad volcánica y alertas sísmicas.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Badge variant="outline">USGS Earthquake API</Badge>
              <Badge variant="outline">USGS Volcano API</Badge>
              <Badge variant="outline">Alertas en tiempo real</Badge>
              <Badge variant="outline">Mapas interactivos</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
