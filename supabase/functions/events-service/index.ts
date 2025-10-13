Deno.serve(async req => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "false",
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const {
      action = "search_events",
      location,
      category,
      dateFrom,
      dateTo,
      maxPrice,
      eventId,
      limit = 10,
      locationContext = null,
    } = await req.json()

    // MCP Server connection configuration
    const mcpServerUrl = "https://api.minimax.chat/v1/mcp"
    const mcpHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("MCP_API_KEY") || "demo-key"}`,
    }

    let mcpRequest
    let eventsData = []

    // Route different MCP actions
    switch (action) {
      case "search_events":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              location: location || null,
              category: category || null,
              date_from: dateFrom || null,
              date_to: dateTo || null,
              max_price: maxPrice || null,
              limit: limit,
            },
          },
        }
        break

      case "get_event_details":
        if (!eventId) throw new Error("Event ID required for event details")
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_event_details",
            arguments: {
              event_id: eventId,
            },
          },
        }
        break

      case "get_events_by_location":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_events_by_location",
            arguments: {
              location: location || "san-jose",
              limit: limit,
            },
          },
        }
        break

      case "get_events_by_category":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_events_by_category",
            arguments: {
              category: category || "cultural",
              location: location || null,
              limit: limit,
            },
          },
        }
        break

      case "get_upcoming_events":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_upcoming_events",
            arguments: {
              days: parseInt(limit) || 30,
              location: location || null,
              category: category || null,
            },
          },
        }
        break

      case "get_seasonal_events":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_seasonal_events",
            arguments: {
              season: category || "current", // Using category field for season
              location: location || null,
            },
          },
        }
        break

      case "get_event_recommendations":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_event_recommendations",
            arguments: {
              interests: category ? [category] : ["adventure", "cultural"],
              location: location || null,
              budget: maxPrice || null,
              travel_dates: {
                start: dateFrom || null,
                end: dateTo || null,
              },
            },
          },
        }
        break

      case "get_available_locations":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_available_locations",
            arguments: {},
          },
        }
        break

      case "get_available_categories":
        mcpRequest = {
          server_id: "costa-rica-events-mcp",
          method: "tools/call",
          params: {
            name: "get_available_categories",
            arguments: {},
          },
        }
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    console.log("MCP Request:", JSON.stringify(mcpRequest, null, 2))

    // Make request to MCP server
    const mcpResponse = await fetch(mcpServerUrl, {
      method: "POST",
      headers: mcpHeaders,
      body: JSON.stringify(mcpRequest),
    })

    if (!mcpResponse.ok) {
      console.error(
        "MCP server error:",
        mcpResponse.status,
        mcpResponse.statusText
      )

      // Fallback: Return sample events data for demonstration
      eventsData = generateFallbackEvents(location, category)
    } else {
      const mcpResult = await mcpResponse.json()
      console.log("MCP Response:", JSON.stringify(mcpResult, null, 2))

      // Extract events data from MCP response
      eventsData = extractEventsFromMcpResponse(mcpResult, action)
    }

    // Filter events by location if user location context is available
    if (
      locationContext &&
      locationContext.isInCostaRica &&
      eventsData.length > 0
    ) {
      eventsData = filterEventsByLocation(eventsData, locationContext)
    }

    return new Response(
      JSON.stringify({
        data: {
          events: eventsData,
          action: action,
          timestamp: new Date().toISOString(),
          source: mcpResponse.ok ? "mcp_server" : "fallback",
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Events service error:", error)

    // Fallback events in case of complete failure
    const fallbackEvents = generateFallbackEvents()

    return new Response(
      JSON.stringify({
        data: {
          events: fallbackEvents,
          action: "fallback",
          timestamp: new Date().toISOString(),
          source: "fallback",
          error_info: "MCP server unavailable, showing sample events",
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

// Helper function to extract events from MCP response
function extractEventsFromMcpResponse(mcpResult, action) {
  if (!mcpResult || !mcpResult.content || !mcpResult.content[0]) {
    return []
  }

  const content = mcpResult.content[0]

  // Handle different response formats
  if (content.type === "text") {
    try {
      // Try to parse JSON from text content
      const parsed = JSON.parse(content.text)
      return Array.isArray(parsed) ? parsed : parsed.events || [parsed]
    } catch {
      // If not JSON, return formatted text as single event
      return [
        {
          id: `text-${Date.now()}`,
          title: "Local Event Information",
          description: content.text,
          category: "information",
          location: "Various Locations",
          date: new Date().toISOString(),
          price: "Variable",
        },
      ]
    }
  }

  // Handle structured data
  if (Array.isArray(content)) {
    return content
  }

  return [content]
}

// Fallback events for demonstration and error cases
function generateFallbackEvents(location = null, category = null) {
  const baseEvents = [
    {
      id: "evt-001",
      title: "Manuel Antonio National Park Tour",
      description:
        "Guided tour through Costa Rica's most famous national park with wildlife spotting opportunities.",
      category: "nature",
      location: "manuel-antonio",
      location_display: "Manuel Antonio",
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      duration: "4 hours",
      price: "$45",
      rating: 4.8,
      weather_dependent: false,
      highlights: ["Wildlife spotting", "Beach access", "Expert guide"],
      booking_url: "#",
      accessibility: "Moderate walking required",
    },
    {
      id: "evt-002",
      title: "Arenal Volcano Night Tour",
      description:
        "Experience the majesty of Arenal Volcano with evening wildlife observation and hot springs.",
      category: "adventure",
      location: "arenal",
      location_display: "Arenal",
      date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      duration: "6 hours",
      price: "$65",
      rating: 4.9,
      weather_dependent: true,
      highlights: ["Volcano views", "Hot springs", "Night wildlife"],
      booking_url: "#",
      accessibility: "All fitness levels",
    },
    {
      id: "evt-003",
      title: "San José Coffee Culture Walking Tour",
      description:
        "Discover the rich coffee heritage of Costa Rica through the historic center of San José.",
      category: "cultural",
      location: "san-jose",
      location_display: "San José",
      date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
      duration: "3 hours",
      price: "$30",
      rating: 4.7,
      weather_dependent: false,
      highlights: ["Coffee tastings", "Historic sites", "Local guide"],
      booking_url: "#",
      accessibility: "Easy walking",
    },
    {
      id: "evt-004",
      title: "Monteverde Cloud Forest Canopy Walk",
      description:
        "Walk among the treetops in one of the world's most biodiverse cloud forests.",
      category: "nature",
      location: "monteverde",
      location_display: "Monteverde",
      date: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
      duration: "2.5 hours",
      price: "$35",
      rating: 4.6,
      weather_dependent: true,
      highlights: ["Suspension bridges", "Bird watching", "Cloud forest"],
      booking_url: "#",
      accessibility: "Moderate fitness required",
    },
    {
      id: "evt-005",
      title: "Traditional Costa Rican Cooking Class",
      description:
        "Learn to prepare authentic Costa Rican dishes with local ingredients.",
      category: "food",
      location: "san-jose",
      location_display: "San José",
      date: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
      duration: "4 hours",
      price: "$55",
      rating: 4.9,
      weather_dependent: false,
      highlights: ["Hands-on cooking", "Market visit", "Recipe cards"],
      booking_url: "#",
      accessibility: "All levels welcome",
    },
  ]

  // Filter by location if specified
  let filteredEvents = location
    ? baseEvents.filter(event => event.location === location)
    : baseEvents

  // Filter by category if specified
  if (category) {
    filteredEvents = filteredEvents.filter(event => event.category === category)
  }

  return filteredEvents.length > 0 ? filteredEvents : baseEvents.slice(0, 3)
}

// Helper function to filter events by user's location
function filterEventsByLocation(events: any[], locationContext: any): any[] {
  if (!locationContext || !locationContext.isInCostaRica) {
    return events
  }

  // Costa Rica major destinations with coordinates
  const costaRicaDestinations = {
    "san-jose": { lat: 9.9281, lon: -84.0907 },
    "manuel-antonio": { lat: 9.3905, lon: -84.1376 },
    monteverde: { lat: 10.3087, lon: -84.8012 },
    arenal: { lat: 10.4148, lon: -84.7286 },
    guanacaste: { lat: 10.6345, lon: -85.4408 },
    "puerto-viejo": { lat: 9.6544, lon: -82.7582 },
    dominical: { lat: 9.2456, lon: -83.8606 },
    uvita: { lat: 9.1473, lon: -83.7613 },
    "puerto-jimenez": { lat: 8.53894, lon: -83.305272 },
    tortuguero: { lat: 10.5475, lon: -83.5049 },
    "san-isidro": { lat: 9.3783, lon: -83.7036 },
    "san-vito": { lat: 8.8218, lon: -82.9705 },
  }

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Filter events by proximity to user's location
  const filteredEvents = events.filter(event => {
    // If event has a specific location, check if it's within radius
    if (event.location && typeof event.location === "string") {
      const locationKey = event.location.toLowerCase().replace(/\s+/g, "-")
      const destination =
        costaRicaDestinations[locationKey as keyof typeof costaRicaDestinations]

      if (destination) {
        const distance = calculateDistance(
          locationContext.latitude,
          locationContext.longitude,
          destination.lat,
          destination.lon
        )
        return distance <= locationContext.radiusKm
      }
    }

    // If event doesn't have a specific location or location not found, include it
    // This ensures we don't filter out too many events
    return true
  })

  // Sort by proximity (closest first) and limit to reasonable number
  const sortedEvents = filteredEvents.sort((a, b) => {
    const getDistance = (event: any) => {
      if (event.location && typeof event.location === "string") {
        const locationKey = event.location.toLowerCase().replace(/\s+/g, "-")
        const destination =
          costaRicaDestinations[
            locationKey as keyof typeof costaRicaDestinations
          ]

        if (destination) {
          return calculateDistance(
            locationContext.latitude,
            locationContext.longitude,
            destination.lat,
            destination.lon
          )
        }
      }
      return Infinity // Events without specific locations go to end
    }

    return getDistance(a) - getDistance(b)
  })

  // Return up to 8 events (reasonable limit for UI)
  return sortedEvents.slice(0, 8)
}
