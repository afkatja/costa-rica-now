import { registerProvider, getProvider, hasProvider, getRoleConfig, resolveFallbackChain } from "./registry.ts"
import { openaiProvider } from "./providers/openai.ts"
import { groqProvider } from "./providers/groq.ts"
import { anthropicProvider } from "./providers/anthropic.ts"
import { huggingfaceProvider } from "./providers/huggingface.ts"
import type { CompletionParams, CompletionResult, EmbeddingParams, EmbeddingResult, ModelRole } from "./types.ts"

registerProvider(openaiProvider)
registerProvider(groqProvider)
registerProvider(anthropicProvider)
registerProvider(huggingfaceProvider)

function readEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name)
  } catch {
    return undefined
  }
}

function resolveApiKey(providerName: string): string {
  const envVar = `${providerName.toUpperCase()}_API_KEY`
  const key = readEnv(envVar)
  if (!key) {
    throw new Error(`[model-engine] Missing API key: ${envVar} is not set`)
  }
  return key
}

function detectLocale(): string {
  return readEnv("LOCALE") || "en"
}

export async function complete(
  role: ModelRole | string,
  params: CompletionParams,
): Promise<CompletionResult> {
  const config = getRoleConfig(role)
  const fallbackChain = resolveFallbackChain(config)

  let lastError: Error | null = null

  for (const entry of fallbackChain) {
    if (!hasProvider(entry.provider)) {
      console.warn(`[model-engine] Provider "${entry.provider}" not registered, skipping`)
      continue
    }
    try {
      const apiKey = resolveApiKey(entry.provider)
      const provider = getProvider(entry.provider)
      const result = await provider.complete({
        ...params,
        apiKey,
        model: entry.model,
        temperature: params.temperature ?? config.temperature,
        maxTokens: params.maxTokens ?? config.maxTokens,
      })
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[model-engine] ${entry.provider}:${entry.model} failed: ${lastError.message}`)
    }
  }

  throw lastError || new Error(`[model-engine] All providers failed for role "${role}"`)
}

export async function embed(
  role: ModelRole | string,
  params: EmbeddingParams,
): Promise<EmbeddingResult> {
  const config = getRoleConfig(role)
  const fallbackChain = resolveFallbackChain(config)

  let lastError: Error | null = null

  for (const entry of fallbackChain) {
    if (!hasProvider(entry.provider)) {
      continue
    }
    try {
      const apiKey = resolveApiKey(entry.provider)
      const provider = getProvider(entry.provider)
      const result = await provider.embed({
        ...params,
        apiKey,
        model: entry.model,
      })
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[model-engine] ${entry.provider}:${entry.model} embedding failed: ${lastError.message}`)
    }
  }

  throw lastError || new Error(`[model-engine] All embedding providers failed for role "${role}"`)
}

export async function healthCheck(role: ModelRole | string): Promise<boolean> {
  try {
    const config = getRoleConfig(role)
    const apiKey = resolveApiKey(config.provider)
    const provider = getProvider(config.provider)
    return await provider.healthCheck(apiKey, config.model)
  } catch {
    return false
  }
}

export async function generateCompletion(
  params: CompletionParams & { role?: ModelRole | string },
): Promise<CompletionResult> {
  return complete(params.role || "generation", {
    systemPrompt: params.systemPrompt,
    message: params.message,
    conversationHistory: params.conversationHistory,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  })
}

export async function generateEmbedding(
  input: string | string[],
  role?: ModelRole | string,
): Promise<EmbeddingResult> {
  return embed(role || "embedding", { input })
}

export { registerProvider, getProvider, hasProvider, listProviders } from "./registry.ts"
