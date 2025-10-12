import createMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"
const locales = ["en", "es"]

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: true,
})

export default function middleware(request: NextRequest) {
  console.log("Middleware processing:", request.nextUrl.pathname)

  // Handle internationalization
  const response = intlMiddleware(request)

  // If the response is a redirect, let it through
  // if (response.status === 307 || response.status === 308) {
  //   return response
  // }

  const locale = request.nextUrl.pathname.split("/")[1]
  const detectedLocale = locales.includes(locale) ? locale : "en"
  response.headers.set("Content-Language", detectedLocale)

  return response
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    "/",
    "/((?!api|_next/static|.*\\..*|_next/image|images|favicon|assets|robots|_redirects|llms|sitemap.xml).*)",
  ],
}
