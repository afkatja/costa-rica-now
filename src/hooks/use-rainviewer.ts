"use client"

import { useState, useEffect, useCallback } from "react"

interface RadarFrame {
  time: number
  path: string
}

interface RainViewerData {
  host: string
  radar: {
    past: RadarFrame[]
    nowcast: RadarFrame[]
  }
}

export function useRainViewer() {
  const [radarData, setRadarData] = useState<RainViewerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const fetchRadarData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("https://api.rainviewer.com/public/weather-maps.json")
      if (!response.ok) {
        throw new Error("Failed to fetch radar data")
      }

      const data: RainViewerData = await response.json()
      setRadarData(data)
      
      // Start from the most recent frame
      if (data.radar.past.length > 0) {
        setCurrentFrameIndex(data.radar.past.length - 1)
      }
    } catch (err) {
      console.error("Error fetching RainViewer data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch radar data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRadarData()
  }, [fetchRadarData])

  const allFrames = radarData
    ? [...radarData.radar.past, ...radarData.radar.nowcast]
    : []

  const currentFrame = allFrames[currentFrameIndex] || null

  const getTileUrl = useCallback(
    (frame: RadarFrame | null, tileSize = 256, color = 1) => {
      if (!radarData || !frame) return null
      return `${radarData.host}${frame.path}/${tileSize}/{z}/{x}/{y}/${color}/1_1.png`
    },
    [radarData]
  )

  const nextFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => {
      if (prev >= allFrames.length - 1) return 0
      return prev + 1
    })
  }, [allFrames.length])

  const previousFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => {
      if (prev <= 0) return allFrames.length - 1
      return prev - 1
    })
  }, [allFrames.length])

  const goToFrame = useCallback((index: number) => {
    setCurrentFrameIndex(Math.max(0, Math.min(index, allFrames.length - 1)))
  }, [allFrames.length])

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      nextFrame()
    }, 500) // Change frame every 500ms

    return () => clearInterval(interval)
  }, [isPlaying, nextFrame])

  return {
    radarData,
    loading,
    error,
    currentFrame,
    currentFrameIndex,
    allFrames,
    getTileUrl,
    nextFrame,
    previousFrame,
    goToFrame,
    isPlaying,
    togglePlayback,
    refresh: fetchRadarData,
  }
}
