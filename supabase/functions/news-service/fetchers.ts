// API fetchers for newsdata.io and newsapi.ai

import {
  API_ENDPOINTS,
  CATEGORY_MAPPINGS,
  COUNTRY_CODE,
  LANGUAGE_CODES,
  REQUEST_HEADERS,
  TIMEOUT_CONFIG,
} from "./config.ts"
import type {
  NewsArticle,
  NewsCategory,
  NewsDataIOArticle,
  NewsDataIOResponse,
  NewsApiAIArticle,
  NewsApiAIResponse,
  NewsLanguage,
} from "./types.ts"

declare const Deno: any

// Transform newsdata.io article to unified format
function transformNewsDataIOArticle(
  article: NewsDataIOArticle,
  category: NewsCategory,
): NewsArticle {
  return {
    title: article.title || "",
    description: article.description || "",
    url: article.link || "",
    urlToImage: article.image_url || null,
    publishedAt: article.pubDate || new Date().toISOString(),
    source: {
      name: article.source_name || "Unknown",
    },
    language: article.language || "en",
    category: category,
  }
}

// Transform newsapi.ai article to unified format
function transformNewsApiAIArticle(
  article: NewsApiAIArticle,
  category: NewsCategory,
): NewsArticle {
  return {
    title: article.title || "",
    description: article.body || "",
    url: article.url || "",
    urlToImage: article.image || null,
    publishedAt: article.date || new Date().toISOString(),
    source: {
      name: article.source?.title || "Unknown",
    },
    language: article.lang === "spa" ? "es" : "en",
    category: category,
  }
}

// Fetch from newsdata.io API
export async function fetchNewsDataIO(
  language: NewsLanguage,
  category: NewsCategory,
  limit: number,
): Promise<NewsArticle[]> {
  const apiKey = Deno.env.get("NEWSDATAIO_API_KEY")

  if (!apiKey) {
    throw new Error("NEWSDATAIO_API_KEY not configured")
  }

  const categoryParam =
    CATEGORY_MAPPINGS.newsdata[
      category as keyof typeof CATEGORY_MAPPINGS.newsdata
    ]
  const languageParam = LANGUAGE_CODES[language]

  const queryParams = new URLSearchParams({
    apikey: apiKey,
    language: languageParam,
    country: COUNTRY_CODE,
  })

  if (categoryParam) {
    queryParams.append("category", categoryParam)
  }

  const url = `${API_ENDPOINTS.NEWSDATA_IO}?${queryParams.toString()}`

  console.log("[fetchers] Fetching from newsdata.io:", {
    url: url.replace(apiKey, "***"),
    language,
    category,
    limit,
  })

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS.DEFAULT,
      signal: AbortSignal.timeout(TIMEOUT_CONFIG.NEWSDATA_IO_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `newsdata.io API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const data: NewsDataIOResponse = await response.json()

    if (data.status !== "success") {
      throw new Error(`newsdata.io API returned status: ${data.status}`)
    }

    console.log("[fetchers] newsdata.io success:", {
      totalResults: data.totalResults,
      returned: Math.min(data.results.length, limit),
    })

    // Transform and limit results
    const transformed = data.results
      .map(article => transformNewsDataIOArticle(article, category))
      .slice(0, limit)

    return transformed
  } catch (error) {
    console.error("[fetchers] newsdata.io fetch error:", error)
    throw error
  }
}

// Fetch from newsapi.ai (Event Registry) API
export async function fetchNewsApiAI(
  language: NewsLanguage,
  category: NewsCategory,
  limit: number,
): Promise<NewsArticle[]> {
  const apiKey = Deno.env.get("NEWSAPIAI_API_KEY")

  if (!apiKey) {
    throw new Error("NEWSAPIAI_API_KEY not configured")
  }

  // Map our language codes to Event Registry ISO 639-2 codes
  const langMap: Record<NewsLanguage, string> = { en: "eng", es: "spa" }
  const targetLang = langMap[language]

  const requestBody = {
    query: {
      $query: {
        $and: [
          {
            locationUri: "http://en.wikipedia.org/wiki/Costa_Rica",
          },
          {
            $or: [{ lang: targetLang }],
          },
        ],
      },
      $filter: {
        forceMaxDataTimeWindow: "31",
      },
    },
    resultType: "articles",
    articlesSortBy: "date",
    articlesCount: limit,
    apiKey,
  }

  console.log("[fetchers] Fetching from newsapi.ai (Event Registry):", {
    language,
    category,
    limit,
  })

  try {
    const response = await fetch(API_ENDPOINTS.NEWSAPI_AI, {
      method: "POST",
      headers: {
        ...REQUEST_HEADERS.DEFAULT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(TIMEOUT_CONFIG.NEWSAPI_AI_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `newsapi.ai API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const data: NewsApiAIResponse = await response.json()

    if (!data.articles?.results) {
      console.warn("[fetchers] newsapi.ai returned unexpected structure:", {
        hasArticles: !!data.articles,
      })
      return []
    }

    console.log("[fetchers] newsapi.ai success:", {
      totalResults: data.articles.totalResults,
      returned: data.articles.results.length,
    })

    // Transform results
    const transformed = data.articles.results
      .map(article => transformNewsApiAIArticle(article, category))
      .slice(0, limit)

    return transformed
  } catch (error) {
    console.error("[fetchers] newsapi.ai fetch error:", error)
    throw error
  }
}

// Fetch with fallback to backup API
export async function fetchWithFallback(
  language: NewsLanguage,
  category: NewsCategory,
  limit: number,
): Promise<{ articles: NewsArticle[]; source: "newsdata_io" | "newsapi_ai" }> {
  // Try newsdata.io first
  try {
    const articles = await fetchNewsDataIO(language, category, limit)
    return { articles, source: "newsdata_io" }
  } catch (error) {
    console.warn(
      "[fetchers] newsdata.io failed, falling back to newsapi.ai:",
      error,
    )

    // Fall back to newsapi.ai
    try {
      const articles = await fetchNewsApiAI(language, category, limit)
      return { articles, source: "newsapi_ai" }
    } catch (fallbackError) {
      console.error("[fetchers] Both APIs failed:", {
        primary: error instanceof Error ? error.message : String(error),
        backup:
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError),
      })
      throw new Error(
        `Both news APIs failed. Primary: ${error instanceof Error ? error.message : String(error)}. Backup: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      )
    }
  }
}
