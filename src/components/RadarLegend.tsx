import React from "react"

interface WeatherLegendProps {
  field?: string
  className?: string
}

// Color scales based on Tomorrow.io's standard visualization
const legendData = {
  precipitationIntensity: {
    title: "Precipitation Intensity",
    unit: "mm/hr",
    colors: [
      { color: "#CCCCCC", label: "0", value: 0 },
      { color: "#00E4FF", label: "0.1", value: 0.1 },
      { color: "#00AAFF", label: "1", value: 1 },
      { color: "#0077FF", label: "2", value: 2 },
      { color: "#0044FF", label: "5", value: 5 },
      { color: "#00FF00", label: "10", value: 10 },
      { color: "#77FF00", label: "20", value: 20 },
      { color: "#FFFF00", label: "30", value: 30 },
      { color: "#FFAA00", label: "50", value: 50 },
      { color: "#FF6600", label: "75", value: 75 },
      { color: "#FF0000", label: "100+", value: 100 },
    ],
  },
  temperature: {
    title: "Temperature",
    unit: "°C",
    colors: [
      { color: "#9400D3", label: "-40", value: -40 },
      { color: "#4B0082", label: "-30", value: -30 },
      { color: "#0000FF", label: "-20", value: -20 },
      { color: "#00BFFF", label: "-10", value: -10 },
      { color: "#00FFFF", label: "0", value: 0 },
      { color: "#00FF00", label: "10", value: 10 },
      { color: "#FFFF00", label: "20", value: 20 },
      { color: "#FFA500", label: "30", value: 30 },
      { color: "#FF4500", label: "40", value: 40 },
      { color: "#FF0000", label: "50+", value: 50 },
    ],
  },
  windSpeed: {
    title: "Wind Speed",
    unit: "m/s",
    colors: [
      { color: "#FFFFFF", label: "0", value: 0 },
      { color: "#E0F0FF", label: "2", value: 2 },
      { color: "#B0D0FF", label: "5", value: 5 },
      { color: "#80B0FF", label: "10", value: 10 },
      { color: "#5090FF", label: "15", value: 15 },
      { color: "#2070FF", label: "20", value: 20 },
      { color: "#0050FF", label: "25+", value: 25 },
    ],
  },
}

const WeatherLegend = ({
  field = "precipitationIntensity",
  className = "",
}: WeatherLegendProps) => {
  const legend =
    legendData[field as keyof typeof legendData] ||
    legendData.precipitationIntensity

  return (
    <div className={`bg-white p-4 ${className}`}>
      <h3 className="text-sm font-semibold mb-3 text-gray-800">
        {legend.title}
      </h3>
      <div className="space-y-1 flex items-center flex-wrap">
        {legend.colors.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1 mx-2">
            <div
              className="w-8 h-5 rounded border border-gray-300"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-700">
              {item.label} {legend.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WeatherLegend
