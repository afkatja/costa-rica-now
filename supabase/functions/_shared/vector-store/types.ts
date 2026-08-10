export interface VectorStore {
  search(params: SearchParams): Promise<SearchResult[]>
  upsert(params: UpsertParams): Promise<void>
  upsertBatch(items: UpsertParams[]): Promise<void>
  delete(filter: DeleteFilter): Promise<number>
  healthCheck(): Promise<boolean>
}

export interface SearchParams {
  vector: number[]
  filter?: VectorFilter
  threshold?: number
  maxResults?: number
  withQuantization?: boolean
}

export interface VectorFilter {
  contentType?: string
  language?: string
  location?: string
  sourceType?: string
}

export interface SearchResult {
  id: string
  contentId: string
  title: string
  content: string
  category?: string
  location?: string
  tags?: string[]
  sourceType?: string
  language?: string
  similarity: number
  metadata?: Record<string, unknown>
}

export interface UpsertParams {
  id: string
  vector: number[]
  payload: {
    content_id: string
    title: string
    content: string
    category?: string
    location?: string
    tags?: string[]
    source_type?: string
    language?: string
    metadata?: Record<string, unknown>
  }
}

export interface DeleteFilter {
  contentType?: string
  sourceType?: string
  ids?: string[]
}

export const DEFAULT_SEARCH_THRESHOLD = 0.7
export const DEFAULT_MAX_RESULTS = 5
export const QDRANT_COLLECTION = "costa_rica_knowledge"
export const VECTOR_DIMENSIONS = 1536
