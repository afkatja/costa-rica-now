import { COSTA_RICA_BOUNDS } from "../coords.ts"

export type ModelRole = "generation" | "evaluation" | "fast" | "embedding" | "tool-calling"

export interface CompletionParams {
  systemPrompt: string
  message: string
  conversationHistory?: string
  temperature?: number
  maxTokens?: number
}

export interface CompletionResult {
  content: string
  model: string
  provider: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
  latencyMs: number
}

export interface EmbeddingParams {
  input: string | string[]
}

export interface EmbeddingResult {
  embedding: number[] | number[][]
  model: string
  provider: string
  dimensions: number
  latencyMs: number
}

export interface FallbackEntry {
  provider: string
  model: string
}

export interface ModelRoleConfig {
  roleId: ModelRole | string
  provider: string
  model: string
  maxTokens: number
  maxInputTokens?: number
  temperature: number
  fallbacks: FallbackEntry[]
}

export interface ProviderAdapter {
  readonly name: string
  complete(params: CompletionParams & { apiKey: string; model: string }): Promise<CompletionResult>
  embed(params: EmbeddingParams & { apiKey: string; model: string }): Promise<EmbeddingResult>
  healthCheck(apiKey: string, model: string): Promise<boolean>
}

export interface ModelEngineConfig {
  generation: ModelRoleConfig
  evaluation: ModelRoleConfig
  fast: ModelRoleConfig
  embedding: ModelRoleConfig
  "tool-calling": ModelRoleConfig
}

export const LOCALE_CONFIG = {
  supportedLocales: ["en", "es"],
  defaultLocale: "en",
} as const

export type SupportedLocale = (typeof LOCALE_CONFIG.supportedLocales)[number]

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return LOCALE_CONFIG.supportedLocales.includes(locale as SupportedLocale)
}

export interface CostaRicaBounds {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

export const COSTA_RICA_CONFIG = {
  bounds: COSTA_RICA_BOUNDS,
  knownRegions: [
    "Guanacaste",
    "Pacific Coast",
    "Central Pacific Coast",
    "Northern Highlands",
    "Northern Plains",
    "Valle Central",
    "Southern Pacific",
    "Northern Caribbean",
    "Southern Caribbean",
    "Southern Zone / Valle El General",
    "Southern Mountains / Talamanca",
  ],
  supportedLocales: ["en", "es"],
} as const
