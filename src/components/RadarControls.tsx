"use client"

import { Play, Pause, SkipBack, SkipForward, RefreshCw } from "lucide-react"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { useTranslations } from "next-intl"

interface RadarControlsProps {
  isPlaying: boolean
  currentFrameIndex: number
  totalFrames: number
  currentFrameTime: number | null
  onTogglePlayback: () => void
  onPreviousFrame: () => void
  onNextFrame: () => void
  onGoToFrame: (index: number) => void
  onRefresh: () => void
  opacity: number
  onOpacityChange: (value: number) => void
}

export function RadarControls({
  isPlaying,
  currentFrameIndex,
  totalFrames,
  currentFrameTime,
  onTogglePlayback,
  onPreviousFrame,
  onNextFrame,
  onGoToFrame,
  onRefresh,
  opacity,
  onOpacityChange,
}: RadarControlsProps) {
  const t = useTranslations("WeatherPage")

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "--:--"
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onPreviousFrame}
            disabled={totalFrames === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onTogglePlayback}
            disabled={totalFrames === 0}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onNextFrame}
            disabled={totalFrames === 0}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {formatTime(currentFrameTime)}
          </span>
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Timeline</span>
          <span>
            {currentFrameIndex + 1} / {totalFrames}
          </span>
        </div>
        <Slider
          value={[currentFrameIndex]}
          min={0}
          max={Math.max(0, totalFrames - 1)}
          step={1}
          onValueChange={(values: number[]) => onGoToFrame(values[0])}
          disabled={totalFrames === 0}
          className="w-full"
        />
      </div>

      {/* Opacity Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Radar Opacity</span>
          <span>{Math.round(opacity * 100)}%</span>
        </div>
        <Slider
          value={[opacity]}
          min={0}
          max={1}
          step={0.1}
          onValueChange={(values: number[]) => onOpacityChange(values[0])}
          className="w-full"
        />
      </div>

      {/* Legend */}
      <div className="pt-2 border-t">
        <div className="text-xs font-medium mb-2">Precipitation Intensity</div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(0, 200, 255, 0.5)" }}></div>
            <span>Light</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(0, 255, 0, 0.5)" }}></div>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(255, 255, 0, 0.5)" }}></div>
            <span>Heavy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "rgba(255, 0, 0, 0.5)" }}></div>
            <span>Extreme</span>
          </div>
        </div>
      </div>
    </div>
  )
}
