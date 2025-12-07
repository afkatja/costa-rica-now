"use client"
import { useState } from "react"
import { MapTooltip } from "./MapTooltip"
import { mockSeismicData } from "../utils/mockSeismicData"
import { Activity, Mountain, Clock, AlertTriangle } from "lucide-react"
import { Badge } from "./ui/badge"
import { useGeolocation } from "../hooks/use-geolocation"
import { baseColorScheme, ColorSet } from "./Marker"
import MapTooltipContent from "./MapTooltipContent"
import GoogleMapsWrapper from "./GoogleMapsWrapper"
import { useTranslations } from "next-intl"

type PinType = "earthquake" | "volcano"

interface SeismicPin {
  id: string
  type: PinType
  lat: number
  lng: number
  data: any
}

const getMagnitudeColorScheme = (magnitude: number): ColorSet => {
  if (magnitude >= 6) return baseColorScheme.alert
  if (magnitude >= 4.5 && magnitude < 6) return baseColorScheme.warn
  if (magnitude >= 3 && magnitude < 4.5) return baseColorScheme.minor
  return baseColorScheme.default
}

const getVolcanoColorScheme = (alertLevel: string): ColorSet => {
  switch (alertLevel) {
    case "Roja":
      return baseColorScheme.alert
    case "Naranja":
      return baseColorScheme.warn
    case "Amarilla":
      return baseColorScheme.minor
    case "Verde":
    default:
      return baseColorScheme.default
  }
}

export function SeismicMap({
  locations,
  type,
}: {
  locations: any[] | null
  type: "earthquake" | "volcano"
}) {
  const t = useTranslations("SeismicMap")
  // Get user's location context
  const { position, isInCostaRica, isWithinRadius } = useGeolocation()
  if (!locations) return t("noData")

  const formatDateTime = (timeString: string) => {
    return new Date(timeString).toLocaleString("es-CR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const pins = locations.map(loc => {
    const isEarthquake = type === "earthquake"
    const lat = loc.coordinates?.lat || loc.lat
    const lng = loc.coordinates?.lon || loc.lng
    const name = isEarthquake ? loc.location : loc.name
    const markerColor = isEarthquake
      ? getMagnitudeColorScheme(loc.magnitude)
      : getVolcanoColorScheme(loc.alertLevel)
    const colorPoint = markerColor.base

    return {
      ...loc,
      lat,
      lng,
      name,
      markerColor,
      content: (
        <MapTooltipContent
          data={{
            icon: null,
            description: name,
          }}
        >
          {isEarthquake ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colorPoint }}
                />
                <p className="text-2xl font-bold">
                  {t("magnitude")} {loc.magnitude}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span>{formatDateTime(loc.time)}</span>
                </div>
                {loc.felt && (
                  <div className="flex items-center gap-1">
                    <span>
                      {t("feels")}: {loc.felt}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>
                    {t("depth")}: {loc.depth} {t("km")}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colorPoint }}
                />
                <p className="text-lg font-bold">{loc.status}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  {t("alert")}: {loc.alertLevel}
                </div>
                <div>
                  {t("temperature")}: {loc.temperature}
                  {t("celsius")}
                </div>
                <div>
                  {t("lastEruption")}: {formatDateTime(loc.lastEruption)}
                </div>
              </div>
            </>
          )}
        </MapTooltipContent>
      ),
    }
  })

  return (
    <div className="relative">
      {/* Location Status Indicator */}
      {position && isInCostaRica && (
        <div className="absolute top-4 left-4 z-10 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-emerald-700 font-medium">
              {t("locationIndicator")}
            </span>
          </div>
        </div>
      )}

      <GoogleMapsWrapper destinations={pins} />

      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        {type === "earthquake" ? (
          <div>
            <h5 className="font-medium mb-2">{t("earthquakesByMagnitude")}</h5>
            <div className="flex space-x-2 items-center">
              {[6, 5, 4, 3].map(mag => (
                <div key={mag} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getMagnitudeColorScheme(mag).base,
                    }}
                  ></div>
                  <span>{t(`magnitude${mag}`)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h5 className="font-medium mb-2">{t("volcanoesByAlert")}</h5>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span>{t("redAlert")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span>{t("orangeAlert")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                <span>{t("yellowAlert")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span>{t("greenAlert")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
