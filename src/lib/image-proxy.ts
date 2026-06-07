const PROXY_ENDPOINT = "/api/image-proxy"

export function getImageProxyUrl(url: string | null): string | undefined {
  if (!url) return undefined
  try {
    new URL(url)
    return `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`
  } catch {
    return url
  }
}
