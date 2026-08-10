import type { ProviderAdapter, EmbeddingParams, EmbeddingResult } from "../types.ts"

const BASE_URL = "https://api-inference.huggingface.co"

export const huggingfaceProvider: ProviderAdapter = {
  name: "huggingface",

  async complete(): Promise<never> {
    throw new Error("HuggingFace inference provider does not support chat completions via this adapter")
  },

  async embed(params: EmbeddingParams & { apiKey: string; model: string }): Promise<EmbeddingResult> {
    const start = Date.now()
    const { apiKey, model, input } = params

    const inputs = Array.isArray(input) ? input : [input]
    const response = await fetch(
      `${BASE_URL}/pipeline/feature-extraction/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs,
          options: { wait_for_model: true },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`HuggingFace embedding error: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()
    const embeddings = Array.isArray(data[0]) ? data : [data]

    return {
      embedding: Array.isArray(input) ? embeddings : embeddings[0],
      model,
      provider: "huggingface",
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
