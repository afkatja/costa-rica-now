import type { EvaluationInput, EvaluationResult, GuardType } from "./types.ts"
import { COSTA_RICA_CONFIG } from "../model-engine/types.ts"

const KNOWN_DESTINATIONS = [
  "san jose", "manuel antonio", "monteverde", "arenal", "liberia", "guanacaste",
  "puerto viejo", "dominical", "uvita", "puerto jimenez", "tortuguero",
  "san isidro", "san vito", "samara", "tamarindo", "jaco", "cahuita",
  "corcovado", "carara", "poas", "irazu", "turrialba", "rincon de la vieja",
  "nicoya", "nosara", "santa teresa", "mal pais", "montezuma",
]

const COSTA_RICA_KEYWORDS = [
  "costa rica", "tica", "tico", "pura vida", "gallo pinto", "casado",
  ...KNOWN_DESTINATIONS,
  ...COSTA_RICA_CONFIG.knownRegions.map(r => r.toLowerCase()),
]

const CR_REGEX = new RegExp(`\\b(${COSTA_RICA_KEYWORDS.join("|")})\\b`, "i")

function checkRagGrounded(response: string, ragContext: string[]): { passed: boolean; confidence: number; reason: string } {
  if (!ragContext || ragContext.length === 0) {
    return { passed: true, confidence: 0, reason: "No RAG context available, skipping guard" }
  }

  const combinedContext = ragContext.join(" ").toLowerCase()
  const sentences = response.match(/[^.!?\n]+[.!?\n]*/g) || [response]

  let ungroundedSentences = 0
  let totalSignificant = 0

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (trimmed.length < 20) continue
    totalSignificant++

    const sentenceLower = trimmed.toLowerCase()
    const words = sentenceLower.split(/\s+/).filter(w => w.length > 3)

    const matchRatio = words.filter(w => combinedContext.includes(w)).length / words.length

    if (matchRatio < 0.3) {
      ungroundedSentences++
    }
  }

  if (totalSignificant === 0) {
    return { passed: true, confidence: 1, reason: "No significant sentences to evaluate" }
  }

  const ungroundedRatio = ungroundedSentences / totalSignificant
  const passed = ungroundedRatio < 0.5
  return {
    passed,
    confidence: 1 - ungroundedRatio,
    reason: passed
      ? "Response is sufficiently grounded in RAG context"
      : `${Math.round(ungroundedRatio * 100)}% of sentences are not grounded in RAG context`,
  }
}

function checkCostaRica(response: string): { passed: boolean; confidence: number; reason: string } {
  const responseLower = response.toLowerCase()

  const hasCrReference = CR_REGEX.test(responseLower)
  const mentionsOtherCountry = /\b(mexico|spain|france|italy|japan|china|brazil|argentina|peru|colombia|chile|usa|united states|canada|australia|thailand|vietnam|india|germany|uk|united kingdom)\b/i.test(responseLower)

  const explicitCr = /\bcosta\s*rica\b/i.test(responseLower)

  if (explicitCr) {
    return { passed: true, confidence: 1, reason: "Explicitly mentions Costa Rica" }
  }

  if (hasCrReference && !mentionsOtherCountry) {
    return { passed: true, confidence: 0.9, reason: "References Costa Rica locations" }
  }

  if (hasCrReference && mentionsOtherCountry) {
    return { passed: false, confidence: 0.5, reason: "Mentions locations outside Costa Rica" }
  }

  return { passed: true, confidence: 0.7, reason: "No country-specific content detected" }
}

