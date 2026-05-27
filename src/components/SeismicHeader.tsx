"use client"

import { Activity } from "lucide-react"
import { useTranslations } from "next-intl"

interface SeismicHeaderProps {
  className?: string
}

export function SeismicHeader({ className = "" }: SeismicHeaderProps) {
  const t = useTranslations("SeismicPage")

  return (
    <div className={`flex items-center gap-2 mb-6 ${className}`}>
      <Activity className="h-5 w-5 text-muted-foreground" />
      <h2>{t("title")}</h2>
    </div>
  )
}
