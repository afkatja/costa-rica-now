import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { WeatherMap } from "./WeatherMap"
import { mockWeatherData } from "../utils/mockWeatherData"
import { useTranslations } from "next-intl"
import {
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Sun,
  CloudRain,
  MapPin,
  Clock,
} from "lucide-react"
import { CostaRicaMap } from "./CostaRicaMap"

export function WeatherPage() {
  const { current, forecast, regions } = mockWeatherData
  const t = useTranslations("WeatherPage")

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getWeatherIcon = (iconType: string) => {
    switch (iconType) {
      case "sunny":
        return <Sun className="h-8 w-8 text-yellow-500" />
      case "partly-cloudy":
      case "partly-sunny":
        return <Sun className="h-8 w-8 text-yellow-400" />
      case "rain":
      case "light-rain":
        return <CloudRain className="h-8 w-8 text-blue-500" />
      case "thunderstorm":
        return <CloudRain className="h-8 w-8 text-purple-600" />
      default:
        return <Sun className="h-8 w-8 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <h2>{t("title")}</h2>
      </div>

      {/* Current Weather */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("currentConditions")}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {t("lastUpdated")}: {formatTime(current.lastUpdated)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              {getWeatherIcon(current.icon)}
              <div className="mt-2">
                <div className="text-3xl font-medium">
                  {current.temperature}°C
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("feelsLike")}: {current.feelsLike}°C
                </div>
                <div className="text-sm mt-1">{current.description}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  {t("humidity")}: {current.humidity}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {t("wind")}: {current.windSpeed} km/h
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {t("visibility")}: {current.visibility} km
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  {t("pressure")}: {current.pressure} hPa
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">
                  {t("uv")}: {current.uvIndex}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  {t("clouds")}: {current.cloudCover}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5-Day Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>{t("forecast5Days")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {forecast.map((day, index) => (
              <div key={day.date} className="text-center p-3 rounded-lg border">
                <div className="font-medium text-sm mb-2">{day.day}</div>
                <div className="mb-3">{getWeatherIcon(day.icon)}</div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {day.high}°/{day.low}°
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {day.description}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    {day.precipitation}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weather Map */}
      <Card>
        <CardHeader>
          <CardTitle>{t("weatherMap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CostaRicaMap />
        </CardContent>
      </Card>

      {/* Regional Weather */}
      <Card>
        <CardHeader>
          <CardTitle>{t("regionalWeather")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {regions.map((region, index) => (
              <div key={region.name} className="p-4 rounded-lg border">
                <div className="font-medium mb-2">{region.name}</div>
                <div className="text-2xl font-medium mb-1">
                  {region.temperature}°C
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {region.description}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  {region.precipitation}% {t("rain")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h4>{t("weatherData")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("weatherDataDescription")}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Badge variant="outline">{t("currentTemperature")}</Badge>
              <Badge variant="outline">{t("forecast7Days")}</Badge>
              <Badge variant="outline">{t("rainMaps")}</Badge>
              <Badge variant="outline">{t("weatherAlerts")}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
