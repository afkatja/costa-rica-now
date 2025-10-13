// supabase/functions/regenerate-embeddings/index.ts
Deno.serve(async req => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const huggingfaceApiKey = Deno.env.get("HF_API_KEY")

    // Fetch all knowledge base entries
    const response = await fetch(
      `${supabaseUrl}/rest/v1/knowledge_base?select=id,content,title`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    )

    const entries = await response.json()
    console.log(`Regenerating embeddings for ${entries.length} entries`)

    let successCount = 0
    let errorCount = 0

    for (const entry of entries) {
      try {
        // Combine title and content for better embeddings
        const textToEmbed = `${entry.title}\n\n${entry.content}`

        // Generate embedding with HuggingFace
        const embeddingResponse = await fetch(
          "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${huggingfaceApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: textToEmbed,
              options: { wait_for_model: true },
            }),
          }
        )

        if (!embeddingResponse.ok) {
          throw new Error(
            `HuggingFace error: ${await embeddingResponse.text()}`
          )
        }

        let embedding = await embeddingResponse.json()

        // HuggingFace returns nested array, flatten it
        if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
          embedding = embedding[0]
        }

        // Update the entry with new embedding
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/knowledge_base?id=eq.${entry.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ embedding }),
          }
        )

        if (updateResponse.ok) {
          successCount++
          console.log(`✓ Updated entry ${entry.id}: ${entry.title}`)
        } else {
          throw new Error(`Update failed: ${await updateResponse.text()}`)
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
        console.error(`✗ Failed to update entry ${entry.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: entries.length,
        successCount,
        errorCount,
        message: `Regenerated ${successCount} embeddings, ${errorCount} errors`,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Regeneration error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
