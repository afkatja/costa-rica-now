/**
 * Centralized application configuration
 * Consolidates all hardcoded values and settings
 */

// =============================================================================
// REGIONAL CONFIGURATION
// =============================================================================

export const REGION_CONFIG = {
  // Costa Rica bounds and location data
  COSTA_RICA: {
    name: "Costa Rica",
    bounds: {
      north: 11.2,
      south: 8.0,
      east: -82.5,
      west: -85.9,
    },
    defaultCenter: {
      lat: 9.7489,
      lng: -83.7534,
    },
    defaultRadius: 100, // km
  },
} as const

// =============================================================================
// LOCALIZATION CONFIGURATION
// =============================================================================

export const LOCALE_CONFIG = {
  // Default locale settings
  default: "es",
  supported: ["es", "en"] as const,
  
  // Date/time formatting by locale
  dateTimeFormat: {
    "es-CR": {
      date: {
        year: "numeric",
        month: "short",
        day: "numeric",
      } as const,
      time: {
        hour: "2-digit",
        minute: "2-digit",
      } as const,
      full: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      } as const,
    },
    "en-US": {
      date: {
        year: "numeric",
        month: "long",
        day: "numeric",
      } as const,
      time: {
        hour: "2-digit",
        minute: "2-digit",
      } as const,
      full: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      } as const,
    },
  },
} as const

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const API_CONFIG = {
  // timeouts and limits
  timeouts: {
    default: 10000,
    geolocation: 10000,
    radar: 30000,
    weather: 15000,
  },
  
  // pagination and data limits
  limits: {
    itemsPerPage: 20,
    maxItemsPerPage: 100,
    toastLimit: 1,
    debounceDelay: 300,
    newsSimulateDelay: 500,
  },
  
  // retry configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
  },
  
  // cache settings
  cache: {
    toastRemoveDelay: 1000000,
    geolocationMaximumAge: 300000, // 5 minutes
  },
} as const

// =============================================================================
// UI CONFIGURATION
// =============================================================================

export const UI_CONFIG = {
  // animation and transitions
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
  },
  
  // breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // spacing
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
} as const

// =============================================================================
// BUSINESS LOGIC CONFIGURATION
// =============================================================================

export const BUSINESS_CONFIG = {
  // Earth radius for distance calculations
  EARTH_RADIUS_KM: 6371,
  
  // Distance thresholds
  distances: {
    nearby: 10, // km
    default: 50, // km
    far: 100, // km
  },
  
  // Seismic thresholds
  seismic: {
    significantMagnitude: 6.0,
    moderateMagnitude: 4.5,
    lightMagnitude: 3.0,
    filterMinimum: 5.0,
  },
  
  // Time ranges
  timeRanges: {
    oneHour: 3600000, // ms
    oneDay: 86400000, // ms
    sevenDays: 604800000, // ms
  },
} as const

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const FEATURE_FLAGS = {
  enableHighAccuracyGeolocation: true,
  enableRadarCaching: true,
  enableWeatherOptimization: true,
  enableSeismicFiltering: true,
} as const

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const

// =============================================================================
// CONFIGURATION GETTERS
// =============================================================================

/**
 * Get locale-specific date/time format
 */
export function getDateTimeFormat(locale: string = "es-CR") {
  return LOCALE_CONFIG.dateTimeFormat[locale as keyof typeof LOCALE_CONFIG.dateTimeFormat] || LOCALE_CONFIG.dateTimeFormat["es-CR"]
}

/**
 * Get timeout value by type
 */
export function getTimeout(type: keyof typeof API_CONFIG.timeouts) {
  return API_CONFIG.timeouts[type]
}

/**
 * Get limit value by type
 */
export function getLimit(type: keyof typeof API_CONFIG.limits) {
  return API_CONFIG.limits[type]
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS) {
  return FEATURE_FLAGS[feature]
}
