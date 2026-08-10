import type { VectorStore, SearchParams, SearchResult, UpsertParams, DeleteFilter } from "./types.ts"
import { QDRANT_COLLECTION, VECTOR_DIMENSIONS } from "./types.ts"

function readEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name)
  } catch {
    return undefined
  }
}

const QDRANT_URL = readEnv("QDRANT_URL") || ""
const QDRANT_API_KEY = readEnv("QDRANT_API_KEY")

function qdrantFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${QDRANT_URL.replace(/\/$/, "")}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (QDRANT_API_KEY) {
    headers["api-key"] = QDRANT_API_KEY
  }
  return fetch(url, { ...options, headers })
}

async function ensureCollection(): Promise<void> {
  try {
    const listResp = await qdrantFetch("/collections")
    if (!listResp.ok) return
    const list = await listResp.json()
    const exists = list.result?.collections?.some((c: any) => c.name === QDRANT_COLLECTION)
    if (exists) return

    await qdrantFetch(`/collections/${QDRANT_COLLECTION}`, {
      method: "PUT",
      body: JSON.stringify({
        vectors: {
          size: VECTOR_DIMENSIONS,
          distance: "Cosine",
        },
        quantization_config: {
          binary: {
            always_ram: true,
          },
        },
      }),
    })
    console.log(`[qdrant] Created collection ${QDRANT_COLLECTION} with binary quantization`)
  } catch (error) {
    console.warn(`[qdrant] Failed to ensure collection: ${error}`)
  }
}

let collectionInitialized = false

export const qdrantStore: VectorStore = {
  async search(params: SearchParams): Promise<SearchResult[]> {
    if (!collectionInitialized) {
      await ensureCollection()
      collectionInitialized = true
    }

    const { vector, filter, threshold = 0.6, maxResults = 5 } = params

    const qdrantFilter: any = { must: [] }
    if (filter?.contentType) {
      qdrantFilter.must.push({ key: "content_type", match: { value: filter.contentType } })
    }
    if (filter?.language) {
      qdrantFilter.must.push({ key: "language", match: { value: filter.language } })
    }
    if (filter?.sourceType) {
      qdrantFilter.must.push({ key: "source_type", match: { value: filter.sourceType } })
    }

    const searchBody: any = {
      vector,
      limit: maxResults,
      score_threshold: threshold,
      params: {
        quantization: {
          rescore: true,
          oversampling: 10,
        },
      },
    }
    if (qdrantFilter.must.length > 0) {
      searchBody.filter = qdrantFilter
    }

    const response = await qdrantFetch(`/collections/${QDRANT_COLLECTION}/points/search`, {
      method: "POST",
      body: JSON.stringify(searchBody),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Qdrant search error: ${response.status} ${text}`)
    }

    const data = await response.json()
    return (data.result || []).map((point: any) => ({
      id: point.id as string,
      contentId: point.payload?.content_id as string || "",
      title: point.payload?.title as string || "",
      content: point.payload?.content as string || "",
      category: point.payload?.category as string,
      location: point.payload?.location as string,
      tags: point.payload?.tags as string[],
      sourceType: point.payload?.source_type as string,
      language: point.payload?.language as string,
      similarity: point.score || 0,
      metadata: point.payload?.metadata as Record<string, unknown>,
    }))
  },

  async upsert(params: UpsertParams): Promise<void> {
    if (!collectionInitialized) {
      await ensureCollection()
      collectionInitialized = true
    }

    const response = await qdrantFetch(`/collections/${QDRANT_COLLECTION}/points`, {
      method: "PUT",
      body: JSON.stringify({
        points: [{
          id: params.id,
          vector: params.vector,
          payload: params.payload,
        }],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Qdrant upsert error: ${response.status} ${text}`)
    }
  },

  async upsertBatch(items: UpsertParams[]): Promise<void> {
    if (items.length === 0) return
    if (!collectionInitialized) {
      await ensureCollection()
      collectionInitialized = true
    }

    const response = await qdrantFetch(`/collections/${QDRANT_COLLECTION}/points`, {
      method: "PUT",
      body: JSON.stringify({
        points: items.map(item => ({
          id: item.id,
          vector: item.vector,
          payload: item.payload,
        })),
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Qdrant batch upsert error: ${response.status} ${text}`)
    }
  },

  async delete(filter: DeleteFilter): Promise<number> {
    const qdrantFilter: any = { must: [] }
    if (filter.contentType) {
      qdrantFilter.must.push({ key: "content_type", match: { value: filter.contentType } })
    }
    if (filter.sourceType) {
      qdrantFilter.must.push({ key: "source_type", match: { value: filter.sourceType } })
    }
    if (filter.ids) {
      qdrantFilter.must.push({ key: "content_id", values: filter.ids })
    }

    const response = await qdrantFetch(`/collections/${QDRANT_COLLECTION}/points/delete`, {
      method: "POST",
      body: JSON.stringify({ filter: qdrantFilter }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Qdrant delete error: ${response.status} ${text}`)
    }

    const data = await response.json()
    return data.result?.count || 0
  },

  async healthCheck(): Promise<boolean> {
    try {
      const response = await qdrantFetch("/collections")
      return response.ok
    } catch {
      return false
    }
  },
}
