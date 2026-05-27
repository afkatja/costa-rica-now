/**
 * Seismic-related constants
 * Extracted magic numbers for better maintainability
 */

// Distance thresholds in kilometers
export const DISTANCE_THRESHOLDS = {
  DEFAULT_RADIUS: 50,
  NEARBY_RADIUS: 10,
  FAR_RADIUS: 100, // Match BUSINESS_CONFIG.distances.far
} as const

// Time-related constants in milliseconds
export const TIME_CONSTANTS = {
  FIVE_MINUTES: 300000, // 5 minutes in ms
  ONE_HOUR: 3600000, // 1 hour in ms
  ONE_DAY: 86400000, // 24 hours in ms
  SEVEN_DAYS: 604800000, // 7 days in ms
} as const

// Magnitude thresholds
export const MAGNITUDE_THRESHOLDS = {
  SIGNIFICANT: 6.0,
  MODERATE: 4.5,
  LIGHT: 3.0,
  MINOR_DIFFERENCE: 0.3,
  FILTER_MINIMUM: 5.0,
} as const

// Pagination constants
export const PAGINATION = {
  DEFAULT_ITEMS_PER_PAGE: 20,
  MAX_ITEMS_PER_PAGE: 100,
} as const

// Geolocation constants
export const GEOLOCATION = {
  DEFAULT_TIMEOUT: 10000,
  DEFAULT_MAXIMUM_AGE: 300000, // 5 minutes
  DEFAULT_ENABLE_HIGH_ACCURACY: true,
} as const
