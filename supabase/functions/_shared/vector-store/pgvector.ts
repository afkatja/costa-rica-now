import type { VectorStore, SearchParams, SearchResult, UpsertParams } from "./types.ts"
import { DEFAULT_SEARCH_THRESHOLD, DEFAULT_MAX_RESULTS } from "./types.ts"

function readEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name)
  } catch {
    return undefined
  }
}

const SUPABASE_URL = readEnv("SUPABASE_URL") || ""
const SERVICE_ROLE_KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY") || ""

async function supabaseRpc(functionName: string, body: Record<string, unknown>): Promise<any> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  )
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`pgvector RPC error (${functionName}): ${response.status} ${text}`)
  }
  return response.json()
}

export const pgvectorStore: VectorStore = {
  async search(params: SearchParams): Promise<SearchResult[]> {
    const { vector, filter, threshold = DEFAULT_SEARCH_THRESHOLD, maxResults = DEFAULT_MAX_RESULTS } = params

    const data = await supabaseRpc("search_knowledge", {
      query_embedding: vector,
      match_threshold: threshold,
      match_count: maxResults,
    })

    let results: SearchResult[] = (data || []).map((row: any) => ({
      id: row.id || "",
      contentId: row.id || "",
      title: row.title || "",
      content: row.content || "",
      category: row.category || "",
      tags: row.tags || [],
      similarity: row.similarity || 0,
    }))

    if (filter?.language) {
      results = results.filter(r => r.language === filter.language)
    }
    if (filter?.sourceType) {
      results = results.filter(r => r.sourceType === filter.sourceType)
    }

    return results
  },

  async upsert(_params: UpsertParams): Promise<void> {
    const supabaseUrl = readEnv("SUPABASE_URL")
    const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceRoleKey) return

    const payload = {
      title: _params.payload.title,
      content: _params.payload.content,
      category: _params.payload.category || null,
      location: _params.payload.location || null,
      tags: _params.payload.tags || [],
      embedding: _params.vector,
      metadata: _params.payload.metadata || {},
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/knowledge_base`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`pgvector upsert error: ${response.status} ${text}`)
    }
  },

  async upsertBatch(): Promise<void> {
    console.warn("[pgvector] Batch upsert not implemented for pgvector store")
  },

  async delete(): Promise<number> {
    console.warn("[pgvector] Delete not implemented for pgvector store")
    return 0
  },

  async healthCheck(): Promise<boolean> {
    try {
      await supabaseRpc("search_knowledge", {
        query_embedding: new Array(1536).fill(0),
        match_threshold: 1.5,
        match_count: 1,
      })
      return true
    } catch {
      return false
    }
  },
}
