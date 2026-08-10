import type { VectorStore, SearchParams, SearchResult, UpsertParams } from "./types.ts"
import { qdrantStore } from "./qdrant.ts"
import { pgvectorStore } from "./pgvector.ts"

function readEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name)
  } catch {
    return undefined
  }
}

function isQdrantConfigured(): boolean {
  const url = readEnv("QDRANT_URL")
  const key = readEnv("QDRANT_API_KEY")
  const enabled = readEnv("ENABLE_BINARY_QUANTIZATION") === "true"
  return enabled && !!url && !!key
}

function getPrimaryStore(): VectorStore {
  return isQdrantConfigured() ? qdrantStore : pgvectorStore
}

export const vectorStore: VectorStore = {
  async search(params: SearchParams): Promise<SearchResult[]> {
    const primary = getPrimaryStore()
    try {
      const results = await primary.search({
        ...params,
        threshold: params.threshold ?? (isQdrantConfigured() ? 0.6 : 0.7),
      })
      if (results.length > 0) {
        return results
      }
    } catch (error) {
      console.warn(`[vector-store] Primary search failed: ${error}`)
    }

    if (primary === qdrantStore) {
      console.log("[vector-store] Qdrant returned 0 results, falling back to pgvector")
      return pgvectorStore.search({
        ...params,
        threshold: params.threshold ?? 0.7,
      })
    }

    return []
  },

  async upsert(params: UpsertParams): Promise<void> {
    const primary = getPrimaryStore()
    await primary.upsert(params)
  },

  async upsertBatch(items: UpsertParams[]): Promise<void> {
    const primary = getPrimaryStore()
    await primary.upsertBatch(items)
  },

  async delete(filter): Promise<number> {
    const primary = getPrimaryStore()
    return primary.delete(filter)
  },

  async healthCheck(): Promise<boolean> {
    const primary = getPrimaryStore()
    return primary.healthCheck()
  },
}

export function getVectorStoreType(): "qdrant" | "pgvector" {
  return isQdrantConfigured() ? "qdrant" : "pgvector"
}

export { qdrantStore } from "./qdrant.ts"
export { pgvectorStore } from "./pgvector.ts"
