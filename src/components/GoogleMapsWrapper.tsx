"use client"
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react"
import {
  APIProvider,
  Map,
  useApiIsLoaded,
  useMap,
} from "@vis.gl/react-google-maps"
import {
  type Marker as MarkerType,
  MarkerClusterer,
  SuperClusterAlgorithm,
} from "@googlemaps/markerclusterer"
import MapComponent from "./Map"

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

interface GoogleMapsWrapperProps {
  destinations: any[] | Record<string, any> | null
  radarTileUrl?: string | null
  radarOpacity?: number
}

const GoogleMapsWrapper = ({
  destinations,
  radarTileUrl,
  radarOpacity,
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

  const clustererRef = useRef<MarkerClusterer | null>(null)

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
      {!loaded ? (
        <div>Loading map...</div>
      ) : (
        <MapComponent 
          destinations={visibleDestinations} 
          radarTileUrl={radarTileUrl}
          radarOpacity={radarOpacity}
        />
      )}
    </APIProvider>
  )
}

export default GoogleMapsWrapper
