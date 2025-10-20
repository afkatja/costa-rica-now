import React from "react"
import { Sun, CloudRain, Cloud } from "lucide-react"

const WeatherIcons = ({ iconType }: { iconType: string }) => {
  switch (iconType) {
    case "sunny":
      return <Sun className="h-8 w-8 text-yellow-500" />
    case "partly-cloudy":
    case "partly-sunny":
      return <Sun className="h-8 w-8 text-yellow-400" />
    case "fog":
    case "haze":
    case "mist":
      return <Cloud className="h-8 w-8 text-gray-400" />
    case "rain":
    case "light-rain":
      return <CloudRain className="h-8 w-8 text-blue-500" />
    case "thunderstorm":
      return <CloudRain className="h-8 w-8 text-purple-600" />
    default:
      return <Sun className="h-8 w-8 text-gray-400" />
  }
}

export default WeatherIcons
