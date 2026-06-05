"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Loader2 } from "lucide-react"
import { SeismicMap } from "./SeismicMap"
import { useTranslations } from "next-intl"
import { Volcano } from "../types/volcano"
import Volcanoes from "./Volcanoes"
import { supabase } from "../utils/supabase/client"
import { VolcanoesResponse } from "../types/volcano"

interface VolcanoesTabProps {
  volcanoes: Volcano[]
  volcanoLoading: boolean
  volcanoError: string | null
  setVolcanoes: (volcanoes: Volcano[]) => void
  setVolcanoLoading: (loading: boolean) => void
  setVolcanoError: (error: string | null) => void
}

export function VolcanoesTab({
  volcanoes,
  volcanoLoading,
  volcanoError,
  setVolcanoes,
  setVolcanoLoading,
  setVolcanoError,
}: VolcanoesTabProps) {
  const t = useTranslations("SeismicPage")

  // SWR fetcher for volcano data
  const fetchVolcanoes = async () => {
    const response = await supabase.functions.invoke("volcanic-service", {
      body: { country: "Costa Rica", timeRange: "D1" },
    })
    if (!response.data?.success) {
      throw new Error(response.data?.error || "Failed to fetch volcano data")
    }
    return (response.data as VolcanoesResponse).volcanoes
  }

  const handleRetry = () => {
    setVolcanoLoading(true)
    setVolcanoError(null)
    fetchVolcanoes()
      .then(setVolcanoes)
      .catch(err => {
        console.error(err)
        const msg = err instanceof Error ? err.message : String(err)
        setVolcanoError(msg)
        setVolcanoes([])
      })
      .finally(() => setVolcanoLoading(false))
  }

  return (
    <div className="space-y-4">
      {/* Volcanoes Map */}
      <Card>
        <CardHeader>
          <CardTitle>{t("volcanicMapTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {volcanoLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t("loading")}</span>
            </div>
          ) : volcanoError ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">{t("error")}</div>
              <div className="text-sm text-muted-foreground mb-4">
                {volcanoError}
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {t("retry")}
              </button>
            </div>
          ) : (
            <SeismicMap locations={volcanoes} type="volcano" />
          )}
        </CardContent>
      </Card>

      {volcanoes && volcanoes.length ? (
        <Volcanoes volcanoes={volcanoes} />
      ) : null}
    </div>
  )
}
