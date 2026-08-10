import { corsHeaders, withEdgeHandler } from "../_shared/edge-handler.ts"
import { generateCompletion, generateEmbedding } from "../_shared/model-engine/index.ts"
import { vectorStore } from "../_shared/vector-store/index.ts"
import { evaluateResponse, buildReinforcedSystemPrompt } from "../_shared/rag/evaluator.ts"
import { analyzeQuery, isRelevantDomain } from "./keyword-analyzer.ts"
import { AI_CHAT_CONFIG } from "./config.ts"

declare const Deno: any

function readEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name)
  } catch {
    return undefined
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY")
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey || "",
    },
  })
}

async function fetchLiveContext(
  message: string,
  supabaseUrl: string,
  serviceRoleKey: string,
  locationContext: any,
) {
  const analysis = analyzeQuery(message)
  const result: Record<string, any> = {
    weather: { context: "", data: [] },
    events: { context: "", data: [] },
    beach: { context: "", data: [] },
    seismic: { context: "", data: [] },
  }

  const tasks: Array<Promise<void>> = []

  tasks.push((async () => {
    try {
      const resp = await fetchWithAuth(
        `${supabaseUrl}/functions/v1/weather-service`,
        {
          method: "POST",
          body: JSON.stringify({ type: "current", locationContext }),
        },
      )
      if (resp.ok) {
        const data = await resp.json()
        const weatherData = data.data?.weather || []
        result.weather.data = weatherData
        result.weather.context = weatherData
          .map((w: any) => `${w.name}: ${w.current.temperature}°C, ${w.current.description}, humidity ${w.current.humidity}%`)
          .join("; ")
      }
    } catch (e) {
      console.log("Weather fetch failed:", e)
    }
  })())

  tasks.push((async () => {
    try {
      const resp = await fetchWithAuth(
        `${supabaseUrl}/functions/v1/events-service`,
        {
          method: "POST",
          body: JSON.stringify({ action: "get_upcoming_events", limit: 15, locationContext }),
        },
      )
      if (resp.ok) {
        const data = await resp.json()
        const events = data.data?.events || []
        result.events.data = events
        result.events.context = events
          .slice(0, AI_CHAT_CONFIG.context.maxEventsToInclude)
          .map((e: any) => `${e.title} (${e.category}) in ${e.location_display || e.location} - ${e.price} - ${(e.description || "").substring(0, 100)}...`)
          .join("; ")
      }
    } catch (e) {
      console.log("Events fetch failed:", e)
    }
  })())

  if (isRelevantDomain(message, "beach")) {
    tasks.push((async () => {
      try {
        const resp = await fetchWithAuth(
          `${supabaseUrl}/functions/v1/weather-service`,
          {
            method: "POST",
            body: JSON.stringify({ type: "marine", locationContext }),
          },
        )
        if (resp.ok) {
          const data = await resp.json()
          result.beach.data = data
        }
      } catch (e) {
        console.log("Beach conditions fetch failed:", e)
      }
    })())
  }

  if (isRelevantDomain(message, "seismic")) {
    tasks.push((async () => {
      try {
        const resp = await fetchWithAuth(
          `${supabaseUrl}/functions/v1/seismic-service`,
          {
            method: "POST",
            body: JSON.stringify({
              type: "earthquake",
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              endDate: new Date().toISOString().split("T")[0],
              limit: 5,
            }),
          },
        )
        if (resp.ok) {
          const data = await resp.json()
          result.seismic.data = data.events || []
          result.seismic.context = (data.events || [])
            .slice(0, 5)
            .map((e: any) => `M${e.magnitude} - ${e.location} (${e.formattedDateTime || new Date(e.time).toLocaleString()})`)
            .join("; ")
        }
      } catch (e) {
        console.log("Seismic data fetch failed:", e)
      }
    })())
  }

  await Promise.all(tasks)
  return result
}

