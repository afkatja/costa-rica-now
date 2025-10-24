import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  Activity,
  AlertTriangle,
  Mountain,
  Thermometer,
  Loader2,
} from "lucide-react"
import { formatDateTime } from "./SeismicPage"

const Volcanoes = ({ volcanoes }: { volcanoes: any[] }) => {
  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case "Roja":
        return "bg-red-500"
      case "Naranja":
        return "bg-orange-500"
      case "Amarilla":
        return "bg-yellow-500"
      case "Verde":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
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

  const getVolcanoStatusColor = (status: string) => {
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-medium">
                  {volcanoes.filter(v => v.status === "Activo").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Volcanes activos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-medium">
                  {
                    volcanoes.filter(
                      v => v.alertLevel === "Naranja" || v.alertLevel === "Roja"
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">En alerta</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-medium">
                  {Math.max(...volcanoes.map(v => v.temperature))}°C
                </div>
                <div className="text-sm text-muted-foreground">
                  Temp. máxima
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volcano Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Volcánica</CardTitle>
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
                        Elevación: {volcano.elevation} m
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${getAlertLevelColor(
                        volcano.alertLevel
                      )}`}
                    />
                    <span className="text-sm font-medium">
                      Alerta {volcano.alertLevel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Estado:</span>
                      <span
                        className={`text-sm ${getVolcanoStatusColor(
                          volcano.status
                        )}`}
                      >
                        {volcano.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{volcano.temperature}°C</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Última erupción: {formatDateTime(volcano.lastEruption)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Actividad actual:</span>
                      <div className="mt-1">{volcano.activity}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {volcano.description}
                  </p>
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
