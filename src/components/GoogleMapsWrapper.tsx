"use client"
import React, { useEffect, useState } from "react"
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps"
import Image from "next/image"
import { MapTooltip } from "./MapTooltip"

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

interface WeatherData {
  location: string
  name: string
  type: string
  current: {
    temperature: number
    feels_like: number
    humidity: number
    description: string
    main: string
    icon: string
    wind_speed: number
    pressure: number
    visibility: number
    uv_index: number | null
  }
  city: string
  country: string
  cached_at: string
}

const GoogleMapsWrapper = ({ destinations }: { destinations: any[] }) => {
  const [infoVisible, setInfoVisible] = useState<string | null>(null)

  // Create marker refs for each destination
  const markerRefs = destinations.map(() => useAdvancedMarkerRef())

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId={process.env.NEXT_PUBLIC_GMAPS_MAP_ID as string}
        style={{ width: "100%", height: "100%" }}
        defaultCenter={{ lat: 9.9092, lng: -83.7417 }}
        defaultZoom={8}
      >
        {destinations.map((destination, index) => {
          const [markerRef, marker] = markerRefs[index]
          const key = destination.name
          return (
            <div key={`map-marker-${key}`}>
              <AdvancedMarker
                position={{ lat: destination.lat, lng: destination.lon }}
                title={destination.name}
                onClick={() => setInfoVisible(key)}
                ref={markerRef}
              >
                <Image
                  alt="map marker"
                  src="/marker.svg"
                  height={20}
                  width={26}
                />
              </AdvancedMarker>

              <MapTooltip
                key={`map-tooltip-${key}`}
                isVisible={key === infoVisible}
                anchor={marker}
                onClose={() => setInfoVisible(null)}
                header={destination.name}
              >
                {destination.content}
              </MapTooltip>
            </div>
          )
        })}
      </Map>
    </APIProvider>
  )
}

export default GoogleMapsWrapper
