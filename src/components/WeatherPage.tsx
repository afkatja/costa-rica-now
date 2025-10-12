import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { WeatherMap } from "./WeatherMap";
import { mockWeatherData } from "../utils/mockWeatherData";
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Sun, 
  CloudRain,
  MapPin,
  Clock
} from "lucide-react";

export function WeatherPage() {
  const { current, forecast, regions } = mockWeatherData;

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWeatherIcon = (iconType: string) => {
    switch (iconType) {
      case 'sunny':
        return <Sun className="h-8 w-8 text-yellow-500" />;
      case 'partly-cloudy':
      case 'partly-sunny':
        return <Sun className="h-8 w-8 text-yellow-400" />;
      case 'rain':
      case 'light-rain':
        return <CloudRain className="h-8 w-8 text-blue-500" />;
      case 'thunderstorm':
        return <CloudRain className="h-8 w-8 text-purple-600" />;
      default:
        return <Sun className="h-8 w-8 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <h2>Clima en Costa Rica</h2>
      </div>

      {/* Current Weather */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Condiciones Actuales</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Actualizado: {formatTime(current.lastUpdated)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              {getWeatherIcon(current.icon)}
              <div className="mt-2">
                <div className="text-3xl font-medium">{current.temperature}°C</div>
                <div className="text-sm text-muted-foreground">Sensación: {current.feelsLike}°C</div>
                <div className="text-sm mt-1">{current.description}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Humedad: {current.humidity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Viento: {current.windSpeed} km/h</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Visibilidad: {current.visibility} km</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Presión: {current.pressure} hPa</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">UV: {current.uvIndex}</span>
              </div>
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Nubes: {current.cloudCover}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5-Day Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Pronóstico 5 Días</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {forecast.map((day, index) => (
              <div key={day.date} className="text-center p-3 rounded-lg border">
                <div className="font-medium text-sm mb-2">{day.day}</div>
                <div className="mb-3">
                  {getWeatherIcon(day.icon)}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{day.high}°/{day.low}°</div>
                  <div className="text-xs text-muted-foreground">{day.description}</div>
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
          <CardTitle>Mapa del Clima</CardTitle>
        </CardHeader>
        <CardContent>
          <WeatherMap />
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>30°C+</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>25-29°C</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>20-24°C</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>&lt;20°C</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Weather */}
      <Card>
        <CardHeader>
          <CardTitle>Clima por Regiones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {regions.map((region, index) => (
              <div key={region.name} className="p-4 rounded-lg border">
                <div className="font-medium mb-2">{region.name}</div>
                <div className="text-2xl font-medium mb-1">{region.temperature}°C</div>
                <div className="text-sm text-muted-foreground mb-2">{region.description}</div>
                <div className="flex items-center gap-1 text-xs">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  {region.precipitation}% lluvia
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
            <h4>Datos del Clima</h4>
            <p className="text-sm text-muted-foreground">
              Conecte con OpenWeather API para datos meteorológicos en tiempo real, mapas de precipitación, radar y pronósticos detallados.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Badge variant="outline">Temperatura actual</Badge>
              <Badge variant="outline">Pronóstico 7 días</Badge>
              <Badge variant="outline">Mapas de lluvia</Badge>
              <Badge variant="outline">Alertas meteorológicas</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}