import { NextRequest, NextResponse } from "next/server"

const ALLOWED_PROTOCOLS = ["http:", "https:"]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

async function fetchImage(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CostaRicaNow/1.0 ImageProxy",
        Accept: "image/*",
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  try {
    const urlParam = request.nextUrl.searchParams.get("url")

    if (!urlParam) {
      return NextResponse.json(
        { error: "Missing 'url' query parameter" },
        { status: 400 },
      )
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(urlParam)
    } catch {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 },
      )
    }

    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only http and https URLs are allowed" },
        { status: 400 },
      )
    }

    const response = await fetchImage(urlParam)

    if (!response.ok) {
      throw new Error(`Source returned ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"

    if (!contentType.startsWith("image/")) {
      throw new Error("URL does not point to an image")
    }

    const arrayBuffer = await response.arrayBuffer()

    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      throw new Error("Image exceeds maximum size")
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#f3f4f6" width="400" height="300"/><text fill="#9ca3af" font-family="sans-serif" font-size="16" text-anchor="middle" x="200" y="150">Image unavailable</text></svg>`

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}
