// Costa Rica bounding box coordinates
export const COSTA_RICA_BOUNDS = {
  minLatitude: 8.0,
  maxLatitude: 11.5,
  minLongitude: -86.0,
  maxLongitude: -82.5,
}

export const isWithinCostaRica = ({
  lat,
  lng,
}: {
  lat: number
  lng: number
}): boolean => {
  return (
    lat >= COSTA_RICA_BOUNDS.minLatitude &&
    lat <= COSTA_RICA_BOUNDS.maxLatitude &&
    lng >= COSTA_RICA_BOUNDS.minLongitude &&
    lng <= COSTA_RICA_BOUNDS.maxLongitude
  )
}

export const COSTA_RICA_VOLCANOES = {
  Poás: "345040",
  Arenal: "345033",
  Irazú: "345060",
  Turrialba: "345070",
  "Rincón de la Vieja": "345020",
}

// Volcano coordinates for map display
export const VOLCANO_COORDINATES: Record<string, { lat: number; lng: number }> =
  {
    "345040": { lat: 10.2, lng: -84.233 }, // Poás
    "345033": { lat: 10.463, lng: -84.703 }, // Arenal
    "345060": { lat: 9.979, lng: -83.852 }, // Irazú
    "345070": { lat: 10.025, lng: -83.767 }, // Turrialba
    "345020": { lat: 10.83, lng: -85.324 }, // Rincón de la Vieja
  }
