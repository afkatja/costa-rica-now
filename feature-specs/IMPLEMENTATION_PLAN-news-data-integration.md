# Implementation Plan: Real News Data Integration for Costa Rica

## 1. Feature overview

- Related spec: ./feature-specs/news-data-integration.md
- Goal: Replace mock news data with real news articles from newsdata.io (primary) and newsapi.ai (backup), supporting both English and Spanish, with Redis caching
- User-facing outcome: Users will see real, current news about Costa Rica in their preferred language (English or Spanish) with proper category filtering
- Risk level: Medium (requires external API integration and Redis setup)

## 2. Acceptance criteria summary

- A1: Service returns real Spanish news from newsdata.io when language=es, category=all
- A2: Service falls back to newsapi.ai when newsdata.io fails
- A3: Service returns cached data within TTL without external API calls
- A4: NewsPage fetches real news from news-service instead of mock data
- A5: NewsPage supports language selection
- A6: Category selection filters articles appropriately
- A7: Graceful error response when both APIs fail

## 3. Relevant codebase context

- Existing modules / components involved:
  - `src/components/NewsPage.tsx` - Current consumer using mock data
  - `src/utils/mockNewsData.ts` - Mock data to be replaced
  - `supabase/functions/seismic-service/` - Pattern for multi-source API integration with retry logic
  - `supabase/functions/weather-service-enhanced/` - Pattern for simpler single-API integration
  - `supabase/functions/_shared/` - Shared utilities (cors, edge-handler, types)
- Existing tests related to this area: None identified for news functionality
- Relevant configs / schemas / contracts:
  - Supabase edge function pattern (Deno.serve with withEdgeHandler wrapper)
  - TypeScript types in _shared/types.ts
- Existing patterns to follow:
  - Use `withEdgeHandler` from _shared/edge-handler.ts for CORS and auth
  - Use `corsHeaders` from _shared/cors.ts
  - Follow seismic-service pattern for config.ts, types.ts, retry.ts modules
  - Use fetchWithRetry for API calls with exponential backoff
  - Return structured responses with metadata

## 4. Proposed approach

- Create new Supabase edge function `news-service` following seismic-service structure
- Implement config.ts with API endpoints, retry config, cache TTL
- Implement types.ts for news article structure matching existing NewsPage format
- Implement cache.ts for Redis integration (new module, not in seismic-service)
- Implement newsdata.io fetcher with retry logic
- Implement newsapi.ai fetcher as backup
- Implement main index.ts with fallback logic and cache integration
- Update NewsPage.tsx to call edge function instead of using mock data
- Add language state and toggle UI to NewsPage
- Add translation object for category labels

This is the smallest viable solution because:
- Reuses existing patterns (seismic-service structure, shared utilities)
- Minimal changes to NewsPage (replace mock import with API call, add language toggle)
- No database schema changes
- No new frontend dependencies

## 5. Files likely to change

- `supabase/functions/news-service/index.ts` — New edge function main handler
- `supabase/functions/news-service/config.ts` — New configuration constants
- `supabase/functions/news-service/types.ts` — New type definitions
- `supabase/functions/news-service/cache.ts` — New Redis caching module
- `supabase/functions/news-service/fetchers.ts` — New API fetcher functions
- `supabase/functions/news-service/deno.json` — New Deno configuration
- `src/components/NewsPage.tsx` — Replace mock data with API call, add language toggle
- `src/utils/mockNewsData.ts` — Keep for fallback/reference, but not used in production

## 6. Implementation steps

1. Create news-service directory structure under supabase/functions/
2. Create config.ts with API endpoints, retry config, cache TTL, category mappings
3. Create types.ts for NewsArticle, NewsCategory, NewsApiResponse matching existing structure
4. Create cache.ts module for Redis operations (get, set, delete, cache key generation)
5. Create fetchers.ts with fetchNewsDataIO (primary) and fetchNewsAIAI (backup) functions
6. Create index.ts main handler with:
   - Request validation
   - Cache check (if not bypassed)
   - Primary API call with retry
   - Backup API call if primary fails
   - Cache write on successful fetch
   - Response formatting with metadata
7. Create deno.json with import map for dependencies
8. Update NewsPage.tsx:
   - Add language state (en/es)
   - Add language toggle UI component
   - Replace mockNewsData import with API call to news-service
   - Add translation object for category labels
   - Update category change handler to fetch from API
9. Add NEWSDATAIO_API_KEY and NEWSAPIAI_API_KEY to environment variables
10. Add REDIS_URL to environment variables for cache connection
11. Test edge function locally with Supabase CLI
12. Test NewsPage integration in development

## 7. Validation plan

- Tests to add or update:
  - Unit tests for cache.ts (Redis operations)
  - Unit tests for fetchers.ts (API integration with mocked responses)
  - Integration tests for index.ts (end-to-end request handling)
- Commands to run:
  - `supabase functions serve news-service` - Local edge function testing
  - `npm run build` - Verify TypeScript compilation
  - `npm run lint` - Verify code quality
- Manual verification:
  - Test news-service with curl/Postman for both languages and categories
  - Verify cache hit/miss behavior
  - Verify fallback to newsapi.ai when newsdata.io fails
  - Test NewsPage in browser with language toggle
  - Verify category filtering works
  - Verify error states display appropriately

## 8. Regression risks

- Risk 1: NewsPage component breaking if edge function is unavailable - mitigated by graceful degradation
- Risk 2: Redis connection failure causing service degradation - mitigated by continuing without cache
- Risk 3: API rate limits causing 429 errors - mitigated by retry logic and cache
- Risk 4: Language toggle state not persisting across navigation - acceptable for MVP
- Risk 5: Category labels not translating correctly - mitigated by translation object

## 9. Open questions and assumptions

- Assumptions:
  - newsdata.io API uses API key authentication (need to verify)
  - newsapi.ai API uses API key authentication (need to verify)
  - Redis instance is available (Supabase Redis or external)
  - Both APIs support country=CR or similar geolocation filter
  - Both APIs support language parameter (en/es)
  - Both APIs support category filtering
- Open questions:
  - What are the exact API endpoints and authentication methods for newsdata.io and newsapi.ai?
  - What are the rate limits for both APIs?
  - What Redis instance should be used (Supabase Redis, Upstash, or self-hosted)?
  - Should cache key include category parameter or cache all categories together?
  - What is the maximum number of articles to return per category?

## 10. Approval gates

- [x] Schema or migration change - None required
- [x] Public API contract change - New edge function, not breaking existing contracts
- [x] Broad refactor across multiple subsystems - No, isolated to news functionality
- [x] Destructive or irreversible change - No
- [x] New dependency introduction - Yes (newsdata.io, newsapi.ai APIs, Redis client)

**Special approval gates identified:**
- New external API dependencies (newsdata.io, newsapi.ai) require API keys
- Redis dependency requires infrastructure setup
- Environment variable additions required
