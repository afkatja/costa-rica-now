"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

export interface RadarFrame {
  time: number // forecast time in seconds
  absoluteTime: number
  timeOffset: number // minutes offset from current time
}

interface RadarData {
  available: boolean
  timestamp: number
}

// Default map parameters for Costa Rica
const DEFAULT_MAP_PARAMS = {
  center: { lat: 9.7489, lng: -83.7534 }, // Costa Rica center
  zoom: 8,
  range: 2, // 5x5 grid
}

const latLngToTile = (lat: number, lng: number, zoom: number) => {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
  const y = Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  )
  return { x, y }
}
// Time interval for frame updates in minutes
const FRAME_INTERVAL_MINUTES = 5
// Number of frames to show ahead
const MAX_FRAMES = 12 // 60 minutes total (12 * 5 minutes)

export const CR_COORDS = { lat: 9.9092, lng: -83.7417 }

export function useRadar({
  onFrameChange,
}: {
  onFrameChange?: (frame: RadarFrame | null, index: number) => void
} = {}) {
  const [radarAvailable, setRadarAvailable] = useState(false)
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  // Track the time offset (in minutes) the user was viewing
  const [currentTimeOffset, setCurrentTimeOffset] = useState(0)
  // Generate frames with absolute timestamps for Tomorrow.io API
  const allFrames: RadarFrame[] = useMemo(() => {
    const baseTime = radarTimestamp || Date.now()
    const frames = []

    // Generate frames at 5-minute intervals from current time
    for (let i = 0; i < MAX_FRAMES; i++) {
      const offsetMinutes = i * FRAME_INTERVAL_MINUTES
      const frameTime = baseTime + offsetMinutes * 60 * 1000 // Convert to milliseconds

      frames.push({
        time: Math.floor(frameTime / 1000), // Tomorrow.io expects seconds
        absoluteTime: frameTime,
        timeOffset: offsetMinutes, // Track the offset for navigation
      })
    }

    return frames
  }, [radarTimestamp])

  const fetchRadarStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/radar/tiles?check=true")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: RadarData = await response.json()

      setRadarAvailable(data.available)
      setRadarTimestamp(data.timestamp || Date.now())

      // Reset to the first frame when radar status is updated
      setCurrentFrameIndex(0)
    } catch (err) {
      console.error("Error fetching radar status:", err)
      setError(
        err instanceof Error ? err.message : "Failed to fetch radar status"
      )
      setRadarAvailable(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!radarAvailable) fetchRadarStatus()
  }, [radarAvailable, fetchRadarStatus])

  const currentFrame = allFrames[currentFrameIndex] || null

  // Helper function to find frame index by time offset
  const findFrameIndexByOffset = useCallback(
    (offsetMinutes: number): number => {
      const targetOffset = Math.max(
        0,
        Math.min(offsetMinutes, (MAX_FRAMES - 1) * FRAME_INTERVAL_MINUTES)
      )
      return Math.round(targetOffset / FRAME_INTERVAL_MINUTES)
    },
    []
  )
  /**
   * Get the tile URL for a specific frame, zoom level, and tile coordinates
   *
   * @param frame - Radar frame
   * @param zoom - Map zoom level (0-7)
   * @param x - Tile X coordinate
   * @param y - Tile Y coordinate
   * @returns Complete tile URL or null if no radar data
   */
  const getTileUrl = useCallback(
    (frame: RadarFrame, zoom: number, x: number, y: number): string | null => {
      if (!radarAvailable || !frame) return null
      // frame.time is already in seconds (absolute timestamp) for Tomorrow.io API
      return `/api/radar/tiles?zoom=${zoom}&x=${x}&y=${y}&field=precipitationIntensity&time=${frame.time}`
    },
    [radarAvailable, currentFrameIndex, allFrames]
  )

  /**
   * Generate all tiles for a given frame at specific location and zoom
   * Useful for displaying a grid of tiles
   */
  const generateTilesForFrame = useCallback(
    (
      frame: RadarFrame | null,
      center: { lat: number; lng: number },
      zoom: number,
      range: number = 2 // 5x5 grid
    ) => {
      if (!radarAvailable || !frame) return []

      const centerTile = latLngToTile(center.lat, center.lng, zoom)
      const tiles = []

      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          const tileX = centerTile.x + dx
          const tileY = centerTile.y + dy

          const maxTile = Math.pow(2, zoom)
          if (tileX >= 0 && tileX < maxTile && tileY >= 0 && tileY < maxTile) {
            tiles.push({
              x: tileX,
              y: tileY,
              url: `/api/radar/tiles?zoom=${zoom}&x=${tileX}&y=${tileY}&field=precipitationIntensity&time=${frame.time}`,
              offsetX: dx,
              offsetY: dy,
              forecastTime: frame.time,
            })
          }
        }
      }
      return tiles
    },
    [radarAvailable]
  )

  const handleFrameChange = useCallback(() => {
    if (currentFrame && radarAvailable) {
      window.dispatchEvent(
        new CustomEvent("radarFrameChanged", {
          detail: { frame: currentFrame, index: currentFrameIndex },
        })
      )
    }
  }, [currentFrame, currentFrameIndex, radarAvailable, generateTilesForFrame])

  // Notify consumer when the current frame changes (call internal handler)
  useEffect(() => {
    handleFrameChange()
  }, [handleFrameChange])

  // Also call external callback if provided
  useEffect(() => {
    if (typeof onFrameChange === "function") {
      try {
        onFrameChange(currentFrame, currentFrameIndex)
      } catch (err) {
        // swallow errors from consumer callback to avoid breaking the hook
        // but log for debugging
        // eslint-disable-next-line no-console
        console.error("useRadar:onFrameChange error:", err)
      }
    }
  }, [onFrameChange, currentFrameIndex, currentFrame])

  const nextFrame = useCallback(() => {
    const newOffset = Math.min(
      currentTimeOffset + FRAME_INTERVAL_MINUTES,
      (MAX_FRAMES - 1) * FRAME_INTERVAL_MINUTES
    )
    setCurrentTimeOffset(newOffset)
    setCurrentFrameIndex(findFrameIndexByOffset(newOffset))
  }, [currentTimeOffset, findFrameIndexByOffset])

  const previousFrame = useCallback(() => {
    const newOffset = Math.max(currentTimeOffset - FRAME_INTERVAL_MINUTES, 0)
    setCurrentTimeOffset(newOffset)
    setCurrentFrameIndex(findFrameIndexByOffset(newOffset))
  }, [currentTimeOffset, findFrameIndexByOffset])

  const goToFrame = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, allFrames.length - 1))
      const newOffset = clampedIndex * FRAME_INTERVAL_MINUTES
      setCurrentTimeOffset(newOffset)
      setCurrentFrameIndex(clampedIndex)
    },
    [allFrames.length]
  )

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // Animation loop - advance frame every 500ms and refresh timestamps every 5 minutes
  useEffect(() => {
    if (!isPlaying) return

    const frameInterval = setInterval(() => {
      nextFrame()
    }, 500)

    // Refresh frames every 5 minutes to get updated timestamps for Tomorrow.io
    const refreshInterval = setInterval(() => {
      setRadarTimestamp(Date.now())
    }, FRAME_INTERVAL_MINUTES * 60 * 1000)

    return () => {
      clearInterval(frameInterval)
      clearInterval(refreshInterval)
    }
  }, [isPlaying, nextFrame])

  // Update frame index when timestamps refresh (maintain the same time offset)
  useEffect(() => {
    if (radarTimestamp && allFrames.length > 0) {
      const newIndex = findFrameIndexByOffset(currentTimeOffset)
      setCurrentFrameIndex(newIndex)
    }
  }, [radarTimestamp, allFrames, currentTimeOffset, findFrameIndexByOffset])

  return {
    radarAvailable,
    radarTimestamp,
    loading,
    error,
    currentFrame,
    currentFrameIndex,
    currentTimeOffset,
    allFrames,
    getTileUrl,
    generateTilesForFrame,
    nextFrame,
    previousFrame,
    goToFrame,
    isPlaying,
    togglePlayback,
    refresh: fetchRadarStatus,
  }
}
