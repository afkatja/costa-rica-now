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
import { formatDateTime } from "./SeismicPage"

type Earthquake = {
  id: string
  magnitude: number
  felt: boolean
  intensity: string
  reports: number
  location: string
  time: string | number | Date
  depth: number
}

interface EarthquakesProps {
  earthquakes: Earthquake[] | null
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
        No data
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
                  Sismos últimos 7 días
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
                  {maxMagnitude ? `M ${maxMagnitude}` : "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Magnitud máxima
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
                <div className="text-sm text-muted-foreground">
                  Sismos percibidos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Earthquakes */}
      <Card>
        <CardHeader>
          <CardTitle>Sismos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {earthquakes?.map((earthquake: Earthquake) => (
              <div key={earthquake.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getMagnitudeBadge(earthquake.magnitude)}
                      className={getMagnitudeColor(earthquake.magnitude)}
                    >
                      M {earthquake.magnitude}
                    </Badge>
                    <span className="font-medium">{earthquake.intensity}</span>
                    {earthquake.felt && (
                      <Badge variant="outline" className="text-xs">
                        Percibido
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {earthquake.reports} reportes
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {earthquake.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDateTime(earthquake.time as string)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Profundidad: {earthquake.depth} km
                  </div>
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
