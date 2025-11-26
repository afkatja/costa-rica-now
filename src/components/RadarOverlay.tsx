import { useEffect, useRef, useState } from "react"
import { useMap } from "@vis.gl/react-google-maps"
import { useRadar } from "../hooks/use-radar"

interface RadarOverlayProps {
  opacity?: number
  field?: string // precipitationIntensity, temperature, etc.
}

const RadarOverlay = ({
  opacity = 0.6,
  field = "precipitationIntensity",
}: RadarOverlayProps) => {
  const map = useMap()
  const radarOverlayRef = useRef<google.maps.ImageMapType | null>(null)
  const { getTileUrl } = useRadar()
  const [timestamp, setTimestamp] = useState(new Date().toISOString())
  const [frame, setFrame] = useState<any>(null)
  const updateTilesLayer = ({
    coord,
    zoom,
  }: {
    coord: { x: number; y: number }
    zoom: number
  }) => {
    // Tomorrow.io supports zoom 1-12
    // Clamp to their supported range
    const tomorrowZoom = Math.min(Math.max(zoom, 1), 12)

    // If Google zoom doesn't match Tomorrow zoom, scale coordinates
    let x = coord.x
    let y = coord.y

    if (zoom !== tomorrowZoom) {
      const zoomDiff = zoom - tomorrowZoom
      if (zoomDiff > 0) {
        // Google zoom is higher, scale down coordinates
        const scaleFactor = Math.pow(2, zoomDiff)
        x = Math.floor(coord.x / scaleFactor)
        y = Math.floor(coord.y / scaleFactor)
      } else {
        // Google zoom is lower (zoom < 1), scale up coordinates
        const scaleFactor = Math.pow(2, -zoomDiff)
        x = coord.x * scaleFactor
        y = coord.y * scaleFactor
      }
    }

    // Validate coordinates
    const maxTile = Math.pow(2, tomorrowZoom)

    // Handle x wrapping (longitude)
    if (x < 0 || x >= maxTile) {
      x = ((x % maxTile) + maxTile) % maxTile
    }

    // No y wrapping (latitude)
    if (y < 0 || y >= maxTile) {
      return ""
    }

    // Build API URL through your proxy endpoint
    const url = getTileUrl(frame, zoom, x, y)

    return url
  }
  useEffect(() => {
    if (!map) return

    // Remove existing radar overlay if present
    if (radarOverlayRef.current) {
      const overlays = map.overlayMapTypes
      const index = overlays.getArray().indexOf(radarOverlayRef.current)
      if (index !== -1) {
        overlays.removeAt(index)
      }
      radarOverlayRef.current = null
    }
  }, [map])

  useEffect(() => {
    if (!map) return

    const radarMapType = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        return updateTilesLayer({ coord, zoom })
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: opacity,
      name: "Weather",
      maxZoom: 8, // Limit to zoom 8 to reduce tile count (2^8 = 256 tiles max)
      minZoom: 1, // Tomorrow.io's min zoom
    })

    radarOverlayRef.current = radarMapType
    map.overlayMapTypes.push(radarMapType)

    return () => {
      if (radarOverlayRef.current) {
        const overlays = map.overlayMapTypes
        const index = overlays.getArray().indexOf(radarOverlayRef.current)
        if (index !== -1) {
          overlays.removeAt(index)
        }
        radarOverlayRef.current = null
      }
    }
  }, [map, frame])

  // Listen for radar frame changes from the hook
  useEffect(() => {
    const handleRadarFrameChange = (event: CustomEvent) => {
      const { frame } = event.detail
      setFrame(frame)
      setTimestamp(frame.time)
    }

    window.addEventListener(
      "radarFrameChanged",
      handleRadarFrameChange as EventListener
    )
    return () => {
      window.removeEventListener(
        "radarFrameChanged",
        handleRadarFrameChange as EventListener
      )
    }
  }, [])

  return null
}

export default RadarOverlay
