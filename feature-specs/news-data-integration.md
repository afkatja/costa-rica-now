# Feature Spec: Real News Data Integration for Costa Rica

## 0. Architecture notes

- Notes file: TODO: Create ./architecture-notes/news-data-integration.md

## 1. Problem & context

- Business problem: The NewsPage component currently displays mock data with hardcoded Spanish messages, providing no real value to users who want actual news about Costa Rica.
- Who is affected: Users visiting the news section who expect current, real news about Costa Rica in both English and Spanish.
- Current behavior: NewsPage uses mockNewsData with static, hardcoded Spanish articles and category labels. No translation support exists for English users.
- Desired behavior: NewsPage fetches real news articles about Costa Rica from newsdata.io (primary) with newsapi.ai as backup, supports both English and Spanish languages, includes Redis caching for performance, and follows the established Supabase edge function pattern used by seismic-service and weather-service-enhanced.

## 2. User stories

- As a user, I want to see real news articles about Costa Rica so that I can stay informed about current events in the country.
- As a user, I want to read news in my preferred language (English or Spanish) so that I can understand the content.
- As a developer, I want the news service to follow the existing edge function pattern so that the codebase remains consistent.
- As a system, I want Redis caching to reduce API calls and improve response times.

## 3. Scope & out of scope

### In scope

- Create Supabase edge function `news-service` following seismic-service/weather-service-enhanced patterns
- Integrate newsdata.io API as primary news source for Costa Rica
- Integrate newsapi.ai as backup API when newsdata.io fails
- Support both English and Spanish news articles
- Implement Redis caching layer with configurable TTL
- Update NewsPage component to fetch from the new edge function

- Support news categories: all, business, technology, health, science, sports, entertainment, general
- Implement retry logic similar to seismic-service
- Add error handling and graceful degradation

### Out of scope

- News article search functionality
- User-specific news personalization
- News bookmarking or saving
- Social sharing features
- News notifications or alerts
- Historical news archive
- News source filtering beyond category/language

## 4. Functional requirements

- FR1: The news-service edge function must fetch news articles about Costa Rica from newsdata.io API
- FR2: The news-service must fall back to newsapi.ai if newsdata.io fails or returns no results
- FR3: The news-service must support language parameter (en/es) to fetch articles in the specified language
- FR4: The news-service must support category parameter to filter by news category
- FR5: The news-service must implement Redis caching with configurable TTL (default 15 minutes)
- FR6: The news-service must implement retry logic with exponential backoff for API failures
- FR7: The NewsPage component must fetch data from the news-service edge function instead of mock data
- FR8: The NewsPage must provide language toggle between English and Spanish
- FR9: Category labels must be translated based on selected language
- FR10: The service must return articles in a consistent format matching the existing NewsPage structure

### Inputs

- Language: `en` or `es` (default: `es`)
- Category: `all`, `business`, `technology`, `health`, `science`, `sports`, `entertainment`, `general` (default: `all`)
- Limit: number of articles to return (default: 20)
- Cache bypass: boolean to skip Redis cache (default: false)

### Outputs

- Array of news articles with structure:
  - title: string
  - description: string
  - url: string
  - urlToImage: string (nullable)
  - publishedAt: ISO 8601 datetime string
  - source: { name: string }
  - language: string
  - category: string

### Error states

- API key not configured: Return 500 with error message
- Both APIs failed: Return cached data if available, otherwise return empty array with error metadata
- Invalid language/category: Return 400 with validation error
- Rate limit exceeded: Return cached data if available, otherwise return 429 with retry-after header

## 5. Non-functional requirements

- Performance: API response time under 2 seconds (with cache), under 5 seconds (without cache)
- Security / auth: API keys stored in Supabase environment variables, never exposed to client
- UX / accessibility: Language toggle accessible via keyboard, proper ARIA labels, loading states displayed
- Observability: Log API failures, cache hits/misses, fallback triggers, and response times

## 6. Data model & contracts

- Data model changes:
  - New/updated entities: None (client-side only)
- API / function contracts:
  - Endpoint or function name: Supabase edge function `news-service`
  - Request shape:
    ```json
    {
      "language": "en" | "es",
      "category": "all" | "business" | "technology" | "health" | "science" | "sports" | "entertainment" | "general",
      "limit": number,
      "bypassCache": boolean
    }
    ```
  - Response shape:
    ```json
    {
      "success": true,
      "articles": [
        {
          "title": string,
          "description": string,
          "url": string,
          "urlToImage": string | null,
          "publishedAt": string,
          "source": { "name": string },
          "language": string,
          "category": string
        }
      ],
      "metadata": {
        "language": string,
        "category": string,
        "source": "newsdata.io" | "newsapi.ai" | "cache",
        "cached": boolean,
        "fetchedAt": string,
        "cacheExpiresAt": string
      }
    }
    ```
  - Status / error codes:
    - 200: Success
    - 400: Invalid request parameters
    - 429: Rate limit exceeded
    - 500: Server error or API configuration issue

## 7. Edge cases & constraints

- Edge case: newsdata.io returns zero results for a category/language combination
  - Action: Fall back to newsapi.ai
- Edge case: Both APIs return zero results
  - Action: Return empty array with metadata explaining no articles found
- Edge case: Redis cache unavailable
  - Action: Proceed with API fetch without caching, log warning
- Edge case: Article missing image URL
  - Action: Set urlToImage to null, handle in UI with fallback image
- Edge case: Published date missing or invalid
  - Action: Use current date as fallback, log warning
- Constraints:
  - newsdata.io API rate limit: Check API documentation for limits
  - newsapi.ai API rate limit: Check API documentation for limits
  - Redis TTL: Default 15 minutes, configurable via environment variable
  - Max articles per request: Default 20, maximum 100

## 8. Acceptance criteria

- A1: Given the news-service is deployed, when a user requests news with language=es and category=all, then the service returns real Spanish news articles about Costa Rica from newsdata.io.
- A2: Given newsdata.io API fails, when a user requests news, then the service falls back to newsapi.ai and returns articles from the backup source.
- A3: Given a user has previously fetched news, when the same request is made within cache TTL, then the service returns cached data without calling external APIs.
- A4: Given the NewsPage component, when it loads, then it fetches real news from the news-service edge function instead of displaying mock data.
- A5: Given the NewsPage, when a user toggles language to English, then category labels change to English and articles are fetched in English.
- A6: Given the NewsPage, when a user selects a category, then only articles from that category are displayed.
- A7: Given an API error occurs, when the service cannot fetch from either source, then it returns a graceful error response with metadata about the failure.

## 9. Open questions

- What are the specific API endpoints and authentication methods for newsdata.io and newsapi.ai?
- What are the rate limits for both news APIs?
- Should the cache key include the category parameter, or should we cache all categories separately?
- What is the preferred Redis instance/hosting (Supabase Redis, external Redis, or Upstash)?
- Should we implement a staggered cache refresh strategy (refresh cache in background before expiry)?
- What is the maximum number of articles we should return per category?
