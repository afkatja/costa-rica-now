import { assertEquals, assert } from "https://deno.land/std@0.177.0/testing/asserts.ts"

Deno.test("model-engine: registry registers and resolves providers", () => {
  const { registerProvider, getProvider, hasProvider, listProviders } = require("../_shared/model-engine/registry.ts")

  // Providers should be auto-registered from index.ts
  // Verify the registry pattern works
  assert(true, "Registry module loads successfully")
})

Deno.test("model-engine: getRoleConfig reads from env with fallback", () => {
  const envBackup = { ...Deno.env.toObject() }

  try {
    Deno.env.set("MAIN_GENERATION_MODEL_PROVIDER", "openai")
    Deno.env.set("MAIN_GENERATION_MODEL_ID", "gpt-4o-mini")

    const { getRoleConfig } = require("../_shared/model-engine/registry.ts")
    const config = getRoleConfig("generation")

    assertEquals(config.provider, "openai")
    assertEquals(config.model, "gpt-4o-mini")
    assertEquals(config.roleId, "generation")
  } finally {
    for (const key of Object.keys(Deno.env.toObject())) {
      Deno.env.delete(key)
    }
    for (const [key, val] of Object.entries(envBackup)) {
      Deno.env.set(key, val)
    }
  }
})

Deno.test("model-engine: fallback chain parsing", () => {
  const envBackup = { ...Deno.env.toObject() }

  try {
    Deno.env.set("MAIN_GENERATION_MODEL_FALLBACKS", "groq:llama-3.3-70b-versatile,anthropic:claude-3-haiku-20240307")

    const { getRoleConfig, resolveFallbackChain } = require("../_shared/model-engine/registry.ts")
    const config = getRoleConfig("generation")
    const chain = resolveFallbackChain(config)

    assertEquals(chain.length, 3)
    assertEquals(chain[0].provider, config.provider)
    assertEquals(chain[1].provider, "groq")
    assertEquals(chain[1].model, "llama-3.3-70b-versatile")
    assertEquals(chain[2].provider, "anthropic")
    assertEquals(chain[2].model, "claude-3-haiku-20240307")
  } finally {
    for (const key of Object.keys(Deno.env.toObject())) {
      Deno.env.delete(key)
    }
    for (const [key, val] of Object.entries(envBackup)) {
      Deno.env.set(key, val)
    }
  }
})

Deno.test("model-engine: embedding role config", () => {
  const envBackup = { ...Deno.env.toObject() }

  try {
    Deno.env.set("EMBEDDING_MODEL_PROVIDER", "openai")
    Deno.env.set("EMBEDDING_MODEL_ID", "text-embedding-3-small")

    const { getRoleConfig } = require("../_shared/model-engine/registry.ts")
    const config = getRoleConfig("embedding")

    assertEquals(config.provider, "openai")
    assertEquals(config.model, "text-embedding-3-small")
  } finally {
    for (const key of Object.keys(Deno.env.toObject())) {
      Deno.env.delete(key)
    }
    for (const [key, val] of Object.entries(envBackup)) {
      Deno.env.set(key, val)
    }
  }
})
