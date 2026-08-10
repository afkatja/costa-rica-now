export const KEYWORD_CONFIG = {
  beach: {
    keywords: [
      "beach", "beaches", "surf", "surfing", "tide", "tides", "ocean", "sea",
      "swim", "swimming", "snorkel", "snorkeling", "wave", "waves", "coastal",
      "coast", "sand", "bay", "cove", "marine", "diving", "scuba", "kayak",
      "kayaking", "paddle", "fishing", "boating", "sail", "sailing",
      "playa", "playas", "mar", "olas", "buceo", "pesca", "navegación",
    ],
    ttlMs: 5 * 60 * 1000,
  },
  seismic: {
    keywords: [
      "earthquake", "earthquakes", "quake", "quakes", "seismic", "tremor",
      "tremors", "volcano", "volcanoes", "volcanic", "eruption", "eruptions",
      "magnitude", "epicenter", "aftershock", "tectonic", "fault line",
      "terremoto", "terremotos", "sismo", "sismos", "temblor", "temblores",
      "volcán", "volcanes", "erupción", "magnitud", "epicentro",
    ],
    ttlMs: 60 * 1000,
  },
  weather: {
    keywords: [
      "weather", "forecast", "rain", "rainy", "sunny", "cloudy", "storm",
      "temperature", "humid", "humidity", "wind", "climate", "season",
      "dry season", "rainy season", "green season",
      "clima", "lluvia", "soleado", "nublado", "tormenta", "temperatura",
      "humedad", "viento", "temporada",
    ],
    ttlMs: 10 * 60 * 1000,
  },
} as const

export type DomainType = keyof typeof KEYWORD_CONFIG

export interface KeywordAnalysis {
  domains: DomainType[]
  confidence: Record<DomainType, number>
  searchTerms: string[]
}

export function analyzeQuery(message: string): KeywordAnalysis {
  const lower = message.toLowerCase()
  const words = lower.split(/\s+/)

  const domains: DomainType[] = []
  const confidence: Record<string, number> = {} as any

  for (const [domain, config] of Object.entries(KEYWORD_CONFIG)) {
    let matches = 0
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) {
        matches++
      }
    }
    const score = matches / Math.max(words.length, 1)
    if (score > 0) {
      confidence[domain] = Math.min(score * 3, 1)
      domains.push(domain as DomainType)
    }
  }

  const searchTerms = words
    .filter(w => w.length > 3)
    .filter(w => !["what", "where", "when", "how", "the", "and", "for", "with", "that", "this", "from", "have"].includes(w))
    .slice(0, 5)

  return { domains, confidence, searchTerms }
}

export function isRelevantDomain(message: string, domain: DomainType): boolean {
  const config = KEYWORD_CONFIG[domain]
  const lower = message.toLowerCase()
  return config.keywords.some(keyword => lower.includes(keyword))
}
