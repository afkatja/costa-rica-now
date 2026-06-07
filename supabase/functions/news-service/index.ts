// Main handler for news service edge function

import handleCors, { corsHeaders } from "../_shared/cors.ts"
import { PAGINATION_DEFAULTS } from "./config.ts"
import { generateCacheKey, getCachedData, setCachedData } from "./cache.ts"
import { fetchWithFallback } from "./fetchers.ts"
import type {
  NewsApiResponse,
  NewsCategory,
  NewsLanguage,
  CacheEntry,
} from "./types.ts"

declare const Deno: any

// Validate request parameters
function validateParams(params: any): {
  valid: boolean
  error?: string
  language: NewsLanguage
  category: NewsCategory
  limit: number
  bypassCache: boolean
} {
  const { language, category, limit, bypassCache } = params

  // Validate language
  if (language && language !== "en" && language !== "es") {
    return {
      valid: false,
      error: `Invalid language: ${language}. Must be 'en' or 'es'.`,
      language: "es",
      category: "all",
      limit: PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      bypassCache: false,
    }
  }

  // Validate category
  const validCategories: NewsCategory[] = [
    "all",
    "business",
    "technology",
    "health",
    "science",
    "sports",
    "entertainment",
    "general",
  ]
  if (category && !validCategories.includes(category)) {
    return {
      valid: false,
      error: `Invalid category: ${category}. Must be one of: ${validCategories.join(", ")}.`,
      language: "es",
      category: "all",
      limit: PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      bypassCache: false,
    }
  }

  // Validate limit
  if (limit !== undefined) {
    const numLimit = Number(limit)
    if (
      isNaN(numLimit) ||
      numLimit < 1 ||
      numLimit > PAGINATION_DEFAULTS.MAX_LIMIT
    ) {
      return {
        valid: false,
        error: `Invalid limit: ${limit}. Must be between 1 and ${PAGINATION_DEFAULTS.MAX_LIMIT}.`,
        language: "es",
        category: "all",
        limit: PAGINATION_DEFAULTS.DEFAULT_LIMIT,
        bypassCache: false,
      }
    }
  }

  return {
    valid: true,
    language: (language || "es") as NewsLanguage,
    category: (category || "all") as NewsCategory,
    limit:
      limit !== undefined ? Number(limit) : PAGINATION_DEFAULTS.DEFAULT_LIMIT,
    bypassCache: bypassCache === true,
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) {
    return corsResponse
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Only POST requests are allowed",
          },
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const params = await req.json()
    console.log("[news-service] Request received:", params)

    // Validate parameters
    const validation = validateParams(params)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_PARAMETERS",
            message: validation.error,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const { language, category, limit, bypassCache } = validation

    // Generate cache key
    const cacheKey = generateCacheKey(language, category)

    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = await getCachedData(cacheKey)
      if (cached) {
        console.log("[news-service] Returning cached data")
        return new Response(
          JSON.stringify({
            success: true,
            articles: cached.articles,
            metadata: {
              language,
              category,
              source: "cache",
              cached: true,
              fetchedAt: cached.metadata.fetchedAt,
              cacheExpiresAt: cached.metadata.expiresAt,
              totalResults: cached.articles.length,
            },
          } as NewsApiResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }
    }

    // Fetch from APIs with fallback
    console.log("[news-service] Fetching from APIs")
    const { articles, source } = await fetchWithFallback(
      language,
      category,
      limit,
    )

    // Cache the results
    if (articles.length > 0) {
      const cacheEntry: CacheEntry = {
        articles,
        metadata: {
          source,
          fetchedAt: new Date().toISOString(),
          expiresAt: "", // Will be set by setCachedData
        },
      }
      await setCachedData(cacheKey, cacheEntry)
    }

    // Return response
    const response: NewsApiResponse = {
      success: true,
      articles,
      metadata: {
        language,
        category,
        source,
        cached: false,
        fetchedAt: new Date().toISOString(),
        totalResults: articles.length,
      },
    }

    console.log("[news-service] Response:", {
      source,
      articleCount: articles.length,
      language,
      category,
    })

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[news-service] Error:", error)

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "NEWS_SERVICE_ERROR",
          message: errorMessage,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})
