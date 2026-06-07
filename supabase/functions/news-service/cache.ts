import { redisGet, redisSet, redisDel, redisFlush } from '../_shared/redis-cache.ts'
import { CACHE_CONFIG } from './config.ts'
import type { CacheEntry, NewsCategory, NewsLanguage } from './types.ts'

export function generateCacheKey(
  language: NewsLanguage,
  category: NewsCategory,
): string {
  return `${CACHE_CONFIG.CACHE_KEY_PREFIX}${language}:${category}`
}

export async function getCachedData(
  key: string,
): Promise<CacheEntry | null> {
  const data = await redisGet<CacheEntry>(key)
  if (!data) return null

  if (new Date(data.metadata.expiresAt) < new Date()) {
    console.log(`[cache] Cache expired for key ${key}`)
    return null
  }

  console.log(`[cache] Cache hit for key ${key}`)
  return data
}

export async function setCachedData(
  key: string,
  data: CacheEntry,
  ttlSeconds: number = CACHE_CONFIG.DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  data.metadata.expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  const ok = await redisSet(key, data, ttlSeconds)
  if (ok) console.log(`[cache] Cached key ${key} (TTL: ${ttlSeconds}s)`)
  return ok
}

export async function deleteCachedData(key: string): Promise<boolean> {
  return redisDel(key)
}

export async function clearNewsCache(): Promise<boolean> {
  return redisFlush(`${CACHE_CONFIG.CACHE_KEY_PREFIX}*`)
}
