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
    const {
      preferences,
      duration,
      startDate,
      budget,
      groupSize,
      interests = [],
      accessibility = {}
    } = await req.json();

    if (!duration || duration < 1) {
      throw new Error('Duration must be at least 1 day');
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

    // Search knowledge base for relevant information
    const searchQuery = interests.join(' ') + ' ' + budget + ' Costa Rica travel';
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: searchQuery,
        model: 'text-embedding-3-small'
      })
    });

    let relevantKnowledge = [];
    if (embeddingResponse.ok) {
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
          match_threshold: 0.6,
          match_count: 10
        })
      });

      if (searchResponse.ok) {
        relevantKnowledge = await searchResponse.json();
      }
    }

    // Build context for itinerary generation
    const knowledgeContext = relevantKnowledge
      .map(item => `Location: ${item.location || 'General'}\nTitle: ${item.title}\nContent: ${item.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are an expert Costa Rica travel planner creating a detailed ${duration}-day itinerary. Use your hyperlocal knowledge and the provided information to create an amazing trip.

Trip Details:
- Duration: ${duration} days
- Start Date: ${startDate || 'Flexible'}
- Budget: ${budget || 'Mid-range'}
- Group Size: ${groupSize || '2 people'}
- Interests: ${interests.join(', ') || 'General sightseeing'}
- Accessibility Needs: ${JSON.stringify(accessibility)}

Relevant Local Knowledge:
${knowledgeContext}

Create a comprehensive day-by-day itinerary with:
- Specific destinations and activities
- Recommended accommodations
- Transportation between locations
- Estimated costs and timing
- Local dining recommendations
- Cultural insights and tips
- Weather considerations
- Alternative options for flexibility

Format as a detailed JSON structure with days, activities, and metadata.`;

    // Generate itinerary with OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: 'Please create the detailed itinerary based on the requirements provided.'
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const aiResponse = await openaiResponse.json();
    const itineraryContent = aiResponse.choices[0].message.content;

    // Parse and structure the itinerary
    let itineraryData;
    try {
      // Try to parse as JSON first
      itineraryData = JSON.parse(itineraryContent);
    } catch {
      // If not JSON, structure it as text content
      itineraryData = {
        title: `${duration}-Day Costa Rica Adventure`,
        description: 'Personalized itinerary based on your preferences',
        duration,
        content: itineraryContent,
        preferences,
        generated_at: new Date().toISOString()
      };
    }

    // Save itinerary to database
    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/itineraries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        title: itineraryData.title || `${duration}-Day Costa Rica Trip`,
        description: itineraryData.description || 'AI-generated personalized itinerary',
        itinerary_data: itineraryData,
        trip_dates: startDate ? { start_date: startDate } : null,
        preferences: { duration, budget, interests, groupSize, accessibility }
      })
    });

    if (!saveResponse.ok) {
      console.error('Failed to save itinerary, but returning generated content');
    }

    const savedItinerary = saveResponse.ok ? await saveResponse.json() : null;

    return new Response(JSON.stringify({
      data: {
        itinerary: itineraryData,
        id: savedItinerary?.[0]?.id,
        sources: relevantKnowledge.map(k => ({
          title: k.title,
          category: k.category,
          location: k.location
        }))
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Generate itinerary error:', error);

    const errorResponse = {
      error: {
        code: 'GENERATE_ITINERARY_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});