async function searchKnowledge(message: string): Promise<{
  relevantKnowledge: any[]
  knowledgeContext: string
}> {
  let relevantKnowledge: any[] = []
  let knowledgeContext = ""

  try {
    const embeddingResult = await generateEmbedding(message, "embedding")
    const embedding = Array.isArray(embeddingResult.embedding)
      ? (embeddingResult.embedding as number[])
      : embeddingResult.embedding

    const searchResults = await vectorStore.search({
      vector: embedding,
      threshold: 0.6,
      maxResults: AI_CHAT_CONFIG.context.maxKnowledgeResults,
    })

    relevantKnowledge = searchResults
    if (relevantKnowledge.length > 0) {
      console.log(`Found ${relevantKnowledge.length} results via vector search`)
    }
  } catch (embeddingError) {
    console.log("Vector search failed, falling back to text search:", embeddingError)
  }

  if (relevantKnowledge.length === 0) {
    const supabaseUrl = readEnv("SUPABASE_URL")
    const { searchTerms } = analyzeQuery(message)
    if (searchTerms.length > 0 && supabaseUrl) {
      try {
        const textSearchQuery = searchTerms
          .map(term => `content.ilike.%${encodeURIComponent(term)}%`)
          .join(",")
        const resp = await fetchWithAuth(
          `${supabaseUrl}/rest/v1/knowledge_base?or=(${textSearchQuery})&limit=5`,
        )
        if (resp.ok) {
          const textResults = await resp.json()
          relevantKnowledge = textResults.map((item: any) => ({
            title: item.title,
            content: item.content,
            category: item.category,
            location: item.location,
            similarity: 0.8,
          }))
        }
      } catch (e) {
        console.log("Text search fallback failed:", e)
      }
    }
  }

  if (relevantKnowledge.length === 0) {
    const supabaseUrl = readEnv("SUPABASE_URL")
    if (supabaseUrl) {
      try {
        const resp = await fetchWithAuth(
          `${supabaseUrl}/rest/v1/knowledge_base?limit=3&order=created_at.desc`,
        )
        if (resp.ok) {
          const generalResults = await resp.json()
          relevantKnowledge = generalResults.map((item: any) => ({
            title: item.title,
            content: item.content,
            category: item.category,
            location: item.location,
            similarity: 0.6,
          }))
        }
      } catch (e) {
        console.log("General content fallback failed:", e)
      }
    }
  }

  knowledgeContext = relevantKnowledge
    .map((item: any) => `Title: ${item.title}\nLocation: ${item.location || "General"}\nContent: ${item.content}`)
    .join("\n\n---\n\n")

  return { relevantKnowledge, knowledgeContext }
}

function buildSystemPrompt(params: {
  knowledgeContext: string
  weatherContext: string
  eventsContext: string
  beachContext: string
  seismicContext: string
  userPreferences: Record<string, any>
  conversationHistory: string
  userMessage: string
  locale?: string
}): string {
  const locale = params.locale || "en"
  const langInstruction = locale === "es"
    ? "Responde SIEMPRE en español, usando el dialecto costarricense cuando sea apropiado."
    : "Always respond in English."

  return `You are an expert Costa Rica travel assistant with deep hyperlocal knowledge, real-time weather and events awareness, beach conditions, and seismic activity data. You help travelers plan personalized itineraries with insider insights.

${langInstruction}

User preferences: ${JSON.stringify(params.userPreferences)}

CURRENT WEATHER CONDITIONS:
${params.weatherContext || "Weather data temporarily unavailable"}

CURRENT EVENTS & ACTIVITIES:
${params.eventsContext || "Events data loading..."}

BEACH & MARINE CONDITIONS:
${params.beachContext || "No beach-specific data requested"}

SEISMIC & VOLCANIC ACTIVITY:
${params.seismicContext || "No seismic data requested"}

Relevant knowledge base information:
${params.knowledgeContext}

Recent conversation:
${params.conversationHistory}

Guidelines:
- Provide specific, actionable travel advice for Costa Rica ONLY
- Base your answer ONLY on the provided context information. Do NOT invent facts.
- ALWAYS consider current weather conditions when making recommendations
- INTEGRATE local events and activities into travel suggestions naturally
- If asked about beach conditions, reference the marine data provided
- If asked about earthquakes or volcanoes, reference the seismic data provided
- Include hyperlocal insights like expat recommendations, hidden gems, cultural tips
- Suggest weather-appropriate activities based on current conditions
- When suggesting activities, prioritize current events and happenings
- Provide event details including pricing, duration, and booking information when available
- Match events to user interests and travel dates
- Provide weather-based packing suggestions when relevant
- Consider seasonal weather patterns and microclimates
- Be conversational and helpful, adapting to the user's preferences
- If asked about itinerary planning, create detailed day-by-day plans
- Include practical information like costs, timing, logistics
- If the context doesn't contain the answer to a specific question, acknowledge that you don't have that information rather than guessing
- ${langInstruction}`
}

async function generateWithRetry(
  systemPrompt: string,
  message: string,
  conversationHistory: string,
  knowledgeContext: string,
  ragContext: string[],
  locale: string | undefined,
): Promise<{ content: string; model: string; retryCount: number }> {
  let currentPrompt = systemPrompt
  let lastContent = ""
  let lastModel = ""
  let retryCount = 0
  const maxRetries = AI_CHAT_CONFIG.evaluation.maxRetries

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await generateCompletion("generation", {
      systemPrompt: currentPrompt,
      message,
      conversationHistory,
      temperature: AI_CHAT_CONFIG.defaults.temperature,
      maxTokens: AI_CHAT_CONFIG.defaults.maxTokens,
    })

    lastContent = result.content
    lastModel = result.model

    const evaluation = evaluateResponse({
      response: lastContent,
      ragContext,
      locale,
      userMessage: message,
    })

    if (evaluation.passed) {
      return { content: lastContent, model: lastModel, retryCount: attempt }
    }

    retryCount = attempt + 1
    console.warn(`Response failed evaluation (attempt ${attempt + 1}):`, {
      failedGuards: evaluation.failedGuards.map(g => g.type),
      score: evaluation.score,
    })

    currentPrompt = buildReinforcedSystemPrompt(currentPrompt, evaluation.failedGuards)
  }

  return { content: lastContent, model: lastModel, retryCount }
}

