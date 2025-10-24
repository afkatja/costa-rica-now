import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import MapMarker from "./MapMarker"
import Supercluster from "supercluster"
import Marker, { baseColorScheme } from "./Marker"
import { useMap, Map, AdvancedMarker } from "@vis.gl/react-google-maps"
import { MapTooltip } from "./MapTooltip"

const MapComponent = ({ destinations }: { destinations: any[] }) => {
  const superclusterRef = useRef<Supercluster | null>(null)

  const [bounds, setBounds] = useState<
    [number, number, number, number, number, number] | null
  >(null)
  const [zoom, setZoom] = useState(8)
  const [infoVisible, setInfoVisible] = useState<string | null>(null)
  const [markerAnchor, setMarkerAnchor] = useState<any | null>(null)
  const [infoContent, setInfoContent] = useState<{
    header: React.ReactNode
    body: React.ReactNode
  } | null>(null)

  const map = useMap()

  useEffect(() => {
    if (!destinations) return
    const points = destinations
      .filter(d => d.lat && d.lon)
      .map((dest, idx) => ({
        type: "Feature",
        properties: {
          cluster: false,
          destination: dest,
          id: dest.id || dest.name || `marker-${idx}`,
        },
        geometry: {
          type: "Point",
          coordinates: [dest.lon, dest.lat],
        },
      }))

    superclusterRef.current = new Supercluster({
      radius: 75,
      maxZoom: 16,
      minZoom: 0,
    })

    // cast points to any to satisfy Supercluster's expected PointFeature typing
    superclusterRef.current.load(points as any)
  }, [destinations])

  useEffect(() => {
    if (!map) return

    const updateMapState = () => {
      const mapBounds = map.getBounds()
      if (mapBounds) {
        setBounds([
          mapBounds.getSouthWest().lng(),
          mapBounds.getSouthWest().lat(),
          mapBounds.getNorthEast().lng(),
          mapBounds.getNorthEast().lat(),
          0,
          0,
        ])
      }
      setZoom(map.getZoom() || 8)
    }

    // Initial state
    updateMapState()

    // Listen to map changes
    const idleListener = map.addListener("idle", updateMapState)

    return () => {
      google.maps.event.removeListener(idleListener)
    }
  }, [map])

  const clusters = useMemo(() => {
    if (!superclusterRef.current || !bounds) return []
    return superclusterRef.current.getClusters(bounds, Math.floor(zoom))
  }, [bounds, zoom])

  const handleClusterClick = (
    clusterId: number,
    longitude: number,
    latitude: number
  ) => {
    const expansionZoom =
      superclusterRef?.current?.getClusterExpansionZoom(clusterId)
    map?.setCenter({ lat: latitude, lng: longitude })
    map?.setZoom(expansionZoom ?? zoom)
  }
  const handleMarkerClick = (marker: any, destination: any) => {
    setInfoVisible(destination.id || destination.name || null)
    setMarkerAnchor(marker)
    setInfoContent({ header: destination.name, body: destination.content })
  }
  return (
    <Map
      mapId={process.env.NEXT_PUBLIC_GMAPS_MAP_ID as string}
      style={{ width: "100%", height: "100%" }}
      defaultCenter={{ lat: 9.9092, lng: -83.7417 }}
      defaultZoom={zoom}
    >
      {clusters.map(cluster => {
        const [lon, lat] = cluster.geometry.coordinates
        const {
          cluster: isCluster,
          point_count: pointCount,
          cluster_id: clusterId,
          id,
          destination,
        } = cluster.properties

        return isCluster ? (
          <AdvancedMarker
            key={clusterId}
            position={{ lat, lng: lon }}
            title={`Cluster of ${pointCount} locations`}
            onClick={() => handleClusterClick(clusterId, lon, lat)}
          >
            <Marker color={baseColorScheme.default} />
          </AdvancedMarker>
        ) : (
          <MapMarker
            key={`cluster-${id}`}
            destination={{
              ...destination,
            }}
            onClick={handleMarkerClick}
          />
        )
      })}
      {infoVisible && (
        <MapTooltip
          anchor={markerAnchor}
          onClose={() => setInfoVisible(null)}
          header={infoContent?.header}
        >
          {infoContent?.body}
        </MapTooltip>
      )}
    </Map>
  )
}

export default MapComponent
