Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { 
      action = 'search_events', 
      location, 
      category, 
      dateFrom, 
      dateTo, 
      maxPrice, 
      eventId,
      limit = 10
    } = await req.json();

    // MCP Server connection configuration
    const mcpServerUrl = 'https://api.minimax.chat/v1/mcp';
    const mcpHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('MCP_API_KEY') || 'demo-key'}`,
    };

    let mcpRequest;
    let eventsData = [];

    // Route different MCP actions
    switch (action) {
      case 'search_events':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'search_events',
            arguments: {
              location: location || null,
              category: category || null,
              date_from: dateFrom || null,
              date_to: dateTo || null,
              max_price: maxPrice || null,
              limit: limit
            }
          }
        };
        break;

      case 'get_event_details':
        if (!eventId) throw new Error('Event ID required for event details');
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_event_details',
            arguments: {
              event_id: eventId
            }
          }
        };
        break;

      case 'get_events_by_location':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_events_by_location',
            arguments: {
              location: location || 'san-jose',
              limit: limit
            }
          }
        };
        break;

      case 'get_events_by_category':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_events_by_category',
            arguments: {
              category: category || 'cultural',
              location: location || null,
              limit: limit
            }
          }
        };
        break;

      case 'get_upcoming_events':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_upcoming_events',
            arguments: {
              days: parseInt(limit) || 30,
              location: location || null,
              category: category || null
            }
          }
        };
        break;

      case 'get_seasonal_events':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_seasonal_events',
            arguments: {
              season: category || 'current', // Using category field for season
              location: location || null
            }
          }
        };
        break;

      case 'get_event_recommendations':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_event_recommendations',
            arguments: {
              interests: category ? [category] : ['adventure', 'cultural'],
              location: location || null,
              budget: maxPrice || null,
              travel_dates: {
                start: dateFrom || null,
                end: dateTo || null
              }
            }
          }
        };
        break;

      case 'get_available_locations':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_available_locations',
            arguments: {}
          }
        };
        break;

      case 'get_available_categories':
        mcpRequest = {
          server_id: 'costa-rica-events-mcp',
          method: 'tools/call',
          params: {
            name: 'get_available_categories',
            arguments: {}
          }
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('MCP Request:', JSON.stringify(mcpRequest, null, 2));

    // Make request to MCP server
    const mcpResponse = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: mcpHeaders,
      body: JSON.stringify(mcpRequest)
    });

    if (!mcpResponse.ok) {
      console.error('MCP server error:', mcpResponse.status, mcpResponse.statusText);
      
      // Fallback: Return sample events data for demonstration
      eventsData = generateFallbackEvents(location, category);
    } else {
      const mcpResult = await mcpResponse.json();
      console.log('MCP Response:', JSON.stringify(mcpResult, null, 2));
      
      // Extract events data from MCP response
      eventsData = extractEventsFromMcpResponse(mcpResult, action);
    }

    return new Response(JSON.stringify({
      data: {
        events: eventsData,
        action: action,
        timestamp: new Date().toISOString(),
        source: mcpResponse.ok ? 'mcp_server' : 'fallback'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Events service error:', error);

    // Fallback events in case of complete failure
    const fallbackEvents = generateFallbackEvents();

    return new Response(JSON.stringify({
      data: {
        events: fallbackEvents,
        action: 'fallback',
        timestamp: new Date().toISOString(),
        source: 'fallback',
        error_info: 'MCP server unavailable, showing sample events'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to extract events from MCP response
function extractEventsFromMcpResponse(mcpResult, action) {
  if (!mcpResult || !mcpResult.content || !mcpResult.content[0]) {
    return [];
  }

  const content = mcpResult.content[0];
  
  // Handle different response formats
  if (content.type === 'text') {
    try {
      // Try to parse JSON from text content
      const parsed = JSON.parse(content.text);
      return Array.isArray(parsed) ? parsed : (parsed.events || [parsed]);
    } catch {
      // If not JSON, return formatted text as single event
      return [{
        id: `text-${Date.now()}`,
        title: 'Local Event Information',
        description: content.text,
        category: 'information',
        location: 'Various Locations',
        date: new Date().toISOString(),
        price: 'Variable'
      }];
    }
  }

  // Handle structured data
  if (Array.isArray(content)) {
    return content;
  }

  return [content];
}

// Fallback events for demonstration and error cases
function generateFallbackEvents(location = null, category = null) {
  const baseEvents = [
    {
      id: 'evt-001',
      title: 'Manuel Antonio National Park Tour',
      description: 'Guided tour through Costa Rica\'s most famous national park with wildlife spotting opportunities.',
      category: 'nature',
      location: 'manuel-antonio',
      location_display: 'Manuel Antonio',
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      duration: '4 hours',
      price: '$45',
      rating: 4.8,
      weather_dependent: false,
      highlights: ['Wildlife spotting', 'Beach access', 'Expert guide'],
      booking_url: '#',
      accessibility: 'Moderate walking required'
    },
    {
      id: 'evt-002',
      title: 'Arenal Volcano Night Tour',
      description: 'Experience the majesty of Arenal Volcano with evening wildlife observation and hot springs.',
      category: 'adventure',
      location: 'arenal',
      location_display: 'Arenal',
      date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      duration: '6 hours',
      price: '$65',
      rating: 4.9,
      weather_dependent: true,
      highlights: ['Volcano views', 'Hot springs', 'Night wildlife'],
      booking_url: '#',
      accessibility: 'All fitness levels'
    },
    {
      id: 'evt-003',
      title: 'San José Coffee Culture Walking Tour',
      description: 'Discover the rich coffee heritage of Costa Rica through the historic center of San José.',
      category: 'cultural',
      location: 'san-jose',
      location_display: 'San José',
      date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
      duration: '3 hours',
      price: '$30',
      rating: 4.7,
      weather_dependent: false,
      highlights: ['Coffee tastings', 'Historic sites', 'Local guide'],
      booking_url: '#',
      accessibility: 'Easy walking'
    },
    {
      id: 'evt-004',
      title: 'Monteverde Cloud Forest Canopy Walk',
      description: 'Walk among the treetops in one of the world\'s most biodiverse cloud forests.',
      category: 'nature',
      location: 'monteverde',
      location_display: 'Monteverde',
      date: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
      duration: '2.5 hours',
      price: '$35',
      rating: 4.6,
      weather_dependent: true,
      highlights: ['Suspension bridges', 'Bird watching', 'Cloud forest'],
      booking_url: '#',
      accessibility: 'Moderate fitness required'
    },
    {
      id: 'evt-005',
      title: 'Traditional Costa Rican Cooking Class',
      description: 'Learn to prepare authentic Costa Rican dishes with local ingredients.',
      category: 'food',
      location: 'san-jose',
      location_display: 'San José',
      date: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
      duration: '4 hours',
      price: '$55',
      rating: 4.9,
      weather_dependent: false,
      highlights: ['Hands-on cooking', 'Market visit', 'Recipe cards'],
      booking_url: '#',
      accessibility: 'All levels welcome'
    }
  ];

  // Filter by location if specified
  let filteredEvents = location ? 
    baseEvents.filter(event => event.location === location) : 
    baseEvents;

  // Filter by category if specified
  if (category) {
    filteredEvents = filteredEvents.filter(event => event.category === category);
  }

  return filteredEvents.length > 0 ? filteredEvents : baseEvents.slice(0, 3);
}