// Type definitions for news service

export type NewsCategory =
  | 'all'
  | 'business'
  | 'technology'
  | 'health'
  | 'science'
  | 'sports'
  | 'entertainment'
  | 'environment'
  | 'top'

export type NewsLanguage = 'en' | 'es'

export type NewsSource = 'newsdata_io' | 'newsapi_ai' | 'cache'

export interface NewsArticle {
  title: string
  description: string
  url: string
  urlToImage: string | null
  publishedAt: string
  source: {
    name: string
  }
  language: string
  category: string
}

export interface NewsApiParams {
  language: NewsLanguage
  category: NewsCategory
  page?: string
  bypassCache?: boolean
}

export interface NewsApiResponse {
  success: boolean
  articles: NewsArticle[]
  nextPage: string | null
  metadata: NewsResponseMetadata
}

export interface NewsResponseMetadata {
  language: string
  category: string
  source: NewsSource
  cached: boolean
  fetchedAt: string
  cacheExpiresAt?: string
  totalResults?: number
}

export interface NewsErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

// newsdata.io API response types
export interface NewsDataIOResponse {
  status: string
  totalResults: number
  results: NewsDataIOArticle[]
  nextPage: string | null
}

export interface NewsDataIOArticle {
  title: string
  description: string
  link: string
  image_url: string | null
  pubDate: string
  source_id: string
  source_name: string
  country: string[]
  category: string[]
  language: string
}

// newsapi.ai (Event Registry) API response types
export interface NewsApiAIResponse {
  articles: {
    results: NewsApiAIArticle[]
    totalResults: number
  }
}

export interface NewsApiAIArticle {
  uri: string
  title: string
  body: string
  date: string
  url: string
  image: string
  source: {
    uri: string
    title: string
  }
  sentiment: number
  lang: string
}

// Cache entry type
export interface CacheEntry {
  articles: NewsArticle[]
  metadata: {
    source: NewsSource
    fetchedAt: string
    expiresAt: string
  }
}
