export default async function generateEmbedding(
  message: string,
  provider: "openai" | "free"
) {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
  const huggingfaceApiKey = Deno.env.get("HF_API_KEY")

  let queryEmbedding

  // Generate embeddings based on provider
  if (provider === "openai") {
    console.log("Generating embeddings with OpenAI")
    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: message,
          model: "text-embedding-3-small",
        }),
      }
    )

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json()
      queryEmbedding = embeddingData.data[0].embedding
    } else {
      throw new Error(
        `OpenAI embedding failed: ${await embeddingResponse.text()}`
      )
    }
  } else {
    console.log("Generating embeddings with HuggingFace")
    const embeddingResponse = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${huggingfaceApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: message,
          options: { wait_for_model: true },
        }),
      }
    )

    if (embeddingResponse.ok) {
      queryEmbedding = await embeddingResponse.json()
      // HuggingFace returns array directly, ensure it's the right format
      if (Array.isArray(queryEmbedding) && Array.isArray(queryEmbedding[0])) {
        queryEmbedding = queryEmbedding[0]
      }
    } else {
      throw new Error(
        `HuggingFace embedding failed: ${await embeddingResponse.text()}`
      )
    }
    return queryEmbedding
  }
}
