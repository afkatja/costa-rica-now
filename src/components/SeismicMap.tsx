"use client"
import { useState } from "react"
import { CostaRicaMap, coordsToSVG } from "./CostaRicaMap"
import { MapTooltip } from "./MapTooltip"
import { mockSeismicData } from "../utils/mockSeismicData"
import { Activity, Mountain, Clock, AlertTriangle } from "lucide-react"
import { Badge } from "./ui/badge"
import { useGeolocation } from "../hooks/use-geolocation"

type PinType = "earthquake" | "volcano"

interface SeismicPin {
  id: string
  type: PinType
  lat: number
  lng: number
  data: any
}

export function SeismicMap() {
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Get user's location context
  const { position, isInCostaRica, isWithinRadius } = useGeolocation()

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Filter seismic data by location if user is in Costa Rica
  const filterSeismicData = (data: any[], radiusKm: number = 100) => {
    if (!position || !isInCostaRica) {
      return data // Return all data if no location or not in Costa Rica
    }

    return data.filter(item => {
      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        item.coordinates.lat,
        item.coordinates.lon
      )
      return distance <= radiusKm
    })
  }

  // Get filtered seismic data
  const filteredEarthquakes = filterSeismicData(mockSeismicData.earthquakes)
  const filteredVolcanoes = filterSeismicData(mockSeismicData.volcanoes)

  // Combine filtered earthquakes and volcanoes into pins
  const seismicPins: SeismicPin[] = [
    ...filteredEarthquakes.map(eq => ({
      id: eq.id,
      type: "earthquake" as const,
      lat: eq.coordinates.lat,
      lng: eq.coordinates.lon,
      data: eq,
    })),
    ...filteredVolcanoes.map(vol => ({
      id: vol.id,
      type: "volcano" as const,
      lat: vol.coordinates.lat,
      lng: vol.coordinates.lon,
      data: vol,
    })),
  ]

  const handlePinHover = (pinId: string, event: React.MouseEvent) => {
    setHoveredPin(pinId)
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
    setTooltipPos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 6) return "#dc2626" // red-600
    if (magnitude >= 4.5) return "#ea580c" // orange-600
    if (magnitude >= 3) return "#ca8a04" // yellow-600
    return "#16a34a" // green-600
  }

  const getVolcanoColor = (alertLevel: string) => {
    switch (alertLevel) {
      case "Roja":
        return "#dc2626"
      case "Naranja":
        return "#ea580c"
      case "Amarilla":
        return "#ca8a04"
      case "Verde":
        return "#16a34a"
      default:
        return "#6b7280"
    }
  }

  const getPinSize = (pin: SeismicPin) => {
    if (pin.type === "earthquake") {
      const mag = pin.data.magnitude
      if (mag >= 5) return 10
      if (mag >= 4) return 8
      return 6
    }
    return 8 // volcanoes
  }

  const formatDateTime = (timeString: string) => {
    return new Date(timeString).toLocaleString("es-CR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const hoveredPinData = seismicPins.find(pin => pin.id === hoveredPin)

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

      <CostaRicaMap>
        {seismicPins.map(pin => {
          const { x, y } = coordsToSVG(pin.lat, pin.lng)
          const size = getPinSize(pin)

          return (
            <g key={pin.id}>
              <circle
                cx={x}
                cy={y}
                r={size}
                fill={
                  pin.type === "earthquake"
                    ? getMagnitudeColor(pin.data.magnitude)
                    : getVolcanoColor(pin.data.alertLevel)
                }
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-80 transition-all duration-200"
                onMouseEnter={e => handlePinHover(pin.id, e)}
                onMouseLeave={() => setHoveredPin(null)}
              />

              {pin.type === "earthquake" ? (
                <Activity
                  x={x - 4}
                  y={y - 4}
                  width="8"
                  height="8"
                  className="fill-gray-50 pointer-events-none"
                />
              ) : (
                <Mountain
                  x={x - 4}
                  y={y - 4}
                  width="8"
                  height="8"
                  className="fill-gray-50 pointer-events-none"
                />
              )}
            </g>
          )
        })}
      </CostaRicaMap>

      {hoveredPinData && (
        <MapTooltip
          isVisible={hoveredPin !== null}
          x={tooltipPos.x}
          y={tooltipPos.y}
        >
          <div className="space-y-2">
            {hoveredPinData.type === "earthquake" ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    M {hoveredPinData.data.magnitude}
                  </Badge>
                  <span className="text-sm font-medium">Sismo</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {hoveredPinData.data.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(hoveredPinData.data.time)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Profundidad: {hoveredPinData.data.depth} km
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Intensidad: {hoveredPinData.data.intensity}
                  </div>
                  {hoveredPinData.data.felt && (
                    <div className="text-sm text-blue-600">
                      {hoveredPinData.data.reports} reportes
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full`}
                    style={{
                      backgroundColor: getVolcanoColor(
                        hoveredPinData.data.alertLevel
                      ),
                    }}
                  />
                  <span className="text-sm font-medium">Volcán</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {hoveredPinData.data.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Estado: {hoveredPinData.data.status}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Alerta: {hoveredPinData.data.alertLevel}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {hoveredPinData.data.elevation} m de elevación
                  </div>
                  <div className="text-sm">{hoveredPinData.data.activity}</div>
                </div>
              </>
            )}
          </div>
        </MapTooltip>
      )}
    </div>
  )
}
