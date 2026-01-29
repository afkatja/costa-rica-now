import React from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  Activity,
  AlertTriangle,
  Mountain,
  Thermometer,
  Loader2,
} from "lucide-react"
import { ERUPTION_TIME_CODES, Volcano, VolcanoStatus } from "../types/volcano"

const Volcanoes = ({ volcanoes }: { volcanoes: Volcano[] }) => {
  const t = useTranslations("Volcanoes")
  const getVolcanoStatusColor = (status: VolcanoStatus) => {
    switch (status) {
      case "Activo":
        return "text-orange-600"
      case "Durmiente":
        return "text-blue-600"
      case "Extinto":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  // Calculate statistics
  const activeVolcanoes = volcanoes.filter(volcano => {
    const status: VolcanoStatus =
      volcano.computedStatus ||
      (volcano.details["Status"] as VolcanoStatus) ||
      "Durmiente"
    return status === "Activo"
  }).length

  const dormantVolcanoes = volcanoes.filter(volcano => {
    const status: VolcanoStatus =
      volcano.computedStatus ||
      (volcano.details["Status"] as VolcanoStatus) ||
      "Durmiente"
    return status === "Durmiente"
  }).length

  const extinctVolcanoes = volcanoes.filter(volcano => {
    const status: VolcanoStatus =
      volcano.computedStatus ||
      (volcano.details["Status"] as VolcanoStatus) ||
      "Durmiente"
    return status === "Extinto"
  }).length

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-medium">{activeVolcanoes}</div>
                <div className="text-sm text-muted-foreground">
                  {t("active")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-medium">{dormantVolcanoes}</div>
                <div className="text-sm text-muted-foreground">
                  {t("dormant")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-medium">{extinctVolcanoes}</div>
                <div className="text-sm text-muted-foreground">
                  {t("extinct")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volcano Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t("activity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {volcanoes.map(volcano => (
              <div key={volcano.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Mountain className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{volcano.name}</h4>
                      <div className="text-sm text-muted-foreground">
                        {t("elevation")}:{" "}
                        {volcano.subDetails["Summit Elevation"] ||
                          volcano.subDetails["Elevation"] ||
                          "N/A"}{" "}
                        m
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {t("status")}:
                      </span>
                      <span
                        className={`text-sm ${getVolcanoStatusColor(
                          volcano.computedStatus ||
                            (volcano.details["Status"] as VolcanoStatus) ||
                            "Durmiente",
                        )}`}
                      >
                        {volcano.computedStatus ||
                          volcano.details["Status"] ||
                          "Durmiente"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("lastEruption")}:{" "}
                      {(() => {
                        const key = volcano.computedEruptionTime || "D1"
                        const entry =
                          ERUPTION_TIME_CODES[key] || ERUPTION_TIME_CODES["D1"]
                        return entry?.range || "Unknown"
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm"></div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground"></p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default Volcanoes
