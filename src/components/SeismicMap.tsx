"use client"
import { useState } from "react"
import { CostaRicaMap, coordsToSVG } from "./CostaRicaMap"
import { MapTooltip } from "./MapTooltip"
import { mockSeismicData } from "../utils/mockSeismicData"
import { Activity, Mountain, Clock, AlertTriangle } from "lucide-react"
import { Badge } from "./ui/badge"
import { useGeolocation } from "../hooks/use-geolocation"
import { baseColorScheme, ColorSet } from "./Marker"
import MapTooltipContent from "./MapTooltipContent"

type PinType = "earthquake" | "volcano"

interface SeismicPin {
  id: string
  type: PinType
  lat: number
  lng: number
  data: any
}

const getMagnitudeColorScheme = (magnitude: number): ColorSet => {
  // console.log({ magnitude })

  if (magnitude >= 6) return baseColorScheme.alert
  if (magnitude >= 4.5 && magnitude < 6) return baseColorScheme.warn
  if (magnitude >= 3 && magnitude < 4.5) return baseColorScheme.minor
  return baseColorScheme.default
}

export function SeismicMap({ locations }: { locations: any[] | null }) {
  // const [hoveredPin, setHoveredPin] = useState<string | null>(null)
  // const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Get user's location context
  const { position, isInCostaRica, isWithinRadius } = useGeolocation()
  if (!locations) return "No data"

  // Helper function to calculate distance between two coordinates
  // const calculateDistance = (
  //   lat1: number,
  //   lon1: number,
  //   lat2: number,
  //   lon2: number
  // ): number => {
  //   const R = 6371 // Radius of the Earth in kilometers
  //   const dLat = ((lat2 - lat1) * Math.PI) / 180
  //   const dLon = ((lon2 - lon1) * Math.PI) / 180
  //   const a =
  //     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //     Math.cos((lat1 * Math.PI) / 180) *
  //       Math.cos((lat2 * Math.PI) / 180) *
  //       Math.sin(dLon / 2) *
  //       Math.sin(dLon / 2)
  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  //   return R * c
  // }

  // // Filter seismic data by location if user is in Costa Rica
  // const filterSeismicData = (data: any[], radiusKm: number = 100) => {
  //   if (!position || !isInCostaRica) {
  //     return data // Return all data if no location or not in Costa Rica
  //   }

  //   return data.filter(item => {
  //     const distance = calculateDistance(
  //       position.latitude,
  //       position.longitude,
  //       item.coordinates.lat,
  //       item.coordinates.lon
  //     )
  //     return distance <= radiusKm
  //   })
  // }

  // // Get filtered seismic data
  // const filteredEarthquakes = filterSeismicData(locations)
  // const filteredVolcanoes = filterSeismicData(mockSeismicData.volcanoes)

  // Combine filtered earthquakes and volcanoes into pins
  // const seismicPins: SeismicPin[] = [
  //   ...filteredEarthquakes.map(eq => ({
  //     id: eq.id,
  //     type: "earthquake" as const,
  //     lat: eq.coordinates.lat,
  //     lng: eq.coordinates.lon,
  //     data: eq,
  //   })),
  //   ...filteredVolcanoes.map(vol => ({
  //     id: vol.id,
  //     type: "volcano" as const,
  //     lat: vol.coordinates.lat,
  //     lng: vol.coordinates.lon,
  //     data: vol,
  //   })),
  // ]

  const formatDateTime = (timeString: string) => {
    return new Date(timeString).toLocaleString("es-CR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const pins = locations.map(loc => {
    const colorPoint = getMagnitudeColorScheme(loc.magnitude).base
    return {
      ...loc,
      name: loc.location,
      markerColor: getMagnitudeColorScheme(loc.magnitude),
      content: (
        <MapTooltipContent
          data={{
            icon: null,
            description: loc.location,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: colorPoint }}
            />
            <p className="text-2xl font-bold">M {loc.magnitude}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>{formatDateTime(loc.time)}</span>
            </div>
            {loc.felt && (
              <div className="flex items-center gap-1">
                <span>Feels: {loc.felt}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>Depth: {loc.depth} km</span>
            </div>
          </div>
        </MapTooltipContent>
      ),
    }
  })

  // const hoveredPinData = seismicPins.find(pin => pin.id === hoveredPin)
  return (
    <div className="relative">
      {/* Location Status Indicator */}
      {position && isInCostaRica && (
        <div className="absolute top-4 left-4 z-10 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-emerald-700 font-medium">
              Showing seismic activity within 100km of your location
            </span>
          </div>
        </div>
      )}

      <CostaRicaMap destinations={pins} />

      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <h5 className="font-medium mb-2">Sismos por Magnitud</h5>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMagnitudeColorScheme(6).base }}
              ></div>
              <span>M 6.0+</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMagnitudeColorScheme(5).base }}
              ></div>
              <span>M 4.5-5.9</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMagnitudeColorScheme(4).base }}
              ></div>
              <span>M 3.0-4.4</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMagnitudeColorScheme(3).base }}
              ></div>
              <span>M &lt;3.0</span>
            </div>
          </div>
        </div>
        <div>
          <h5 className="font-medium mb-2">Volcanes por Alerta</h5>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Alerta Roja</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              <span>Alerta Naranja</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              <span>Alerta Amarilla</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span>Alerta Verde</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
