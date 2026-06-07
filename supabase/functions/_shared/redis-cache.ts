declare const Deno: any

let redisUrl: string | null | undefined = undefined

function getRedisUrl(): string | null {
  if (redisUrl !== undefined) return redisUrl
  redisUrl = Deno.env.get('REDIS_URL') || Deno.env.get('KV_URL') || null
  if (!redisUrl) {
    console.warn('[redis] REDIS_URL not configured, caching disabled')
  }
  return redisUrl
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const url = getRedisUrl()
  if (!url) return null

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return null
    const body = await res.json()
    if (!body || body.result === null || body.result === undefined) return null
    return JSON.parse(body.result) as T
  } catch (err) {
    console.error(`[redis] GET "${key}" failed:`, err)
    return null
  }
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<boolean> {
  const url = getRedisUrl()
  if (!url) return false

  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        value: JSON.stringify(value),
        ...(ttlSeconds !== undefined ? { ttl: ttlSeconds } : {}),
      }),
    })
    if (!res.ok) return false
    return true
  } catch (err) {
    console.error(`[redis] SET "${key}" failed:`, err)
    return false
  }
}

export async function redisDel(key: string): Promise<boolean> {
  const url = getRedisUrl()
  if (!url) return false

  try {
    const res = await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return false
    return true
  } catch (err) {
    console.error(`[redis] DEL "${key}" failed:`, err)
    return false
  }
}

export async function redisFlush(pattern: string): Promise<boolean> {
  const url = getRedisUrl()
  if (!url) return false

  try {
    const res = await fetch(`${url}/keys/${encodeURIComponent(pattern)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return false
    return true
  } catch (err) {
    console.error(`[redis] FLUSH "${pattern}" failed:`, err)
    return false
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  const url = getRedisUrl()
  if (!url) return null

  try {
    const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return null
    const body = await res.json()
    return body?.result ?? null
  } catch (err) {
    console.error(`[redis] INCR "${key}" failed:`, err)
    return null
  }
}

export async function redisExpire(key: string, ttlSeconds: number): Promise<boolean> {
  const url = getRedisUrl()
  if (!url) return false

  try {
    const res = await fetch(`${url}/expire/${encodeURIComponent(key)}/${ttlSeconds}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return false
    return true
  } catch (err) {
    console.error(`[redis] EXPIRE "${key}" failed:`, err)
    return false
  }
}
