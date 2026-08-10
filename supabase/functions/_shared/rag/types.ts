export type GuardType = "rag-grounded" | "costa-rica-only" | "language"

export interface GuardConfig {
  type: GuardType
  enabled: boolean
  maxRetries: number
}

export interface EvaluationResult {
  passed: boolean
  failedGuards: Array<{
    type: GuardType
    reason: string
    confidence: number
  }>
  score: number
  retryCount: number
}

export interface EvaluationInput {
  response: string
  ragContext: string[]
  locale?: string
  userMessage: string
}

export const DEFAULT_GUARD_CONFIG: GuardConfig[] = [
  { type: "rag-grounded", enabled: true, maxRetries: 1 },
  { type: "costa-rica-only", enabled: true, maxRetries: 1 },
  { type: "language", enabled: true, maxRetries: 1 },
]
