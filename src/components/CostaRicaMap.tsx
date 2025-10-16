import GoogleMapsWrapper from "./GoogleMapsWrapper"

interface CostaRicaMapProps {
  children?: React.ReactNode
  className?: string
}

export function CostaRicaMap({ children, className = "" }: CostaRicaMapProps) {
  return (
    <div
      className={`relative w-full h-[700px] bg-blue-50 rounded-lg border ${className}`}
    >
      <GoogleMapsWrapper />
    </div>
  )
}

// Helper function to convert lat/lng to SVG coordinates
export function coordsToSVG(
  lat: number,
  lng: number
): { x: number; y: number } {
  // Costa Rica approximate bounds: 8.0-11.5°N, 82.5-86°W
  const minLat = 8.0
  const maxLat = 11.5
  const minLng = -86.0
  const maxLng = -82.5

  // Map to SVG viewBox (0-400, 0-200)
  const x = ((lng - minLng) / (maxLng - minLng)) * 350 + 25
  const y = ((maxLat - lat) / (maxLat - minLat)) * 150 + 25

  return { x, y }
}
