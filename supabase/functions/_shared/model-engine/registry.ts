import type { ProviderAdapter, ModelRoleConfig, FallbackEntry } from "./types.ts"

const providers = new Map<string, ProviderAdapter>()

export function registerProvider(adapter: ProviderAdapter): void {
  if (providers.has(adapter.name)) {
    console.warn(`[model-engine] Provider "${adapter.name}" already registered, overwriting`)
  }
  providers.set(adapter.name, adapter)
}

export function getProvider(name: string): ProviderAdapter {
  const adapter = providers.get(name)
  if (!adapter) {
    throw new Error(`[model-engine] No provider registered for "${name}". Available: ${listProviders().join(", ")}`)
  }
  return adapter
}

export function hasProvider(name: string): boolean {
  return providers.has(name)
}

export function listProviders(): string[] {
  return Array.from(providers.keys())
}

function readEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name)
  } catch {
    return undefined
  }
}

function parseFallbackChain(raw: string | undefined): FallbackEntry[] {
  if (!raw) return []
  return raw.split(",").map(entry => {
    const [provider, model] = entry.trim().split(":")
    if (!provider || !model) {
      console.warn(`[model-engine] Invalid fallback entry: "${entry}"`)
      return null
    }
    return { provider: provider.trim(), model: model.trim() }
  }).filter(Boolean) as FallbackEntry[]
}

export function getRoleConfig(role: string): ModelRoleConfig {
  const prefix = roleToEnvPrefix(role)

  const provider = readEnv(`${prefix}_PROVIDER`) || readEnv(`MAIN_MODEL_PROVIDER`) || readEnv("AI_PROVIDER") || "openai"
  const model = readEnv(`${prefix}_MODEL_ID`) || readEnv(`MAIN_MODEL_ID`) || modelDefaultForRole(role, provider)
  const maxTokens = parseInt(readEnv(`${prefix}_MAX_TOKENS`) || "1000")
  const temperature = parseFloat(readEnv(`${prefix}_TEMPERATURE`) || "0.7")
  const fallbacksRaw = readEnv(`${prefix}_FALLBACKS`)
  const fallbacks = parseFallbackChain(fallbacksRaw)

  return {
    roleId: role,
    provider,
    model,
    maxTokens,
    temperature,
    fallbacks,
  }
}

function roleToEnvPrefix(role: string): string {
  switch (role) {
    case "generation": return "MAIN_GENERATION_MODEL"
    case "evaluation": return "EVAL_MODEL"
    case "fast": return "FAST_GENERATION_MODEL"
    case "embedding": return "EMBEDDING_MODEL"
    case "tool-calling": return "TOOL_GENERATION_MODEL"
    default: return role.toUpperCase().replace(/-/g, "_")
  }
}

function modelDefaultForRole(role: string, provider: string): string {
  if (role === "embedding") {
    return provider === "openai" ? "text-embedding-3-small" : "sentence-transformers/all-MiniLM-L6-v2"
  }
  return provider === "openai" ? "gpt-4o-mini" : "llama-3.3-70b-versatile"
}

export function resolveFallbackChain(roleConfig: ModelRoleConfig): FallbackEntry[] {
  const chain: FallbackEntry[] = []
  chain.push({ provider: roleConfig.provider, model: roleConfig.model })
  chain.push(...roleConfig.fallbacks)
  return chain
}
