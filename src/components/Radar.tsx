"use client"
import React, { useCallback, useState } from "react"
import { RadarControls } from "./RadarControls"
import { CR_COORDS, RadarFrame, useRadar } from "../hooks/use-radar"
import costaRicaDestinations from "../lib/shared/destinations"
import GoogleMapsWrapper from "./GoogleMapsWrapper"
import RadarLegend from "./RadarLegend"

const Radar = () => {
  const [radarOpacity, setRadarOpacity] = useState(0.6)

  const {
    currentFrameIndex,
    allFrames,
    nextFrame,
    previousFrame,
    goToFrame,
    isPlaying,
    togglePlayback,
    refresh: refreshRadar,
  } = useRadar()
  return (
    <>
      <RadarControls
        isPlaying={isPlaying}
        currentFrameIndex={currentFrameIndex}
        totalFrames={allFrames.length}
        currentFrameTime={allFrames[currentFrameIndex]?.time || null}
        onTogglePlayback={togglePlayback}
        onPreviousFrame={previousFrame}
        onNextFrame={nextFrame}
        onGoToFrame={goToFrame}
        onRefresh={refreshRadar}
        opacity={radarOpacity}
        onOpacityChange={setRadarOpacity}
      />
      <RadarLegend field="precipitationIntensity" />

      <GoogleMapsWrapper
        destinations={Object.entries(costaRicaDestinations)}
        radarOpacity={radarOpacity}
        withRadar
      />
    </>
  )
}

export default Radar
