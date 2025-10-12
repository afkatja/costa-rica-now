Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, userPreferences = {} } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    // Get environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables');
    }

    console.log('Testing AI chat with message:', message);

    // Enhanced knowledge search with multiple strategies
    let relevantKnowledge = [];
    
    try {
      // Strategy 1: Try vector similarity search first
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: message,
          model: 'text-embedding-3-small'
        })
      });

      if (embeddingResponse.ok) {
        console.log('Vector embeddings successful');
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        const searchResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/search_knowledge`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 5
          })
        });

        if (searchResponse.ok) {
          relevantKnowledge = await searchResponse.json();
          console.log('Vector search returned:', relevantKnowledge.length, 'results');
        }
      }
    } catch (embeddingError) {
      console.log('Vector search failed, falling back to text search:', embeddingError.message);
    }

    // Strategy 2: Fallback to text-based search if vector search fails
    if (relevantKnowledge.length === 0) {
      console.log('Using text-based search fallback');
      
      // Create search terms from the message
      const searchTerms = message.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 3 && !['what', 'where', 'when', 'how', 'the', 'and', 'for', 'with'].includes(term))
        .slice(0, 5);

      console.log('Search terms:', searchTerms);

      if (searchTerms.length > 0) {
        // Search by content using text matching
        const textSearchQuery = searchTerms.map(term => `content.ilike.%${term}%`).join(',');
        
        const textSearchResponse = await fetch(
          `${supabaseUrl}/rest/v1/knowledge_base?or=(${textSearchQuery})&limit=5`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            }
          }
        );

        if (textSearchResponse.ok) {
          const textResults = await textSearchResponse.json();
          relevantKnowledge = textResults.map(item => ({
            title: item.title,
            content: item.content,
            category: item.category,
            location: item.location,
            similarity: 0.8 // Assign a default similarity score
          }));
          console.log('Text search returned:', relevantKnowledge.length, 'results');
        }
      }
    }

    // Strategy 3: If still no results, get general Costa Rica content
    if (relevantKnowledge.length === 0) {
      console.log('Using general content fallback');
      
      const generalResponse = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_base?limit=3&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      );

      if (generalResponse.ok) {
        const generalResults = await generalResponse.json();
        relevantKnowledge = generalResults.map(item => ({
          title: item.title,
          content: item.content,
          category: item.category,
          location: item.location,
          similarity: 0.6 // Lower similarity for general content
        }));
        console.log('General search returned:', relevantKnowledge.length, 'results');
      }
    }

    // Build context for AI
    const knowledgeContext = relevantKnowledge
      .map(item => `Title: ${item.title}\nLocation: ${item.location || 'General'}\nContent: ${item.content}`)
      .join('\n\n---\n\n');

    console.log('Knowledge context length:', knowledgeContext.length);

    // Create system prompt with Costa Rica travel expertise
    const systemPrompt = `You are an expert Costa Rica travel assistant with deep hyperlocal knowledge. You help travelers plan personalized itineraries and provide insider insights.

User preferences: ${JSON.stringify(userPreferences)}

Relevant knowledge base information:
${knowledgeContext}

Guidelines:
- Provide specific, actionable travel advice for Costa Rica
- Include hyperlocal insights like expat recommendations, hidden gems, cultural tips
- Consider weather patterns, transportation options, and safety considerations
- Suggest specific destinations, activities, restaurants, and accommodations
- Be conversational and helpful, adapting to the user's preferences
- If asked about itinerary planning, create detailed day-by-day plans
- Include practical information like costs, timing, and logistics
- Reference the knowledge base information when relevant

Respond helpfully to the user's message.`;

    // Call OpenAI API
    console.log('Calling OpenAI API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponse = await openaiResponse.json();
    const assistantMessage = aiResponse.choices[0].message.content;

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({
      data: {
        message: assistantMessage,
        sources: relevantKnowledge,
        searchStrategy: relevantKnowledge.length > 0 ? 'knowledge_base' : 'general',
        contextUsed: knowledgeContext.length > 0,
        searchTermsUsed: message.toLowerCase().split(/\s+/).filter(term => term.length > 3),
        debug: {
          knowledgeCount: relevantKnowledge.length,
          contextLength: knowledgeContext.length
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI chat test error:', error);

    const errorResponse = {
      error: {
        code: 'AI_CHAT_TEST_ERROR',
        message: error.message,
        stack: error.stack
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});