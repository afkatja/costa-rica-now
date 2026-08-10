import { COSTA_RICA_CONFIG } from "../_shared/model-engine/types.ts"

export const AI_CHAT_CONFIG = {
  evaluation: {
    maxRetries: 1,
    supportedLocales: COSTA_RICA_CONFIG.supportedLocales,
    defaultLocale: "en",
  },
  context: {
    maxKnowledgeResults: 5,
    maxEventsToInclude: 10,
    maxWeatherLocations: 5,
    maxHistoryMessages: 10,
  },
  defaults: {
    temperature: 0.7,
    maxTokens: 1000,
  },
} as const
