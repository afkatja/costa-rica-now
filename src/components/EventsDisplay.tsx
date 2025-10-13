"use client"

import { useState } from "react"
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Users,
  Ticket,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Event {
  id: string
  title: string
  description: string
  category: string
  location: string
  location_display?: string
  date: string
  duration?: string
  price: string
  rating?: number
  weather_dependent?: boolean
  highlights?: string[]
  booking_url?: string
  accessibility?: string
}

interface EventsDisplayProps {
  events: Event[]
  compact?: boolean
  className?: string
}

const getCategoryIcon = (category: string) => {
  const iconProps = { size: 16, className: "text-gray-50" }

  switch (category.toLowerCase()) {
    case "cultural":
    case "culture":
      return "🎭"
    case "adventure":
      return "🏔️"
    case "food":
    case "culinary":
      return "🍽️"
    case "nature":
    case "wildlife":
      return "🌿"
    case "wellness":
    case "spa":
      return "🧘"
    case "seasonal":
      return "🎊"
    case "community":
      return "👥"
    default:
      return "🎯"
  }
}

const getCategoryGradient = (category: string) => {
  switch (category.toLowerCase()) {
    case "cultural":
    case "culture":
      return "from-purple-500 to-pink-600"
    case "adventure":
      return "from-orange-500 to-red-600"
    case "food":
    case "culinary":
      return "from-yellow-500 to-orange-600"
    case "nature":
    case "wildlife":
      return "from-green-500 to-emerald-600"
    case "wellness":
    case "spa":
      return "from-blue-500 to-cyan-600"
    case "seasonal":
      return "from-indigo-500 to-purple-600"
    case "community":
      return "from-teal-500 to-blue-600"
    default:
      return "from-gray-500 to-gray-600"
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return `In ${diffDays} days`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  })
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function EventsDisplay({
  events,
  compact = false,
  className,
}: EventsDisplayProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  if (!events || events.length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-2 my-3", className)}>
        {events.slice(0, 3).map(event => (
          <div
            key={event.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-gray-50 text-sm",
              `bg-gradient-to-r ${getCategoryGradient(event.category)}`
            )}
          >
            <span className="text-lg">{getCategoryIcon(event.category)}</span>
            <span className="font-medium truncate max-w-32">{event.title}</span>
            <span className="text-xs opacity-80">{event.price}</span>
          </div>
        ))}
        {events.length > 3 && (
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm">
            <span>+{events.length - 3} more</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4 my-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="h-5 w-5 text-emerald-600" />
        <h4 className="font-semibold text-gray-900">
          Current Events & Activities
        </h4>
      </div>

      <div className="grid gap-4">
        {events.map(event => {
          const isExpanded = expandedEvent === event.id

          return (
            <div
              key={event.id}
              className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Event Header */}
              <div
                className={cn(
                  "p-4 text-gray-50 relative",
                  `bg-gradient-to-r ${getCategoryGradient(event.category)}`
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">
                        {getCategoryIcon(event.category)}
                      </span>
                      <span className="text-xs font-medium bg-gray-50/20 px-2 py-1 rounded-full capitalize">
                        {event.category}
                      </span>
                      {event.weather_dependent && (
                        <span className="text-xs bg-gray-50/20 px-2 py-1 rounded-full">
                          ☁️ Weather dependent
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                    <p className="text-sm opacity-90 line-clamp-2">
                      {event.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-4">
                    {event.rating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{event.rating}</span>
                      </div>
                    )}
                    <span className="text-lg font-bold">{event.price}</span>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gray-50/10 -translate-y-12 translate-x-12"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-gray-50/5 translate-y-8 -translate-x-8"></div>
              </div>

              {/* Event Details */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{event.duration || formatTime(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location_display || event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    <span>{event.price}</span>
                  </div>
                </div>

                {/* Expandable Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {event.highlights && event.highlights.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Highlights:
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {event.highlights.map((highlight, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {event.accessibility && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-1">
                          Accessibility:
                        </h5>
                        <p className="text-sm text-gray-600">
                          {event.accessibility}
                        </p>
                      </div>
                    )}

                    {event.booking_url && event.booking_url !== "#" && (
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                        onClick={() => window.open(event.booking_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Book Now
                      </Button>
                    )}
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                  className="flex items-center gap-1 mt-3 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <span>{isExpanded ? "Show Less" : "Show More"}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EventsAlert({ events }: { events: Event[] }) {
  const urgentEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    const now = new Date()
    const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Show alert for events happening within next 24 hours
    return diffHours > 0 && diffHours <= 24
  })

  if (urgentEvents.length === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Ticket className="h-3 w-3 text-gray-50" />
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-blue-800 mb-1">Happening Soon</h4>
          <div className="text-sm text-blue-700 space-y-1">
            {urgentEvents.map(event => (
              <p key={event.id}>
                🎯 <strong>{event.title}</strong> - {formatDate(event.date)} at{" "}
                {formatTime(event.date)}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
