export default async function generateCompletions({
  provider,
  context,
  message,
  conversationHistory,
}: {
  provider: "openai" | "free"
  context: {
    userPreferences: any
    weatherContext: any
    eventsContext: any
    knowledgeContext: any
  }
  message: any
  conversationHistory: any
}) {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
  const groqApiKey = Deno.env.get("GROQ_API_KEY")

  // Generate AI response based on provider
  let assistantMessage
  let modelUsed

  // Create system prompt with Costa Rica travel expertise, weather awareness, and events integration
  const systemPrompt = `You are an expert Costa Rica travel assistant with deep hyperlocal knowledge, real-time weather awareness, and access to current local events. You help travelers plan personalized itineraries with insider insights.

User preferences: ${JSON.stringify(context.userPreferences)}

CURRENT WEATHER CONDITIONS (${new Date().toLocaleDateString()}):
${context.weatherContext || "Weather data temporarily unavailable"}

CURRENT EVENTS & ACTIVITIES:
${context.eventsContext || "Events data loading..."}

Relevant knowledge base information:
${context.knowledgeContext}

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
  if (provider === "openai") {
    console.log("Generating response with OpenAI")
    const model = "gpt-4o-mini"
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
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
    modelUsed = model
  } else {
    console.log("Generating response with Groq")
    const model = "llama-3.3-70b-versatile"
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
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
    modelUsed = model
  }
  return { assistantMessage, modelUsed }
}
