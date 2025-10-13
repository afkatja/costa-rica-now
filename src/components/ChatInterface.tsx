"use client"

import { useState, useRef, useEffect } from "react"
import { supabase } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Send,
  Bot,
  User,
  Cloud,
  Ticket,
  MapPin,
  Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "../hooks/use-toast"
import { WeatherAlert, WeatherDisplay } from "./WeatherDisplay"
import { EventsAlert, EventsDisplay } from "./EventsDisplay"
import LoadingSpinner from "./Loader"
import { useAuth } from "../providers/auth-provider"
import { createNavigation } from "next-intl/navigation"
import AuthDialog from "./AuthDialog"
import { useGeolocation } from "../hooks/use-geolocation"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
  metadata?: any
}

interface WeatherData {
  location: string
  name: string
  type: "current" | "forecast"
  current?: {
    temperature: number
    feels_like: number
    humidity: number
    description: string
    main: string
    icon: string
    wind_speed: number
    pressure: number
    visibility: number
  }
  city: string
  country: string
  cached_at: string
}

interface EventData {
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

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [currentWeather, setCurrentWeather] = useState<WeatherData[]>([])
  const [currentEvents, setCurrentEvents] = useState<EventData[]>([])
  const [showWeatherSummary, setShowWeatherSummary] = useState(true)
  const [showEventsSummary, setShowEventsSummary] = useState(true)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [locationRequested, setLocationRequested] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const { useRouter } = createNavigation()
  const router = useRouter()

  // Geolocation hook
  const {
    position,
    error: locationError,
    loading: locationLoading,
    permission,
    isInCostaRica,
    requestLocation,
    getLocationContext,
  } = useGeolocation()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Function to detect if query is location-based
  const isLocationBasedQuery = (query: string): boolean => {
    const locationKeywords = [
      "current weather",
      "weather now",
      "today's weather",
      "activities near me",
      "things to do nearby",
      "events nearby",
      "what to do today",
      "current events",
      "local activities",
      "weather here",
      "activities here",
      "events here",
    ]

    const lowerQuery = query.toLowerCase()
    return (
      locationKeywords.some(keyword => lowerQuery.includes(keyword)) ||
      (lowerQuery.includes("weather") && !lowerQuery.includes("in ")) ||
      (lowerQuery.includes("activities") && !lowerQuery.includes("in ")) ||
      (lowerQuery.includes("events") && !lowerQuery.includes("in "))
    )
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setAuthDialogOpen(true)
      return
    }
    if (!input.trim() || loading || !user) return

    const userMessage = input.trim()
    setInput("")
    setLoading(true)

    // Check if this is a location-based query
    const isLocationQuery = isLocationBasedQuery(userMessage)

    // If it's a location-based query and we don't have location yet, request it
    if (
      isLocationQuery &&
      !position &&
      !locationRequested &&
      permission !== "denied"
    ) {
      setLocationRequested(true)
      try {
        await requestLocation()
      } catch (error) {
        console.warn("Failed to get location:", error)
      }
    }

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      // Get location context if available and relevant
      const locationContext = isLocationQuery ? getLocationContext() : null

      // Call AI chat function - using ai-chat-enhanced for weather integration
      const { data, error } = await supabase.functions.invoke(
        "ai-chat-enhanced",
        {
          body: {
            message: userMessage,
            conversationId,
            userPreferences: {}, // TODO: Get from user profile
            locationContext, // Include location data for filtering
          },
        }
      )

      if (error) throw error

      const aiResponse = data?.data
      if (!aiResponse) throw new Error("No response from AI")

      // Update conversation ID if this is the first message
      if (!conversationId && aiResponse.conversationId) {
        setConversationId(aiResponse.conversationId)
      }

      // Update weather data if available
      if (aiResponse.weather && aiResponse.weather.length > 0) {
        setCurrentWeather(aiResponse.weather)
      }

      // Update events data if available
      if (aiResponse.events && aiResponse.events.length > 0) {
        setCurrentEvents(aiResponse.events)
      }

