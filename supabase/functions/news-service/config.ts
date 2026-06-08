// Configuration constants for news service

// API endpoints
export const API_ENDPOINTS = {
  NEWSDATA_IO: "https://newsdata.io/api/1/news",
  NEWSAPI_AI: "https://eventregistry.org/api/v1/article/getArticles",
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
  NEWSDATA_IO_TIMEOUT_MS: 15000, // 15 seconds
  NEWSAPI_AI_TIMEOUT_MS: 15000, // 15 seconds
} as const

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL_SECONDS: 900, // 15 minutes
  CACHE_KEY_PREFIX: "news:",
} as const

// Language codes
export const LANGUAGE_CODES = {
  en: "en",
  es: "es",
} as const

// Country code for Costa Rica
export const COUNTRY_CODE = "cr"

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const

// Request headers
export const REQUEST_HEADERS = {
  DEFAULT: {
    "User-Agent": "Supabase-Edge-Function/1.0",
    Accept: "application/json",
  },
} as const

// Source priority (higher number = higher priority)
export const SOURCE_PRIORITY = {
  newsdata_io: 2,
  newsapi_ai: 1,
} as const

// Base category mappings (shared between APIs when no translation is needed)
const BASE_CATEGORY_MAPPINGS = {
  all: "",
  business: "business",
  technology: "technology",
  health: "health",
  science: "science",
  sports: "sports",
  entertainment: "entertainment",
  environment: "environment",
  top: "top",
} as const

// Category mappings for newsdata.io
export const CATEGORY_MAPPINGS = {
  newsdata: { ...BASE_CATEGORY_MAPPINGS },
} as const
