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
      message,
      conversationId,
      userPreferences = {},
      locationContext = null,
    } = await req.json()

    if (!message) {
      throw new Error("Message is required")
    }

    // Get environment variables
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
    const groqApiKey = Deno.env.get("GROQ_API_KEY")
    const huggingfaceApiKey = Deno.env.get("HF_API_KEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const openWeatherApiKey = Deno.env.get("OPENWEATHERMAP_API_KEY")

    // Feature flag: 'openai' or 'free' (groq + huggingface)
    const AI_PROVIDER = Deno.env.get("AI_PROVIDER") || "free" // default to free

    // Validate required keys based on provider
    if (AI_PROVIDER === "openai") {
      if (!openaiApiKey || !supabaseUrl || !serviceRoleKey) {
        throw new Error(
          "Missing required environment variables for OpenAI provider"
        )
      }
    } else {
      if (
        !groqApiKey ||
        !huggingfaceApiKey ||
        !supabaseUrl ||
        !serviceRoleKey
      ) {
        throw new Error(
          "Missing required environment variables for free provider"
        )
      }
    }

    console.log(`Using AI provider: ${AI_PROVIDER}`)

    // Get user from auth header
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      throw new Error("Authorization header is required")
    }

    const token = authHeader.replace("Bearer ", "")
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serviceRoleKey,
      },
    })

    if (!userResponse.ok) {
      throw new Error("Invalid authentication token")
    }

    const userData = await userResponse.json()
    const userId = userData.id

    // Get or create conversation
    let conversation
    if (conversationId) {
      // Get existing conversation
      const convResponse = await fetch(
        `${supabaseUrl}/rest/v1/conversations?id=eq.${conversationId}&user_id=eq.${userId}`,
        {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
        }
      )
      const conversations = await convResponse.json()
      conversation = conversations[0]
    }

    if (!conversation) {
      // Create new conversation
      const convResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: userId,
          title: message.substring(0, 50) + "...",
          context: { userPreferences },
        }),
      })
      const newConversations = await convResponse.json()
      conversation = newConversations[0]
    }

    // Save user message
    await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        role: "user",
        content: message,
      }),
    })

    // Get recent conversation history
    const historyResponse = await fetch(
      `${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversation.id}&order=created_at.desc&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    )
    const history = await historyResponse.json()
    const recentHistory = history.reverse() // Oldest first

    // Fetch weather data for context
    let weatherContext = ""
    let currentWeather = []

    if (openWeatherApiKey) {
      try {
        // Get weather for major destinations or user's location
        const weatherResponse = await fetch(
          `${supabaseUrl}/functions/v1/weather-service`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "current",
              locationContext, // Include user's location if available
            }),
          }
        )

        if (weatherResponse.ok) {
          const weatherData = await weatherResponse.json()
          currentWeather = weatherData.data?.weather || []

          // Create weather context for AI
          weatherContext = currentWeather
            .map(
              w =>
                `${w.name}: ${w.current.temperature}°C, ${w.current.description}, humidity ${w.current.humidity}%`
            )
            .join("; ")
        }
      } catch (weatherError) {
        console.log(
          "Weather fetch failed, continuing without weather data:",
          weatherError
        )
      }
    }

    // Fetch events data for context
    let eventsContext = ""
    let currentEvents = []

    try {
      // Get upcoming events from multiple categories
      const eventsResponse = await fetch(
        `${supabaseUrl}/functions/v1/events-service`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "get_upcoming_events",
            limit: 15,
            locationContext, // Include user's location if available
          }),
        }
      )

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        currentEvents = eventsData.data?.events || []

        // Create events context for AI
        eventsContext = currentEvents
          .slice(0, 10)
          .map(
            (event: Record<string, any>) =>
              `${event.title} (${event.category}) in ${
                event.location_display || event.location
              } - ${event.price} - ${event.description?.substring(0, 100)}...`
          )
          .join("; ")
      }
    } catch (eventsError) {
      console.log(
        "Events fetch failed, continuing without events data:",
        eventsError
      )
    }

    // Enhanced knowledge search with multiple strategies
    let relevantKnowledge = []
    let queryEmbedding

    // Generate embeddings based on provider
    try {
      if (AI_PROVIDER === "openai") {
        console.log("Generating embeddings with OpenAI")
        const embeddingResponse = await fetch(
          "https://api.openai.com/v1/embeddings",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: message,
              model: "text-embedding-3-small",
            }),
          }
        )

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json()
          queryEmbedding = embeddingData.data[0].embedding
        } else {
          throw new Error(
            `OpenAI embedding failed: ${await embeddingResponse.text()}`
          )
        }
      } else {
        console.log("Generating embeddings with HuggingFace")
        const embeddingResponse = await fetch(
          "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${huggingfaceApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: message,
              options: { wait_for_model: true },
            }),
          }
        )

        if (embeddingResponse.ok) {
          queryEmbedding = await embeddingResponse.json()
          // HuggingFace returns array directly, ensure it's the right format
          if (
            Array.isArray(queryEmbedding) &&
            Array.isArray(queryEmbedding[0])
          ) {
            queryEmbedding = queryEmbedding[0]
          }
        } else {
          throw new Error(
            `HuggingFace embedding failed: ${await embeddingResponse.text()}`
          )
        }
      }

      // Search with embeddings if we got them
      if (queryEmbedding) {
        const searchResponse = await fetch(
          `${supabaseUrl}/rest/v1/rpc/search_knowledge`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query_embedding: queryEmbedding,
              match_threshold: 0.7,
              match_count: 5,
            }),
          }
        )

        if (searchResponse.ok) {
          relevantKnowledge = await searchResponse.json()
          console.log(
            `Found ${relevantKnowledge.length} results via vector search`
          )
        }
      }
    } catch (embeddingError) {
      console.log(
        "Vector search failed, falling back to text search:",
        embeddingError
      )
    }

    // Strategy 2: Fallback to text-based search if vector search fails
    if (relevantKnowledge.length === 0) {
      console.log("Using text-based search fallback")

      // Create search terms from the message
      const searchTerms = message
        .toLowerCase()
        .split(/\s+/)
        .filter(
          term =>
            term.length > 3 &&
            ![
              "what",
              "where",
              "when",
              "how",
              "the",
              "and",
              "for",
              "with",
            ].includes(term)
        )
        .slice(0, 5)

      if (searchTerms.length > 0) {
        // Search by content using text matching
        const textSearchQuery = searchTerms
          .map(term => `content.ilike.%${term}%`)
          .join(",")

        const textSearchResponse = await fetch(
          `${supabaseUrl}/rest/v1/knowledge_base?or=(${textSearchQuery})&limit=5`,
          {
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
            },
          }
        )

        if (textSearchResponse.ok) {
          const textResults = await textSearchResponse.json()
          relevantKnowledge = textResults.map(item => ({
            title: item.title,
            content: item.content,
            category: item.category,
            location: item.location,
            similarity: 0.8, // Assign a default similarity score
          }))
        }
      }
    }

    // Strategy 3: If still no results, get general Costa Rica content
    if (relevantKnowledge.length === 0) {
      console.log("Using general content fallback")

      const generalResponse = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_base?limit=3&order=created_at.desc`,
        {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
        }
      )

      if (generalResponse.ok) {
        const generalResults = await generalResponse.json()
        relevantKnowledge = generalResults.map(item => ({
          title: item.title,
          content: item.content,
          category: item.category,
          location: item.location,
          similarity: 0.6, // Lower similarity for general content
        }))
      }
    }

    // Build context for AI
    const knowledgeContext = relevantKnowledge
      .map(
        item =>
          `Title: ${item.title}\nLocation: ${
            item.location || "General"
          }\nContent: ${item.content}`
      )
      .join("\n\n---\n\n")

    const conversationHistory = recentHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join("\n")

    // Create system prompt with Costa Rica travel expertise, weather awareness, and events integration
    const systemPrompt = `You are an expert Costa Rica travel assistant with deep hyperlocal knowledge, real-time weather awareness, and access to current local events. You help travelers plan personalized itineraries with insider insights.

User preferences: ${JSON.stringify(userPreferences)}

CURRENT WEATHER CONDITIONS (${new Date().toLocaleDateString()}):
${weatherContext || "Weather data temporarily unavailable"}

CURRENT EVENTS & ACTIVITIES:
${eventsContext || "Events data loading..."}

Relevant knowledge base information:
${knowledgeContext}

Recent conversation:
${conversationHistory}

Guidelines:
- Provide specific, actionable travel advice for Costa Rica
- ALWAYS consider current weather conditions when making recommendations
- INTEGRATE local events and activities into travel suggestions naturally
- Include hyperlocal insights like expat recommendations, hidden gems, cultural tips
- Suggest weather-appropriate activities and events:
  * Sunny/Clear: Beach activities, hiking, zip-lining, outdoor events, adventure tours
  * Cloudy: Photography, wildlife watching, cultural events, comfortable outdoor activities
  * Rainy: Indoor attractions, museums, spas, coffee tours, hot springs, cooking classes
  * Hot weather (>28°C): Early morning activities, shaded events, water activities
- When suggesting activities, prioritize current events and happenings when relevant
- Provide event details including pricing, duration, and booking information when available
- Consider event categories: cultural, adventure, food, nature, wellness, seasonal, community
- Match events to user interests and travel dates
- Provide weather-based packing suggestions when relevant
- Consider seasonal weather patterns and microclimates
- Suggest backup indoor activities and events during rainy season (May-November)
- Be conversational and helpful, adapting to the user's preferences
- If asked about itinerary planning, create detailed day-by-day plans with weather considerations and events
- Include practical information like costs, timing, logistics, and how to book events
- Reference knowledge base, weather, and events information when relevant
- Always mention current weather and relevant events when discussing specific destinations

Respond helpfully to the user's latest message, naturally incorporating weather insights and local events.`

    // Generate AI response based on provider
    let assistantMessage
    let modelUsed

    if (AI_PROVIDER === "openai") {
      console.log("Generating response with OpenAI")
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      )

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        throw new Error(`OpenAI API error: ${errorText}`)
      }

      const aiResponse = await openaiResponse.json()
      assistantMessage = aiResponse.choices[0].message.content
      modelUsed = "gpt-4o-mini"
    } else {
      console.log("Generating response with Groq")
      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile", // or "llama-3.1-8b-instant" for faster
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      )

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text()
        throw new Error(`Groq API error: ${errorText}`)
      }

      const aiResponse = await groqResponse.json()
      assistantMessage = aiResponse.choices[0].message.content
      modelUsed = "llama-3.3-70b-versatile"
    }

    // Save assistant message
    await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        role: "assistant",
        content: assistantMessage,
        metadata: {
          sources: relevantKnowledge.map(k => ({
            title: k.title,
            category: k.category,
            location: k.location,
          })),
          model: modelUsed,
          ai_provider: AI_PROVIDER,
          search_strategy:
            relevantKnowledge.length > 0 ? "knowledge_base" : "general",
          weather_context: currentWeather.length > 0,
          weather_locations: currentWeather.map(w => w.name),
          events_context: currentEvents.length > 0,
          events_count: currentEvents.length,
        },
      }),
    })

    return new Response(
      JSON.stringify({
        data: {
          message: assistantMessage,
          conversationId: conversation.id,
          sources: relevantKnowledge,
          weather: currentWeather,
          events: currentEvents.slice(0, 5), // Include top 5 events in response
          searchStrategy:
            relevantKnowledge.length > 0 ? "knowledge_base" : "general",
          weatherAvailable: currentWeather.length > 0,
          eventsAvailable: currentEvents.length > 0,
          aiProvider: AI_PROVIDER,
          modelUsed: modelUsed,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("AI chat error:", error)

    const errorResponse = {
      error: {
        code: "AI_CHAT_ERROR",
        message: error.message,
      },
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