      // Add AI response to messages
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: aiResponse.message,
        created_at: new Date().toISOString(),
        metadata: {
          sources: aiResponse.sources,
          weather: aiResponse.weather,
          events: aiResponse.events,
          weatherAvailable: aiResponse.weatherAvailable,
          eventsAvailable: aiResponse.eventsAvailable,
        },
      }

      setMessages(prev => [...prev.slice(0, -1), tempUserMessage, aiMessage])
    } catch (error: any) {
      console.error("Chat error:", error)
      toast({
        title: "Error",
        description:
          error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })
      // Remove the temporary message on error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setCurrentWeather([])
    setCurrentEvents([])
    setShowWeatherSummary(true)
    setShowEventsSummary(true)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/80 backdrop-blur-sm">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <Bot className="h-5 w-5 text-gray-50" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Costa Rica Travel Assistant
              </h2>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                <Ticket className="h-3 w-3" />
                AI-powered with weather & events
                {position && isInCostaRica && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <MapPin className="h-3 w-3" />
                    Location-enabled
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={startNewConversation}
            variant="outline"
            size="sm"
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            New Chat
          </Button>
        </div>

        {/* Weather Summary */}
        {currentWeather.length > 0 && showWeatherSummary && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Current Weather in Costa Rica
              </h3>
              <button
                onClick={() => setShowWeatherSummary(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            </div>
            <WeatherDisplay weather={currentWeather} compact />
            <WeatherAlert weather={currentWeather} />
          </div>
        )}

        {/* Events Summary */}
        {currentEvents.length > 0 && showEventsSummary && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Upcoming Events & Activities
              </h3>
              <button
                onClick={() => setShowEventsSummary(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            </div>
            <EventsDisplay events={currentEvents} compact />
            <EventsAlert events={currentEvents} />
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-6 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full">
              <Bot className="h-12 w-12 text-emerald-600" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-semibold text-gray-900">
                Welcome to your Costa Rica Travel Assistant!
              </h3>
              <p className="text-gray-600">
                I'm here to help you plan the perfect Costa Rica adventure. Ask
                me about destinations, activities, weather, transportation, or
                anything else about Costa Rica!
              </p>

              {/* Location Status */}
              {!position && permission !== "denied" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Enable Location for Personalized Recommendations
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Allow location access to get weather and activities near you
                    when you're in Costa Rica.
                  </p>
                  <Button
                    onClick={requestLocation}
                    disabled={locationLoading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {locationLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <MapPin className="h-3 w-3 mr-1" />
                        Share Location
                      </>
                    )}
                  </Button>
                </div>
              )}

              {position && isInCostaRica && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Location Enabled
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Getting personalized recommendations based on your location
                    in Costa Rica.
                  </p>
                </div>
              )}

              {locationError && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">
                      Location Not Available
                    </span>
                  </div>
                  <p className="text-xs text-amber-700">{locationError}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 max-w-2xl">
              <Button
                onClick={() =>
                  setInput(
                    "What are the best destinations to visit in Costa Rica?"
                  )
                }
                className="p-3 text-left bg-gray-50 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <span className="text-sm font-medium text-emerald-700">
                  Best destinations to visit
                </span>
              </Button>
              <Button
                onClick={() =>
                  setInput("Create a 7-day itinerary for adventure activities")
                }
                className="p-3 text-left bg-gray-50 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <span className="text-sm font-medium text-emerald-700">
                  Create an adventure itinerary
                </span>
              </Button>
              <Button
                onClick={() =>
                  setInput("What are the best activities for today's weather?")
                }
                className="p-3 text-left bg-gray-50 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <span className="text-sm font-medium text-emerald-700">
                  Weather-based activity suggestions
                </span>
              </Button>
              <Button
                onClick={() =>
                  setInput("What events are happening this week in Costa Rica?")
                }
                className="p-3 text-left bg-gray-50 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <span className="text-sm font-medium text-emerald-700">
                  Current events and activities
                </span>
              </Button>
            </div>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user"
                  ? "ml-auto flex-row-reverse max-w-4xl"
                  : "mr-auto prose lg:prose-xl"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                )}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4 text-gray-50" />
                ) : (
                  <Bot className="h-4 w-4 text-gray-50" />
                )}
              </div>
              <div
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg",
                  message.role === "user"
                    ? "bg-blue-500 text-gray-50 max-w-3xl"
                    : "bg-gray-50 border border-gray-200 text-gray-900 max-w-none"
                )}
              >
                <div className="prose prose-sm max-w-none">
                  {message.content.split("\n").map((line, i) => (
                    <p
                      key={i}
                      className={cn(
                        "mb-2 last:mb-0",
                        message.role === "user"
                          ? "text-gray-50"
                          : "text-gray-900"
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>

                {/* Weather Data Display */}
                {message.role === "assistant" &&
                  message.metadata?.weather &&
                  message.metadata.weather.length > 0 && (
                    <div className="mt-4">
                      <WeatherDisplay weather={message.metadata.weather} />
                    </div>
                  )}

                {/* Events Data Display */}
                {message.role === "assistant" &&
                  message.metadata?.events &&
                  message.metadata.events.length > 0 && (
                    <div className="mt-4">
                      <EventsDisplay events={message.metadata.events} />
                    </div>
                  )}

                {message.metadata?.sources && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.metadata.sources.map(
                        (source: any, i: number) => (
                          <span
                            key={i}
                            className="inline-block px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full"
                          >
                            {source.title}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Response Indicators */}
                {message.role === "assistant" &&
                  (message.metadata?.weatherAvailable ||
                    message.metadata?.eventsAvailable) && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-3 text-xs text-emerald-600">
                        {message.metadata?.weatherAvailable && (
                          <div className="flex items-center gap-1">
                            <Cloud className="h-3 w-3" />
                            <span>Weather-enhanced</span>
                          </div>
                        )}
                        {message.metadata?.eventsAvailable && (
                          <div className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" />
                            <span>Events-enhanced</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 max-w-4xl mr-auto">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-gray-50" />
            </div>
            <div className="flex-1 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full typing-dot"></div>
                </div>
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-gray-50/90">
        <form onSubmit={sendMessage} className="flex gap-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask me anything about Costa Rica travel..."
            disabled={loading}
            className="flex-1 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultMode="signin"
      />
    </div>
  )
}
