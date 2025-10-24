import { AdvancedMarker, useAdvancedMarkerRef } from "@vis.gl/react-google-maps"
import React, { useCallback } from "react"
import Marker from "./Marker"

const MapMarker = ({
  destination,
  onClick,
}: {
  destination: any
  onClick: (marker: any, destination: any) => void
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const handleClick = useCallback(
    () => onClick && onClick(marker!, destination),
    [onClick, marker, destination]
  )
  return (
    <div>
      <AdvancedMarker
        position={{ lat: destination.lat, lng: destination.lon }}
        title={destination.name}
        onClick={handleClick}
        ref={markerRef}
      >
        <Marker color={destination.markerColor} />
      </AdvancedMarker>
    </div>
  )
}

export default MapMarker