function checkLanguage(response: string, locale?: string): { passed: boolean; confidence: number; reason: string } {
  const targetLocale = locale || COSTA_RICA_CONFIG.supportedLocales[0]

  if (!COSTA_RICA_CONFIG.supportedLocales.includes(targetLocale)) {
    return { passed: false, confidence: 0, reason: `Unsupported locale: ${targetLocale}` }
  }

  const esChars = /[áéíóúüñ¿¡]/g
  const enIndicators = /\b(the|and|for|are|you|with|have|this|that|from|they|will|your|which|their|about|would|there|could|should|what|when|where|how|why|is|it|in|on|at|by|to|of|a|an|be|do|does|did|has|have|had|not|no|or|if|as|but|can|may|all|each|every|both|some|any|much|many|most|few|such|than|then|than|just|also|very|too|well|here|there|now|then|only|own|same|so|than|too|very|just|also|well|even|still|already|yet|ever|never|always|often|sometimes|usually|again|once|twice|more|less|much|many|most|few|little|enough|plenty|lots|tons|heaps|more|less|fewer|more|less|much|many|more|most|least|best|worst|better|worse|further|farther)\b/gi
  const esIndicators = /\b(el|la|los|las|un|una|unos|unas|y|que|es|por|con|su|para|como|más|pero|sus|hay|también|entre|está|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas|todo|toda|todos|todas|cada|muy|poco|poca|pocos|pocas|mucho|mucha|muchos|muchas|demasiado|bastante|varios|varias|otro|otra|otros|otras|mismo|misma|mismos|mismas|tan|tanto|tanta|tantos|tantas|qué|cuál|quién|quiénes|cómo|cuándo|dónde|porqué|cuánto|cuánta|cuántos|cuántas|sí|no|o|pero|aunque|si|como|cuando|mientras|después|antes|durante|hasta|desde|hacia|contra|sin|sobre|entre|tras|mediante|según)\b/gi

  const enCount = (response.match(enIndicators) || []).length
  const esCount = (response.match(esIndicators) || []).length
  const esCharCount = (response.match(esChars) || []).length

  const detectedLanguage = esCount > enCount ? "es" : "en"

  if (detectedLanguage !== targetLocale) {
    return {
      passed: false,
      confidence: 0.6,
      reason: `Response language (${detectedLanguage}) differs from requested locale (${targetLocale})`,
    }
  }

  return { passed: true, confidence: 0.9, reason: `Response is in ${detectedLanguage}` }
}

function computeOverallScore(guardResults: Array<{ passed: boolean; confidence: number }>): number {
  if (guardResults.length === 0) return 1
  const weights = [0.4, 0.3, 0.3]
  let score = 0
  let totalWeight = 0
  for (let i = 0; i < guardResults.length; i++) {
    const w = weights[i] || 1 / guardResults.length
    score += (guardResults[i].passed ? guardResults[i].confidence : 0) * w
    totalWeight += w
  }
  return totalWeight > 0 ? score / totalWeight : 0
}

export function evaluateResponse(input: EvaluationInput): EvaluationResult {
  const { response, ragContext, locale } = input

  const guards: Array<() => { passed: boolean; confidence: number; reason: string }> = [
    () => checkRagGrounded(response, ragContext),
    () => checkCostaRica(response),
    () => checkLanguage(response, locale),
  ]

  const guardTypes: GuardType[] = ["rag-grounded", "costa-rica-only", "language"]

  const failedGuards: EvaluationResult["failedGuards"] = []
  const guardResults: Array<{ passed: boolean; confidence: number }> = []

  for (let i = 0; i < guards.length; i++) {
    const result = guards[i]()
    guardResults.push({ passed: result.passed, confidence: result.confidence })
    if (!result.passed) {
      failedGuards.push({
        type: guardTypes[i],
        reason: result.reason,
        confidence: result.confidence,
      })
    }
  }

  const passed = failedGuards.length === 0
  const score = computeOverallScore(guardResults)

  return {
    passed,
    failedGuards,
    score,
    retryCount: 0,
  }
}

export function buildReinforcedSystemPrompt(originalPrompt: string, failedGuards: Array<{ type: GuardType; reason: string }>): string {
  const reinforcements: string[] = []

  for (const guard of failedGuards) {
    switch (guard.type) {
      case "rag-grounded":
        reinforcements.push("- CRITICAL: Base your answer ONLY on the provided context information. Do NOT invent facts or use external knowledge. If the context doesn't contain the answer, say so.")
        break
      case "costa-rica-only":
        reinforcements.push("- CRITICAL: Only discuss Costa Rica. Do NOT reference any other countries, regions, or destinations outside of Costa Rica.")
        break
      case "language":
        reinforcements.push("- CRITICAL: Respond in the exact same language as the user's message. If they write in Spanish, answer in Spanish. If in English, answer in English.")
        break
    }
  }

  return `${originalPrompt}\n\n## REINFORCED INSTRUCTIONS\n${reinforcements.join("\n")}`
}
