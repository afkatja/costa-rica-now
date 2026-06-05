// Configuration constants for seismic service

// Deduplication thresholds
export const DEDUPLICATION_THRESHOLDS = {
  TIME_MS: 300000, // 5 minutes in milliseconds
  DISTANCE_KM: 10, // 10 kilometers
  MAGNITUDE_DIFF: 0.3, // Magnitude difference threshold
} as const

// API retry configuration
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000, // 1 second
  MAX_DELAY_MS: 10000, // 10 seconds
  BACKOFF_FACTOR: 2, // Exponential backoff factor
} as const

// API request timeouts
export const TIMEOUT_CONFIG = {
  USGS_TIMEOUT_MS: 15000, // 15 seconds
  OVSICORI_TIMEOUT_MS: 20000, // 20 seconds
  RSN_TIMEOUT_MS: 25000, // 25 seconds
} as const

// Magnitude filters
export const MAGNITUDE_FILTERS = {
  DEFAULT_MIN: 2.5,
  OVSICORI_MIN: 2.5,
  USGS_MIN: 2.5,
  RSN_MIN: 2.5,
} as const

// Source priority for deduplication (higher number = higher priority)
export const SOURCE_PRIORITY = {
  rsn: 3,
  ovsicori: 2,
  usgs: 1,
  manual: 0,
} as const

// API endpoints
export const API_ENDPOINTS = {
  USGS: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  OVSICORI: 'https://www.ovsicori.una.ac.cr/sistemas/sentidos_map/indexleqs.php',
  RSN: 'https://www.isc.ac.uk/fdsnws/event/1/query',
} as const

// Request headers for different APIs
export const REQUEST_HEADERS = {
  DEFAULT: {
    'User-Agent': 'Supabase-Edge-Function/1.0',
  },
  BROWSER_LIKE: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
  },
  MINIMAL: {
    'User-Agent': 'Mozilla/5.0 (compatible)',
  },
  SEISMIC_SERVICE: {
    'User-Agent': 'Mozilla/5.0 (compatible; SeismicService/1.0)',
    'Accept': 'application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
} as const

// Date range adjustments for filtering
export const DATE_RANGE_CONFIG = {
  FILTER_EXTENSION_MONTHS: 1, // How many months to extend date range when filters are applied
  COSTA_RICA_TIMEZONE_OFFSET: -6, // Hours from UTC
} as const

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0,
  MAX_LIMIT: 1000,
} as const