Deno.serve(
  withEdgeHandler(
    async (req, { user }) => {
      try {
        const {
          message,
          conversationId,
          userPreferences = {},
          locationContext = null,
          locale,
        } = await req.json()

        if (!message) {
          return new Response(
            JSON.stringify({ error: "message_required", message: "Message is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }

        const supabaseUrl = readEnv("SUPABASE_URL")
        const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY")
        const userId = user?.id

        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error("Missing Supabase environment variables")
        }

        const resolvedLocale = locale || userPreferences?.locale || "en"

        let conversation: any = null

        if (userId) {
          if (conversationId) {
            const convResp = await fetchWithAuth(
              `${supabaseUrl}/rest/v1/conversations?id=eq.${conversationId}&user_id=eq.${userId}`,
            )
            const conversations = await convResp.json()
            conversation = conversations[0]
          }

          if (!conversation) {
            const convResp = await fetchWithAuth(
              `${supabaseUrl}/rest/v1/conversations`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", Prefer: "return=representation" },
                body: JSON.stringify({
                  user_id: userId,
                  title: message.substring(0, 50) + "...",
                  context: { userPreferences, locale: resolvedLocale },
                }),
              },
            )
            const newConvs = await convResp.json()
            conversation = newConvs[0]
          }

          await fetchWithAuth(
            `${supabaseUrl}/rest/v1/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversation_id: conversation.id,
                role: "user",
                content: message,
              }),
            },
          )
        }

        let recentHistory: Array<Record<string, unknown>> = []
        if (conversation) {
          const histResp = await fetchWithAuth(
            `${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversation.id}&order=created_at.desc&limit=${AI_CHAT_CONFIG.context.maxHistoryMessages}`,
          )
          const history = await histResp.json()
          recentHistory = (history || []).reverse()
        }

        const conversationHistory = recentHistory
          .map((msg: any) => `${msg.role}: ${msg.content}`)
          .join("\n")

        const liveContext = await fetchLiveContext(message, supabaseUrl, serviceRoleKey, locationContext)

        const { relevantKnowledge, knowledgeContext } = await searchKnowledge(message)

        const systemPrompt = buildSystemPrompt({
          knowledgeContext,
          weatherContext: liveContext.weather.context,
          eventsContext: liveContext.events.context,
          beachContext: liveContext.beach.context,
          seismicContext: liveContext.seismic.context,
          userPreferences,
          conversationHistory,
          userMessage: message,
          locale: resolvedLocale,
        })

        const ragContext = [
          knowledgeContext,
          liveContext.weather.context,
          liveContext.events.context,
          liveContext.beach.context,
          liveContext.seismic.context,
        ].filter(Boolean).map((c: string) => c as string)

        const { content: assistantMessage, model: modelUsed, retryCount } = await generateWithRetry(
          systemPrompt,
          message,
          conversationHistory,
          knowledgeContext,
          ragContext,
          resolvedLocale,
        )

        if (conversation) {
          const evaluations = evaluateResponse({
            response: assistantMessage,
            ragContext,
            locale: resolvedLocale,
            userMessage: message,
          })

          await fetchWithAuth(
            `${supabaseUrl}/rest/v1/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversation_id: conversation.id,
                role: "assistant",
                content: assistantMessage,
                metadata: {
                  sources: relevantKnowledge.map((k: any) => ({
                    title: k.title,
                    category: k.category,
                    location: k.location,
                  })),
                  model: modelUsed,
                  evaluation: {
                    passed: evaluations.passed,
                    score: evaluations.score,
                    failedGuards: evaluations.failedGuards.map(g => g.type),
                    retryCount,
                  },
                  weather_context: liveContext.weather.data.length > 0,
                  weather_locations: liveContext.weather.data.map((w: any) => w.name),
                  events_context: liveContext.events.data.length > 0,
                  events_count: liveContext.events.data.length,
                  beach_context: liveContext.beach.data.length > 0,
                  seismic_context: liveContext.seismic.data.length > 0,
                  locale: resolvedLocale,
                },
              }),
            },
          )
        }

        return new Response(
          JSON.stringify({
            data: {
              message: assistantMessage,
              conversationId: conversation?.id ?? null,
              sources: relevantKnowledge,
              weather: liveContext.weather.data,
              events: liveContext.events.data.slice(0, 5),
              beach: liveContext.beach.data,
              seismic: liveContext.seismic.data,
              aiProvider: modelUsed,
              modelUsed,
              locale: resolvedLocale,
              evaluation: {
                retryCount,
                score: evaluateResponse({
                  response: assistantMessage,
                  ragContext,
                  locale: resolvedLocale,
                  userMessage: message,
                }).score,
              },
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      } catch (error) {
        console.error("AI chat error:", error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return new Response(
          JSON.stringify({ error: { code: "AI_CHAT_ERROR", message: errorMessage } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
    },
    { requireAuth: false },
  ),
)
