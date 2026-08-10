import type { ProviderAdapter, CompletionParams, CompletionResult } from "../types.ts"

const BASE_URL = "https://api.anthropic.com/v1"

export const anthropicProvider: ProviderAdapter = {
  name: "anthropic",

  async complete(params: CompletionParams & { apiKey: string; model: string }): Promise<CompletionResult> {
    const start = Date.now()
    const { apiKey, model, systemPrompt, message, conversationHistory, temperature = 0.7, maxTokens = 1000 } = params

    let system = systemPrompt
    const messages: Array<{ role: string; content: string }> = []

    if (conversationHistory) {
      const historyLines = conversationHistory.split("\n")
      for (const line of historyLines) {
        const [role, ...contentParts] = line.split(": ")
        if (role === "user") {
          messages.push({ role: "user", content: contentParts.join(": ") })
        } else if (role === "assistant") {
          messages.push({ role: "assistant", content: contentParts.join(": ") })
        }
      }
    }
    messages.push({ role: "user", content: message })

    const response = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        system,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic completion error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()
    return {
      content: data.content[0].text,
      model,
      provider: "anthropic",
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
      },
      latencyMs: Date.now() - start,
    }
  },

  async embed(): Promise<never> {
    throw new Error("Anthropic does not support embeddings")
  },

  async healthCheck(apiKey: string, _model: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/models`, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      })
      return response.ok
    } catch {
      return false
    }
  },
}
