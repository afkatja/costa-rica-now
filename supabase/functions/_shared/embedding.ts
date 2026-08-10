import { generateEmbedding as engineEmbed } from "./model-engine/index.ts"

export default async function generateEmbedding(
  message: string,
  provider: "openai" | "free",
) {
  const role = "embedding"

  try {
    const result = await engineEmbed(message, role)
    return Array.isArray(result.embedding) ? result.embedding : result.embedding
  } catch (error) {
    console.error("Embedding generation failed:", error)
    return null
  }
}
