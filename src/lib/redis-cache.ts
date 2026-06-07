import { kv } from '@vercel/kv'

let useExternalStore = false

try {
  useExternalStore = !!(process.env.KV_URL || process.env.KV_REST_API_URL)
} catch {
  useExternalStore = false
}

const memoryStore = new Map<string, { value: unknown; expiresAt: number }>()

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!useExternalStore) {
    const entry = memoryStore.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      memoryStore.delete(key)
      return null
    }
    return entry.value as T
  }

  try {
    return (await kv.get<T>(key)) ?? null
  } catch (err) {
    console.warn('[redis] GET "' + key + '" failed:', err)
    return null
  }
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<boolean> {
  if (!useExternalStore) {
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds ?? 3600) * 1000,
    })
    return true
  }

  try {
    await kv.set(key, value, ttlSeconds !== undefined ? { ex: ttlSeconds } : undefined)
    return true
  } catch (err) {
    console.warn('[redis] SET "' + key + '" failed:', err)
    return false
  }
}

export async function redisDel(key: string): Promise<boolean> {
  if (!useExternalStore) {
    memoryStore.delete(key)
    return true
  }

  try {
    await kv.del(key)
    return true
  } catch (err) {
    console.warn('[redis] DEL "' + key + '" failed:', err)
    return false
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  if (!useExternalStore) return null

  try {
    return await kv.incr(key)
  } catch (err) {
    console.warn('[redis] INCR "' + key + '" failed:', err)
    return null
  }
}

export async function redisExpire(key: string, ttlSeconds: number): Promise<boolean> {
  if (!useExternalStore) return false

  try {
    return !!(await kv.expire(key, ttlSeconds))
  } catch (err) {
    console.warn('[redis] EXPIRE "' + key + '" failed:', err)
    return false
  }
}
