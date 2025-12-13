import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination"

import {
  Activity,
  MapPin,
  Clock,
  AlertTriangle,
  Mountain,
  Thermometer,
  TrendingUp,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { SeismicEvent } from "../types/seismic"

interface EarthquakesProps {
  earthquakes: SeismicEvent[] | null
  totalCount: number
  stats: any
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

const Earthquakes = ({
  earthquakes,
  totalCount,
  stats,
  currentPage,
  itemsPerPage,
  onPageChange,
}: EarthquakesProps) => {
  const t = useTranslations("Earthquakes")
  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 6) return "text-red-600"
    if (magnitude >= 4.5) return "text-orange-500"
    if (magnitude >= 3) return "text-yellow-600"
    return "text-green-600"
  }

  const getMagnitudeBadge = (magnitude: number) => {
    if (magnitude >= 6) return "destructive"
    if (magnitude >= 4.5) return "secondary"
    return "outline"
  }

  const maxMagnitude = stats?.magnitudeRange?.max || null

  if (!earthquakes)
    return (
      <TabsContent value="earthquakes" className="space-y-y">
        {t("noData")}
      </TabsContent>
    )

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  return (
    <>
      {/* Earthquakes Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-medium">{totalCount}</div>
                <div className="text-sm text-muted-foreground">
                  {t("earthquakesLast7Days")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-medium">
                  {maxMagnitude ? `M ${maxMagnitude}` : t("na")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("maximumMagnitude")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-medium">
                  {stats?.feltCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">{t("felt")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Earthquakes */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentEarthquakes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {earthquakes?.map((earthquake: SeismicEvent) => (
              <div key={earthquake.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getMagnitudeBadge(earthquake.magnitude)}
                      className={getMagnitudeColor(earthquake.magnitude)}
                    >
                      M {earthquake.magnitude}
                    </Badge>
                    <span className="font-medium">{earthquake.source}</span>
                    {earthquake.felt && earthquake.felt > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {t("felt")}
                      </Badge>
                    )}
                  </div>
                  {earthquake.url && (
                    <div className="text-sm text-muted-foreground">
                      <a
                        href={earthquake.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {t("source")}
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {earthquake.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {earthquake.formattedDateTime ||
                      earthquake.formattedTime ||
                      new Date(earthquake.time).toLocaleString("es-CR")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("depth")}:{" "}
                    {earthquake.depth ? `${earthquake.depth} km` : t("unknown")}
                  </div>
                  {earthquake.status && (
                    <div className="text-sm text-muted-foreground">
                      {t("status")}: {earthquake.status}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}

export default Earthquakes
