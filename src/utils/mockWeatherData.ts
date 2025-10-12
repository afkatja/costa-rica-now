// Mock weather data matching OpenWeather API structure for Costa Rica
export const mockWeatherData = {
  current: {
    location: "San José, Costa Rica",
    coordinates: { lat: 9.7489, lon: -83.7534 },
    temperature: 24,
    feelsLike: 26,
    humidity: 78,
    pressure: 1013,
    windSpeed: 12,
    windDirection: 245,
    visibility: 10,
    uvIndex: 6,
    cloudCover: 40,
    description: "Parcialmente nublado",
    icon: "partly-cloudy",
    lastUpdated: "2024-12-15T14:30:00Z"
  },
  forecast: [
    {
      date: "2024-12-15",
      day: "Hoy",
      high: 28,
      low: 19,
      humidity: 75,
      precipitation: 20,
      description: "Lluvias ligeras",
      icon: "light-rain"
    },
    {
      date: "2024-12-16",
      day: "Mañana",
      high: 26,
      low: 18,
      humidity: 80,
      precipitation: 60,
      description: "Lluvias moderadas",
      icon: "rain"
    },
    {
      date: "2024-12-17",
      day: "Martes",
      high: 29,
      low: 20,
      humidity: 70,
      precipitation: 10,
      description: "Parcialmente soleado",
      icon: "partly-sunny"
    },
    {
      date: "2024-12-18",
      day: "Miércoles",
      high: 31,
      low: 21,
      humidity: 65,
      precipitation: 5,
      description: "Soleado",
      icon: "sunny"
    },
    {
      date: "2024-12-19",
      day: "Jueves",
      high: 27,
      low: 19,
      humidity: 85,
      precipitation: 80,
      description: "Tormentas eléctricas",
      icon: "thunderstorm"
    }
  ],
  regions: [
    {
      name: "Valle Central",
      temperature: 24,
      description: "Parcialmente nublado",
      precipitation: 20
    },
    {
      name: "Guanacaste",
      temperature: 32,
      description: "Soleado",
      precipitation: 0
    },
    {
      name: "Limón",
      temperature: 28,
      description: "Lluvias ligeras",
      precipitation: 40
    },
    {
      name: "Puntarenas",
      temperature: 30,
      description: "Nublado",
      precipitation: 15
    }
  ]
};