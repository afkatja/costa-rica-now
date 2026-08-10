import type { ProviderAdapter, CompletionParams, CompletionResult, EmbeddingParams, EmbeddingResult } from "../types.ts"

const BASE_URL = "https://api.openai.com/v1"

export const openaiProvider: ProviderAdapter = {
  name: "openai",

  async complete(params: CompletionParams & { apiKey: string; model: string }): Promise<CompletionResult> {
    const start = Date.now()
    const { apiKey, model, systemPrompt, message, conversationHistory, temperature = 0.7, maxTokens = 1000 } = params

    const messages = [
      { role: "system", content: systemPrompt },
    ]
    if (conversationHistory) {
      const historyLines = conversationHistory.split("\n")
      for (const line of historyLines) {
        const [role, ...contentParts] = line.split(": ")
        if (role === "user" || role === "assistant") {
          messages.push({ role, content: contentParts.join(": ") })
        }
      }
    }
    messages.push({ role: "user", content: message })

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI completion error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      model,
      provider: "openai",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
      },
      latencyMs: Date.now() - start,
    }
  },

  async embed(params: EmbeddingParams & { apiKey: string; model: string }): Promise<EmbeddingResult> {
    const start = Date.now()
    const { apiKey, model, input } = params

    const response = await fetch(`${BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        model,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI embedding error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()
    const embeddings = data.data.map((d: any) => d.embedding)

    return {
      embedding: Array.isArray(input) ? embeddings : embeddings[0],
      model,
      provider: "openai",
      dimensions: embeddings[0].length,
      latencyMs: Date.now() - start,
    }
  },

  async healthCheck(apiKey: string, _model: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  },
}
