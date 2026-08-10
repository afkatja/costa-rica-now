import { assertEquals, assert } from "https://deno.land/std@0.177.0/testing/asserts.ts"
import { analyzeQuery, isRelevantDomain } from "../keyword-analyzer.ts"

Deno.test("keyword-analyzer: detects beach domain", () => {
  const result = analyzeQuery("What are the best beaches for surfing in Costa Rica?")
  assert(result.domains.includes("beach"), "Should detect beach domain")
  assert(result.confidence.beach > 0, "Should have beach confidence > 0")
})

Deno.test("keyword-analyzer: detects seismic domain", () => {
  const result = analyzeQuery("Are there any recent earthquakes near Arenal volcano?")
  assert(result.domains.includes("seismic"), "Should detect seismic domain")
  assert(result.confidence.seismic > 0, "Should have seismic confidence > 0")
})

Deno.test("keyword-analyzer: detects weather domain", () => {
  const result = analyzeQuery("What is the weather forecast for Manuel Antonio this weekend?")
  assert(result.domains.includes("weather"), "Should detect weather domain")
  assert(result.confidence.weather > 0, "Should have weather confidence > 0")
})

Deno.test("keyword-analyzer: detects multiple domains", () => {
  const result = analyzeQuery("What is the weather like at the beaches near the volcano?")
  assert(result.domains.includes("weather"), "Should detect weather")
  assert(result.domains.includes("beach"), "Should detect beach")
  assert(result.domains.includes("seismic"), "Should detect seismic")
})

Deno.test("keyword-analyzer: extracts search terms", () => {
  const result = analyzeQuery("What beaches are best for surfing in Guanacaste?")
  assert(result.searchTerms.includes("beaches"), "Should include 'beaches'")
  assert(result.searchTerms.includes("surfing"), "Should include 'surfing'")
  assert(result.searchTerms.includes("guanacaste"), "Should include 'Guanacaste'")
  assertEquals(result.searchTerms.filter(t => t.length <= 3).length, 0, "Should filter out short words")
})

Deno.test("keyword-analyzer: isRelevantDomain works", () => {
  assert(isRelevantDomain("Where can I surf in Tamarindo?", "beach"), "Should detect beach relevance")
  assert(isRelevantDomain("Is there seismic activity near Arenal?", "seismic"), "Should detect seismic relevance")
  assert(!isRelevantDomain("What restaurants do you recommend?", "seismic"), "Should not detect seismic for restaurants")
})

Deno.test("keyword-analyzer: handles empty/generic queries", () => {
  const result = analyzeQuery("Hello")
  assertEquals(result.domains.length, 0, "No domains for generic greeting")
  assertEquals(result.searchTerms.length, 0, "No search terms for short query")
})

Deno.test("keyword-analyzer: handles Spanish queries", () => {
  const result = analyzeQuery("¿Cuáles son las mejores playas para surfear en Costa Rica?")
  assert(result.domains.includes("beach"), "Should detect beach domain in Spanish")
  assert(result.searchTerms.some(t => t.includes("playa") || t.includes("surf")), "Should extract Spanish search terms")
})
