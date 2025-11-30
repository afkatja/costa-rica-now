import React from "react"
import { NextIntlClientProvider } from "next-intl"
import { Viewport } from "next"
import "./styles/globals.css"
import { ClientLayout } from "../../components/ClientLayout"
import { AuthProvider } from "../../providers/auth-provider"
import { WeatherDataProvider } from "../../providers/WeatherDataProvider"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}
export { generateMetadata } from "../meta"

export function generateStaticParams() {
  return ["en", "es"].map(locale => ({ locale }))
}

const Layout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: any
}) => {
  const { locale = "en" } = (await params) || {}

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale}>
          <AuthProvider>
            <WeatherDataProvider>
              <ClientLayout>{children}</ClientLayout>
            </WeatherDataProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export default Layout
