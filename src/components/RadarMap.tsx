import React from "react"
import BaseMap from "./BaseMap"
import RadarOverlay from "./RadarOverlay"

interface RadarMapProps {
  destinations: any[]
  radarOpacity?: number
}

const RadarMap = ({ destinations, radarOpacity = 0.6 }: RadarMapProps) => {
  return (
    <>
      <BaseMap destinations={destinations} />
      <RadarOverlay opacity={radarOpacity} />
    </>
  )
}

export default RadarMap
