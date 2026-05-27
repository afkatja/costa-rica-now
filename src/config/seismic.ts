/**
 * Seismic page configuration constants
 */

export const SEISMIC_CONFIG = {
  /** Number of items to display per page */
  ITEMS_PER_PAGE: 10,

  /** Time ranges in milliseconds for filters */
  TIME_RANGES: {
    LAST_24_HOURS: 24 * 60 * 60 * 1000,
    LAST_3_DAYS: 3 * 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
  },

  /** Default time range for API requests (30 days) */
  DEFAULT_TIME_RANGE: 30 * 24 * 60 * 60 * 1000,

  /** Radius for location-based filtering in kilometers */
  LOCATION_RADIUS_KM: 50,

  /** Minimum magnitude for magnitude filter */
  MIN_MAGNITUDE_FILTER: 5,

  /** Filter value string for 5+ magnitude option */
  MAGNITUDE_FILTER_VALUE: "5+",

  /** SWR cache duration in milliseconds */
  SWR_DEDUPING_INTERVAL: 60000,

  /** Debounce delay for filter changes in milliseconds */
  FILTER_DEBOUNCE_DELAY: 300,
} as const

export type SeismicConfig = typeof SEISMIC_CONFIG
