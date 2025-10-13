import { useState } from "react"
import { CostaRicaMap, coordsToSVG } from "./CostaRicaMap"
import { MapTooltip } from "./MapTooltip"
import { mockWeatherData } from "../utils/mockWeatherData"
import { Cloud, Thermometer, Droplets } from "lucide-react"

interface WeatherPin {
  id: string
  name: string
  lat: number
  lng: number
  temperature: number
  description: string
  precipitation: number
}

const weatherStations: WeatherPin[] = [
  {
    id: "san-jose",
    name: "San José",
    lat: 9.7489,
    lng: -83.7534,
    temperature: mockWeatherData.current.temperature,
    description: mockWeatherData.current.description,
    precipitation: 20,
  },
  {
    id: "liberia",
    name: "Liberia",
    lat: 10.6345,
    lng: -85.437,
    temperature: 32,
    description: "Soleado",
    precipitation: 0,
  },
  {
    id: "limon",
    name: "Limón",
    lat: 9.9906,
    lng: -83.0358,
    temperature: 28,
    description: "Lluvias ligeras",
    precipitation: 40,
  },
  {
    id: "puntarenas",
    name: "Puntarenas",
    lat: 9.9763,
    lng: -84.8403,
    temperature: 30,
    description: "Nublado",
    precipitation: 15,
  },
  {
    id: "cartago",
    name: "Cartago",
    lat: 9.8644,
    lng: -83.9194,
    temperature: 22,
    description: "Parcialmente nublado",
    precipitation: 25,
  },
]

export function WeatherMap() {
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const handlePinHover = (pinId: string, event: React.MouseEvent) => {
    setHoveredPin(pinId)
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
    setTooltipPos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  const getTemperatureColor = (temp: number) => {
    if (temp >= 30) return "#ef4444" // red
    if (temp >= 25) return "#f97316" // orange
    if (temp >= 20) return "#eab308" // yellow
    return "#3b82f6" // blue
  }

  const hoveredStation = weatherStations.find(
    station => station.id === hoveredPin
  )

  return (
    <div className="relative">
      <CostaRicaMap>
        {weatherStations.map(station => {
          const { x, y } = coordsToSVG(station.lat, station.lng)
          return (
            <g key={station.id}>
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={getTemperatureColor(station.temperature)}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-10 transition-all duration-200"
                onMouseEnter={e => handlePinHover(station.id, e)}
                onMouseLeave={() => setHoveredPin(null)}
              />
              <Cloud
                x={x - 4}
                y={y - 4}
                width="8"
                height="8"
                className="fill-gray-50 pointer-events-none"
              />
            </g>
          )
        })}
      </CostaRicaMap>

      {hoveredStation && (
        <MapTooltip
          isVisible={hoveredPin !== null}
          x={tooltipPos.x}
          y={tooltipPos.y}
        >
          <div className="space-y-2">
            <h4 className="font-medium">{hoveredStation.name}</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="h-4 w-4 text-orange-500" />
                {hoveredStation.temperature}°C
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Cloud className="h-4 w-4 text-gray-500" />
                {hoveredStation.description}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="h-4 w-4 text-blue-500" />
                {hoveredStation.precipitation}% lluvia
              </div>
            </div>
          </div>
        </MapTooltip>
      )}
    </div>
  )
}
