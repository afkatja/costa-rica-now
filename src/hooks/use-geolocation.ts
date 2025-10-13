import { useState, useEffect, useCallback } from "react"

interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy?: number
}

interface GeolocationState {
  position: GeolocationPosition | null
  error: string | null
  loading: boolean
  permission: "granted" | "denied" | "prompt" | "unknown"
  isInCostaRica: boolean | null
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

// Costa Rica approximate bounds
const COSTA_RICA_BOUNDS = {
  north: 11.2,
  south: 8.0,
  east: -82.5,
  west: -85.9,
}

// Function to check if coordinates are within Costa Rica
const isWithinCostaRica = (lat: number, lng: number): boolean => {
  return (
    lat >= COSTA_RICA_BOUNDS.south &&
    lat <= COSTA_RICA_BOUNDS.north &&
    lng >= COSTA_RICA_BOUNDS.west &&
    lng <= COSTA_RICA_BOUNDS.east
  )
}

// Function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
    permission: "unknown",
    isInCostaRica: null,
  })

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      return "unknown"
    }

    try {
      const permission = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      })
      return permission.state
    } catch (error) {
      console.warn("Could not check geolocation permission:", error)
      return "unknown"
    }
  }, [])

  const getCurrentPosition = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
        loading: false,
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              })
            },
            error => {
              reject(error)
            },
            {
              enableHighAccuracy: options.enableHighAccuracy ?? true,
              timeout: options.timeout ?? 10000,
              maximumAge: options.maximumAge ?? 300000, // 5 minutes
            }
          )
        }
      )

      const isInCostaRica = isWithinCostaRica(
        position.latitude,
        position.longitude
      )
      const permission = await checkPermission()

      setState({
        position,
        error: null,
        loading: false,
        permission,
        isInCostaRica,
      })
    } catch (error: any) {
      let errorMessage = "Unable to get your location"

      if (error.code === 1) {
        errorMessage =
          "Location access denied. Please allow location access to get personalized recommendations."
      } else if (error.code === 2) {
        errorMessage =
          "Location unavailable. Please check your device settings."
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again."
      }

      const permission = await checkPermission()

      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        permission,
      }))
    }
  }, [options, checkPermission])

  const requestLocation = useCallback(async () => {
    await getCurrentPosition()
  }, [getCurrentPosition])

  // Check if location is within specified radius of a point
  const isWithinRadius = useCallback(
    (targetLat: number, targetLng: number, radiusKm: number = 100) => {
      if (!state.position) return false

      const distance = calculateDistance(
        state.position.latitude,
        state.position.longitude,
        targetLat,
        targetLng
      )

      return distance <= radiusKm
    },
    [state.position]
  )

  // Get location-based context for queries
  const getLocationContext = useCallback(() => {
    if (!state.position || !state.isInCostaRica) {
      return null
    }

    return {
      latitude: state.position.latitude,
      longitude: state.position.longitude,
      accuracy: state.position.accuracy,
      isInCostaRica: state.isInCostaRica,
      radiusKm: 100, // Default radius for filtering
    }
  }, [state.position, state.isInCostaRica])

  // Check permission on mount
  useEffect(() => {
    checkPermission().then(permission => {
      setState(prev => ({ ...prev, permission }))
    })
  }, [checkPermission])

  return {
    ...state,
    requestLocation,
    isWithinRadius,
    getLocationContext,
    checkPermission,
  }
}

export type { GeolocationPosition, GeolocationState }
