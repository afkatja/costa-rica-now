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

const Volcanoes = ({
  volcanoes,
}: {
  volcanoes: {
    id: number
    name: string
    details: {}
    subDetails: {}
    history: []
  }[]
}) => {
  const getEruptTime = (year: string) => {
    switch (year) {
      case "D1":
        return ">= 1964"
      case "D2":
        return "1900 - 1963"
      case "D3":
        return "1800 - 1899"
      case "D4":
        return "1700 - 1799"
      case "D5":
        return "1500 - 1699"
      case "D6":
        return "1 - 1499"
      case "D7":
        return "Holcene"
      default:
        return "Unknown"
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

  console.log({ volcanoes })

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-medium"></div>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-yellow-500" />
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
                        Elevación: {volcano.subDetails.SummitElevation} m
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Estado:</span>
                      <span
                        className={`text-sm ${getVolcanoStatusColor(
                          attributes.STATUS
                        )}`}
                      >
                        {attributes.STATUS}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Última erupción: {getEruptTime(attributes.TIME_ERUPT)}
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
