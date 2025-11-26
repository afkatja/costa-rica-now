"use client"

import GoogleMapsWrapper from "./GoogleMapsWrapper"
import TidesInfoWindow from "./TidesInfoWindow"
import { coastalDestinations } from "@/lib/shared/destinations"

// Minimal shape for destination passed to the map and info window
type BeachLocation = {
  id: string
  name: string
  lat: number
  lon: number
  region?: string
}

export default function BeachConditionsMap() {
  // Use the lightweight `coastalDestinations` list client-side and
  // defer heavy API calls until the user opens an info window.
  const destinations: BeachLocation[] = coastalDestinations.map(d => ({
    id: d.id,
    name: d.name,
    lat: d.lat,
    lon: d.lon,
    region: d.region,
  }))

  const destinationsWithContent = destinations.map(dest => ({
    ...dest,
    content: <TidesInfoWindow beach={dest} />,
  }))

  return (
    <div className="space-y-4">
      <GoogleMapsWrapper destinations={destinationsWithContent} />
    </div>
  )
}
