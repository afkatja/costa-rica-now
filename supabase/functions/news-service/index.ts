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
  page: string | undefined
  bypassCache: boolean
} {
  const { language, category, page, bypassCache } = params

  // Validate language
  if (language && language !== "en" && language !== "es") {
    return {
      valid: false,
      error: `Invalid language: ${language}. Must be 'en' or 'es'.`,
      language: "es",
      category: "all",
      limit: PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      page: undefined,
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
    "environment",
    "top",
  ]
  if (category && !validCategories.includes(category)) {
    return {
      valid: false,
      error: `Invalid category: ${category}. Must be one of: ${validCategories.join(", ")}.`,
      language: "es",
      category: "all",
      limit: PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      page: undefined,
      bypassCache: false,
    }
  }

  return {
    valid: true,
    language: (language || "es") as NewsLanguage,
    category: (category || "all") as NewsCategory,
    limit: PAGINATION_DEFAULTS.DEFAULT_LIMIT,
    page: page || undefined,
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

    const { language, category, limit, page, bypassCache } = validation

    // Fetch from APIs with fallback
    console.log("[news-service] Fetching from APIs")
    const { articles, nextPage, source } = await fetchWithFallback(
      language,
      category,
      limit,
      page,
    )

    // Cache first page results
    if (articles.length > 0 && !page) {
      const cacheKey = generateCacheKey(language, category)
      const cacheEntry: CacheEntry = {
        articles,
        metadata: {
          source,
          fetchedAt: new Date().toISOString(),
          expiresAt: "",
        },
      }
      await setCachedData(cacheKey, cacheEntry)
    }

    // Return response
    const response: NewsApiResponse = {
      success: true,
      articles,
      nextPage,
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
      nextPage,
      language,
      category,
      page,
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
