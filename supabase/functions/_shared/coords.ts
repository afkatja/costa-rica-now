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
    lat >= COSTA_RICA_BOUNDS.maxLatitude &&
    lat <= COSTA_RICA_BOUNDS.minLatitude &&
    lng >= COSTA_RICA_BOUNDS.maxLongitude &&
    lng <= COSTA_RICA_BOUNDS.minLongitude
  )
}

export const COSTA_RICA_VOLCANOES = {
  Poás: "345040",
  Arenal: "345033",
  Irazú: "345060",
  Turrialba: "345070",
  "Rincón de la Vieja": "345020",
}
