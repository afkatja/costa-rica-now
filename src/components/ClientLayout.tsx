"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { Header } from "./Header"
import { createNavigation } from "next-intl/navigation"

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { usePathname } = createNavigation()

  const pathname = usePathname()
  const t = useTranslations("Titles")
  const f = useTranslations("Footer")

  // Determine current page based on pathname
  const getCurrentPage = () => {
    const path = pathname.split("/").pop() || ""

    if (path === "" || path === "en" || path === "es") {
      return "home"
    } else if (path === "news") {
      return "news"
    } else if (path === "weather") {
      return "weather"
    } else if (path === "seismic") {
      return "seismic"
    }
    return "home"
  }

  const currentPage = getCurrentPage()
  const title = t(currentPage)

  return (
    <>
      <Header title={title} />
      <div className="min-h-[calc(100dvh-65px-90px)] bg-background flex flex-col">
        <main className="container mx-auto px-4 py-6 flex-1 flex flex-col">{children}</main>
      </div>
      {/* Footer */}
      <footer className="border-t bg-muted/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">{f("title")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {f("description")}
          </p>
        </div>
      </footer>
    </>
  )
}
