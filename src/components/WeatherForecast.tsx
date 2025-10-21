import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { mockWeatherData } from "../utils/mockWeatherData"
import WeatherIcons from "../lib/WeatherIcons"
import { Droplets } from "lucide-react"
import { useTranslations } from "next-intl"

const WeatherForecast = ({
  forecastData,
  locationName,
}: {
  forecastData: any
  locationName: string
}) => {
  const { forecast } = mockWeatherData
  const t = useTranslations("WeatherPage")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          {t("forecast5Days")} {locationName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {(forecastData?.forecast || forecast).map((day: any) => {
            // Handle both real forecast data and mock data structures
            const isRealData = forecastData?.forecast
            const dayName = new Date(day.date).toLocaleDateString("en-US", {
              weekday: "short",
            })
            const dayKey = day.date
            const weatherIcon = isRealData ? day.main?.toLowerCase() : day.icon
            const highTemp = day.high
            const lowTemp = day.low
            const description = day.description
            const precipitation = isRealData
              ? day.total_rain
              : day.precipitation

            return (
              <div key={dayKey} className="text-center p-3 rounded-lg border">
                <header className="flex  gap-2">
                  <div className="m-3">
                    <WeatherIcons iconType={weatherIcon} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-medium text-md mb-2">{dayName}</h4>
                    <p className="text-sm mb-1">
                      {new Date(dayKey).toLocaleDateString("en-US", {
                        // weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {highTemp}°/{lowTemp}°
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <Droplets className="h-5 w-5 text-blue-500" />
                        {isRealData
                          ? `${precipitation}mm`
                          : `${precipitation}%`}
                      </div>
                    </div>
                  </div>
                </header>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default WeatherForecast
