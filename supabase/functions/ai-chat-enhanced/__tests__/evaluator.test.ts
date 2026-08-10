import { assertEquals, assert } from "https://deno.land/std@0.177.0/testing/asserts.ts"
import { evaluateResponse, buildReinforcedSystemPrompt } from "../_shared/rag/evaluator.ts"

Deno.test("evaluator: passes on well-grounded Costa Rica response in English", () => {
  const result = evaluateResponse({
    response: "Manuel Antonio has beautiful beaches with white sand and crystal-clear waters. The best time to visit is during the dry season from December to April. You can see sloths and monkeys in the national park.",
    ragContext: [
      "Title: Manuel Antonio Beach Guide\nLocation: Manuel Antonio\nContent: Manuel Antonio features pristine white sand beaches with crystal-clear waters, surrounded by lush rainforest. Best visited during dry season (December-April).",
      "Title: Costa Rica Wildlife\nLocation: General\nContent: Costa Rica is home to sloths, monkeys, and tropical birds.",
    ],
    locale: "en",
    userMessage: "Tell me about Manuel Antonio",
  })

  assertEquals(result.passed, true, "Response should pass all guards")
})

Deno.test("evaluator: passes on Costa Rica response in Spanish", () => {
  const result = evaluateResponse({
    response: "Manuel Antonio tiene hermosas playas de arena blanca y aguas cristalinas. La mejor época para visitar es durante la temporada seca de diciembre a abril. Puedes ver perezosos y monos en el parque nacional.",
    ragContext: [
      "Title: Manuel Antonio Beach Guide\nLocation: Manuel Antonio\nContent: Manuel Antonio features pristine white sand beaches.",
    ],
    locale: "es",
    userMessage: "Háblame de Manuel Antonio",
  })

  assertEquals(result.passed, true, "Spanish response should pass language guard")
})

Deno.test("evaluator: fails when response mentions non-Costa Rica locations", () => {
  const result = evaluateResponse({
    response: "You should also consider visiting Mexico's Cancun beaches, which are similar to Costa Rica's.",
    ragContext: ["Title: Beach Guide\nLocation: General\nContent: Costa Rica has many beaches."],
    locale: "en",
    userMessage: "Where should I go?",
  })

  assertEquals(result.passed, false, "Should fail when mentioning other countries")
  assert(result.failedGuards.some(g => g.type === "costa-rica-only"), "Should flag Costa Rica guard")
})

Deno.test("evaluator: fails when response language doesn't match locale", () => {
  const result = evaluateResponse({
    response: "Manuel Antonio is a beautiful beach destination with white sand.",
    ragContext: ["Title: Beach Guide\nLocation: General\nContent: Costa Rica beaches."],
    locale: "es",
    userMessage: "Háblame de playas",
  })

  assertEquals(result.passed, false, "Should fail when language doesn't match")
  assert(result.failedGuards.some(g => g.type === "language"), "Should flag language guard")
})

Deno.test("evaluator: fails when response is not grounded in RAG context", () => {
  const result = evaluateResponse({
    response: "The Great Barrier Reef in Australia is the world's largest coral reef system. It stretches over 2,300 kilometers and is home to thousands of marine species. You can go diving and snorkeling there.",
    ragContext: [
      "Title: Costa Rica Beaches\nLocation: General\nContent: Costa Rica has beaches on both Pacific and Caribbean coasts.",
    ],
    locale: "en",
    userMessage: "Tell me about beaches",
  })

  assertEquals(result.passed, false, "Should fail when response is not grounded in RAG context")
  assert(result.failedGuards.some(g => g.type === "rag-grounded"), "Should flag RAG-grounded guard")
})

Deno.test("evaluator: computes score correctly", () => {
  const result = evaluateResponse({
    response: "Manuel Antonio has beautiful beaches with white sand.",
    ragContext: [
      "Title: Manuel Antonio Beach Guide\nLocation: Manuel Antonio\nContent: Manuel Antonio features pristine white sand beaches.",
    ],
    locale: "en",
    userMessage: "Tell me about beaches",
  })

  assertEquals(result.passed, true)
  assert(result.score >= 0.5, "Score should be >= 0.5 for passing response")
  assertEquals(result.retryCount, 0)
})

Deno.test("evaluator: buildReinforcedSystemPrompt adds guard instructions", () => {
  const original = "You are a travel assistant for Costa Rica."
  const result = buildReinforcedSystemPrompt(original, [
    { type: "rag-grounded", reason: "Not grounded", confidence: 0.3 },
    { type: "costa-rica-only", reason: "Other countries mentioned", confidence: 0.5 },
  ])

  assert(result.includes("REINFORCED INSTRUCTIONS"), "Should include reinforced section")
  assert(result.includes("Base your answer ONLY on the provided context"), "Should include RAG instruction")
  assert(result.includes("Do NOT reference any other countries"), "Should include Costa Rica instruction")
  assert(result.includes(original), "Should preserve original prompt")
})
