import { corsHeaders } from "../_shared/cors.ts"
import { generateEmbedding } from "../_shared/model-engine/index.ts"
import { qdrantStore, pgvectorStore } from "../_shared/vector-store/index.ts"
import { beachSeeds } from "./seeds/beaches.ts"
import { seismicSeeds } from "./seeds/seismic.ts"
import type { KnowledgeSeed } from "./seeds/beaches.ts"

declare const Deno: any

function readEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name)
  } catch { return undefined }
}

function generateId(seed: KnowledgeSeed, index: number): string {
  const slug = seed.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `${seed.sourceType}-${slug}-${index}`
}

async function processSeeds(seeds: KnowledgeSeed[], sourceLabel: string): Promise<{ ingested: number; failed: number }> {
  let ingested = 0
  let failed = 0

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i]
    const id = generateId(seed, i)

    try {
      const text = `${seed.title}. ${seed.content}`
      const embeddingResult = await generateEmbedding(text, "embedding")
      const vector = Array.isArray(embeddingResult.embedding)
        ? (embeddingResult.embedding as number[])
        : embeddingResult.embedding

      const payload = {
        content_id: id,
        title: seed.title,
        content: seed.content,
        category: seed.category,
        location: seed.location || "General",
        tags: seed.tags,
        source_type: seed.sourceType,
        metadata: seed.metadata || {},
      }

      const qdrantUrl = readEnv("QDRANT_URL")
      const qdrantKey = readEnv("QDRANT_API_KEY")
      const binaryEnabled = readEnv("ENABLE_BINARY_QUANTIZATION") === "true"

      if (binaryEnabled && qdrantUrl && qdrantKey) {
        await qdrantStore.upsert({ id, vector, payload })
      }

      await pgvectorStore.upsert({ id, vector, payload })

      ingested++
      console.log(`[ingest-rag] ${sourceLabel}: Ingested "${seed.title}" (${id})`)
    } catch (error) {
      failed++
      console.error(`[ingest-rag] ${sourceLabel}: Failed to ingest "${seed.title}":`, error)
    }
  }

  return { ingested, failed }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { source } = body as { source?: string }

    let beachResult = { ingested: 0, failed: 0 }
    let seismicResult = { ingested: 0, failed: 0 }

    if (!source || source === "beach") {
      beachResult = await processSeeds(beachSeeds, "beach")
    }
    if (!source || source === "seismic") {
      seismicResult = await processSeeds(seismicSeeds, "seismic")
    }

    const totalIngested = beachResult.ingested + seismicResult.ingested
    const totalFailed = beachResult.failed + seismicResult.failed

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalIngested,
          totalFailed,
          sources: {
            beach: beachResult,
            seismic: seismicResult,
          },
          vectorStore: readEnv("ENABLE_BINARY_QUANTIZATION") === "true" ? "qdrant+pgvector" : "pgvector",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[ingest-rag] Error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
