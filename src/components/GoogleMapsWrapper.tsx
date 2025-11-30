"use client"
import React, { useMemo, useState, useEffect } from "react"
import { APIProvider, useApiIsLoaded } from "@vis.gl/react-google-maps"
import BaseMap from "./BaseMap"
import RadarMap from "./RadarMap"

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

interface GoogleMapsWrapperProps {
  destinations: any[] | Record<string, any> | null
  radarOpacity?: number
  withRadar?: boolean
  className?: string
}

const GoogleMapsWrapper = ({
  destinations,
  radarOpacity,
  withRadar = false,
  className = ''
}: GoogleMapsWrapperProps) => {
  const [loaded, setLoaded] = useState(false)

  const destinationList = useMemo(() => {
    if (!destinations) return []
    if (Array.isArray(destinations)) return destinations
    return Object.entries(destinations).map(([id, dest]) => ({
      id,
      ...(dest as any),
    }))
  }, [destinations])

  const MAX_MARKERS = 300
  const visibleDestinations = useMemo(
    () => destinationList.slice(0, MAX_MARKERS),
    [destinationList]
  )

  const ApiReadyWatcher = ({
    onReady,
  }: {
    onReady: (ready: boolean) => void
  }) => {
    const ready = useApiIsLoaded()
    useEffect(() => {
      onReady(ready)
    }, [ready, onReady])

    return null
  }

  return (
    <APIProvider apiKey={apiKey}>
      <ApiReadyWatcher onReady={setLoaded} />
      <div
        className={`relative w-full h-[700px] bg-blue-50 rounded-lg border ${className}`}
      >
        {!loaded ? (
          <div>Loading map...</div>
        ) : withRadar ? (
          <RadarMap
            destinations={visibleDestinations}
            radarOpacity={radarOpacity}
          />
        ) : (
          <BaseMap destinations={visibleDestinations} />
        )}
      </div>
    </APIProvider>
  )
}

export default GoogleMapsWrapper
