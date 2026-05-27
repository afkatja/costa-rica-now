"use client"
import { useGeolocation } from "../hooks/use-geolocation"
import MapTooltipContent from "./MapTooltipContent"
import GoogleMapsWrapper from "./GoogleMapsWrapper"
import { MapErrorBoundary } from "./MapErrorBoundary"
import { useTranslations } from "next-intl"
import { SeismicEvent } from "../types/seismic"
import { Volcano } from "../types/volcano"
import { useMapPins } from "../utils/pin-calculator"
import { getMagnitudeColorScheme } from "../utils/color-scheme"
import { formatDateTime } from "../utils/date-formatter"

export function SeismicMap({
  locations,
  type,
}: {
  locations: SeismicEvent[] | Volcano[] | null
  type: "earthquake" | "volcano"
}) {
  const t = useTranslations("SeismicMap")
  // Get user's location context
  const { position, isInCostaRica } = useGeolocation()
  if (!locations) return t("noData")

  // Memoized pin calculations
  const pins = useMapPins(locations, type, (loc, name, colorPoint) => (
    <MapTooltipContent
      data={{
        icon: null,
        description: name,
      }}
    >
      {type === "earthquake" ? (
        <>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: colorPoint }}
            />
            <p className="text-2xl font-bold">
              {t("magnitude")} {(loc as SeismicEvent).magnitude}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span>
                {(loc as SeismicEvent).formattedDateTime ||
                  (loc as SeismicEvent).formattedTime ||
                  formatDateTime((loc as SeismicEvent).time)}
              </span>
            </div>
            {!(loc as SeismicEvent).felt ||
            (loc as SeismicEvent).felt === 0 ? null : (
              <div className="flex items-center gap-1">
                <span>
                  {t("feels")}: {(loc as SeismicEvent).felt}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>
                {t("depth")}:{" "}
                {(loc as SeismicEvent).depth != null
                  ? `${(loc as SeismicEvent).depth} ${t("km")}`
                  : t("unknown")}
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
            <p className="text-lg font-bold">{name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              {t("alert")}: {(loc as Volcano).alertLevel}
            </div>
            <div>
              {t("status")}: {(loc as Volcano).computedStatus}
            </div>
            <div>
              {t("elevation")}: {(loc as Volcano).elevation}
            </div>
            <div>
              {t("lastEruption")}: {(loc as Volcano).computedEruptionTime}
            </div>
          </div>
        </>
      )}
    </MapTooltipContent>
  ))

  return (
    <MapErrorBoundary>
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
              <h5 className="font-medium mb-2">
                {t("earthquakesByMagnitude")}
              </h5>
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
    </MapErrorBoundary>
  )
}
