import type { ProviderAdapter, CompletionParams, CompletionResult } from "../types.ts"

const BASE_URL = "https://api.groq.com/openai/v1"

export const groqProvider: ProviderAdapter = {
  name: "groq",

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
      throw new Error(`Groq completion error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      model,
      provider: "groq",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
      },
      latencyMs: Date.now() - start,
    }
  },

  async embed(): Promise<never> {
    throw new Error("Groq does not support embeddings")
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
