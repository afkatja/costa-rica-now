import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { SeismicMap } from "./SeismicMap";
import { mockSeismicData } from "../utils/mockSeismicData";
import { 
  Activity, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Mountain,
  Thermometer,
  TrendingUp
} from "lucide-react";

export function SeismicPage() {
  const { earthquakes, volcanoes } = mockSeismicData;

  const formatDateTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 6) return "text-red-600";
    if (magnitude >= 4.5) return "text-orange-500";
    if (magnitude >= 3) return "text-yellow-600";
    return "text-green-600";
  };

  const getMagnitudeBadge = (magnitude: number) => {
    if (magnitude >= 6) return "destructive";
    if (magnitude >= 4.5) return "secondary";
    return "outline";
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case "Roja": return "bg-red-500";
      case "Naranja": return "bg-orange-500";
      case "Amarilla": return "bg-yellow-500";
      case "Verde": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getVolcanoStatusColor = (status: string) => {
    switch (status) {
      case "Activo": return "text-orange-600";
      case "Durmiente": return "text-blue-600";
      case "Extinto": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2>Actividad Sísmica y Volcánica</h2>
      </div>

      {/* Seismic Map */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Actividad Sísmica y Volcánica</CardTitle>
        </CardHeader>
        <CardContent>
          <SeismicMap />
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <h5 className="font-medium mb-2">Sismos por Magnitud</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span>M 6.0+</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  <span>M 4.5-5.9</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                  <span>M 3.0-4.4</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span>M &lt;3.0</span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-medium mb-2">Volcanes por Alerta</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span>Alerta Roja</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  <span>Alerta Naranja</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                  <span>Alerta Amarilla</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span>Alerta Verde</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="earthquakes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earthquakes" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Sismos Recientes
          </TabsTrigger>
          <TabsTrigger value="volcanoes" className="flex items-center gap-2">
            <Mountain className="h-4 w-4" />
            Actividad Volcánica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earthquakes" className="space-y-4">
          {/* Earthquakes Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-medium">{earthquakes.length}</div>
                    <div className="text-sm text-muted-foreground">Sismos últimos 7 días</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-2xl font-medium">
                      {Math.max(...earthquakes.map(e => e.magnitude)).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Magnitud máxima</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-medium">
                      {earthquakes.filter(e => e.felt).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Sismos percibidos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Earthquakes */}
          <Card>
            <CardHeader>
              <CardTitle>Sismos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {earthquakes.map((earthquake) => (
                  <div key={earthquake.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={getMagnitudeBadge(earthquake.magnitude)}
                          className={getMagnitudeColor(earthquake.magnitude)}
                        >
                          M {earthquake.magnitude}
                        </Badge>
                        <span className="font-medium">{earthquake.intensity}</span>
                        {earthquake.felt && (
                          <Badge variant="outline" className="text-xs">
                            Percibido
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {earthquake.reports} reportes
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {earthquake.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDateTime(earthquake.time)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Profundidad: {earthquake.depth} km
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volcanoes" className="space-y-4">
          {/* Volcano Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Mountain className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-2xl font-medium">
                      {volcanoes.filter(v => v.status === "Activo").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Volcanes activos</div>
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
                      {volcanoes.filter(v => v.alertLevel === "Naranja" || v.alertLevel === "Roja").length}
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
                    <div className="text-sm text-muted-foreground">Temp. máxima</div>
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
                {volcanoes.map((volcano) => (
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
                          className={`w-3 h-3 rounded-full ${getAlertLevelColor(volcano.alertLevel)}`}
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
                          <span className={`text-sm ${getVolcanoStatusColor(volcano.status)}`}>
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
        </TabsContent>
      </Tabs>

      {/* API Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h4>Datos Sísmicos y Volcánicos</h4>
            <p className="text-sm text-muted-foreground">
              Conecte con USGS APIs para datos en tiempo real de terremotos, actividad volcánica y alertas sísmicas.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Badge variant="outline">USGS Earthquake API</Badge>
              <Badge variant="outline">USGS Volcano API</Badge>
              <Badge variant="outline">Alertas en tiempo real</Badge>
              <Badge variant="outline">Mapas interactivos</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}