// Mock seismic data matching USGS API structure for Costa Rica region
export const mockSeismicData = {
  earthquakes: [
    {
      id: "cr2024001",
      magnitude: 4.2,
      location: "15 km SO de Cartago",
      coordinates: { lat: 9.7489, lon: -83.9534 },
      depth: 12.3,
      time: "2024-12-15T08:45:23Z",
      intensity: "Ligero",
      felt: true,
      reports: 45,
      significance: 320
    },
    {
      id: "cr2024002",
      magnitude: 3.8,
      location: "22 km NO de Golfito",
      coordinates: { lat: 8.7123, lon: -83.2456 },
      depth: 18.7,
      time: "2024-12-14T15:22:11Z",
      intensity: "Ligero",
      felt: true,
      reports: 12,
      significance: 280
    },
    {
      id: "cr2024003",
      magnitude: 5.1,
      location: "35 km SO de Liberia",
      coordinates: { lat: 10.4567, lon: -85.8901 },
      depth: 25.4,
      time: "2024-12-13T22:18:45Z",
      intensity: "Moderado",
      felt: true,
      reports: 156,
      significance: 450
    },
    {
      id: "cr2024004",
      magnitude: 2.9,
      location: "8 km E de San José",
      coordinates: { lat: 9.9281, lon: -84.0907 },
      depth: 6.8,
      time: "2024-12-12T11:30:17Z",
      intensity: "Muy ligero",
      felt: false,
      reports: 3,
      significance: 150
    },
    {
      id: "cr2024005",
      magnitude: 6.2,
      location: "45 km O de Puntarenas",
      coordinates: { lat: 9.9763, lon: -85.2345 },
      depth: 35.2,
      time: "2024-12-11T03:45:29Z",
      intensity: "Fuerte",
      felt: true,
      reports: 423,
      significance: 680
    }
  ],
  volcanoes: [
    {
      id: "arenal",
      name: "Volcán Arenal",
      coordinates: { lat: 10.4628, lon: -84.7031 },
      elevation: 1657,
      status: "Activo",
      alertLevel: "Amarilla",
      lastEruption: "2024-12-10T06:30:00Z",
      activity: "Emisión de gases y ceniza ligera",
      temperature: 850,
      description: "Actividad volcánica normal con emisiones menores de gases volcánicos."
    },
    {
      id: "poas",
      name: "Volcán Poás",
      coordinates: { lat: 10.2000, lon: -84.2333 },
      elevation: 2708,
      status: "Activo",
      alertLevel: "Verde",
      lastEruption: "2024-12-08T14:20:00Z",
      activity: "Emisión de gases sulfurosos",
      temperature: 720,
      description: "Actividad fumarólica constante en el cráter principal."
    },
    {
      id: "irazu",
      name: "Volcán Irazú",
      coordinates: { lat: 9.9792, lon: -83.8520 },
      elevation: 3432,
      status: "Durmiente",
      alertLevel: "Verde",
      lastEruption: "1994-12-09T00:00:00Z",
      activity: "Sin actividad reciente",
      temperature: 350,
      description: "Sin actividad volcánica significativa. Monitoreo rutinario."
    },
    {
      id: "rincon",
      name: "Rincón de la Vieja",
      coordinates: { lat: 10.8300, lon: -85.3240 },
      elevation: 1916,
      status: "Activo",
      alertLevel: "Amarilla",
      lastEruption: "2024-12-12T09:15:00Z",
      activity: "Explosiones freatomagmáticas menores",
      temperature: 680,
      description: "Actividad explosiva menor con emisión de ceniza y vapor de agua."
    },
    {
      id: "turrialba",
      name: "Volcán Turrialba",
      coordinates: { lat: 10.0252, lon: -83.7671 },
      elevation: 3340,
      status: "Activo",
      alertLevel: "Roja",
      lastEruption: "2024-12-14T16:45:00Z",
      activity: "Emisiones de ceniza significativas",
      temperature: 920,
      description: "Incremento en la actividad con emisiones de ceniza que afectan comunidades cercanas."
    }
  ]
};