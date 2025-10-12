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
    const { message, conversationId, userPreferences = {} } = await req.json();

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

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      throw new Error('Invalid authentication token');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Get or create conversation
    let conversation;
    if (conversationId) {
      // Get existing conversation
      const convResponse = await fetch(
        `${supabaseUrl}/rest/v1/conversations?id=eq.${conversationId}&user_id=eq.${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      );
      const conversations = await convResponse.json();
      conversation = conversations[0];
    }

    if (!conversation) {
      // Create new conversation
      const convResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          title: message.substring(0, 50) + '...',
          context: { userPreferences }
        })
      });
      const newConversations = await convResponse.json();
      conversation = newConversations[0];
    }

    // Save user message
    await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        role: 'user',
        content: message
      })
    });

    // Get recent conversation history
    const historyResponse = await fetch(
      `${supabaseUrl}/rest/v1/messages?conversation_id=eq.${conversation.id}&order=created_at.desc&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      }
    );
    const history = await historyResponse.json();
    const recentHistory = history.reverse(); // Oldest first

    // Search knowledge base using text search (fallback for quota issues)
    const searchResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/text_search_documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query_text: message,
        match_count: 5
      })
    });

    let relevantKnowledge = [];
    if (searchResponse.ok) {
      relevantKnowledge = await searchResponse.json();
    }

    // Build context for AI
    const knowledgeContext = relevantKnowledge
      .map(item => `Content: ${item.content}`)
      .join('\n\n---\n\n');

    const conversationHistory = recentHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Create system prompt with Costa Rica travel expertise
    const systemPrompt = `You are an expert Costa Rica travel assistant with deep hyperlocal knowledge. You help travelers plan personalized itineraries and provide insider insights.

User preferences: ${JSON.stringify(userPreferences)}

Relevant knowledge base information:
${knowledgeContext}

Recent conversation:
${conversationHistory}

Guidelines:
- Provide specific, actionable travel advice for Costa Rica
- Include hyperlocal insights like expat recommendations, hidden gems, cultural tips
- Consider weather patterns, transportation options, and safety considerations
- Suggest specific destinations, activities, restaurants, and accommodations
- Be conversational and helpful, adapting to the user's preferences
- If asked about itinerary planning, create detailed day-by-day plans
- Include practical information like costs, timing, and logistics

Respond helpfully to the user's latest message.`;

    // Call OpenAI API
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
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponse = await openaiResponse.json();
    const assistantMessage = aiResponse.choices[0].message.content;

    // Save assistant message
    await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        metadata: {
          sources: relevantKnowledge.map(k => ({ id: k.id, similarity: k.similarity })),
          model: 'gpt-3.5-turbo'
        }
      })
    });

    return new Response(JSON.stringify({
      data: {
        message: assistantMessage,
        conversationId: conversation.id,
        sources: relevantKnowledge
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI chat error:', error);

    const errorResponse = {
      error: {
        code: 'AI_CHAT_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});