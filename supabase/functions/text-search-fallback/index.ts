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
    const { query, limit = 5 } = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables');
    }

    // Create search terms from the query
    const searchTerms = query.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2 && !['the', 'and', 'for', 'with', 'what', 'where', 'when', 'how'].includes(term))
      .slice(0, 5);

    console.log('Search terms:', searchTerms);

    let results = [];

    if (searchTerms.length > 0) {
      // Search by content, title, and location using text matching
      const conditions = [];
      
      searchTerms.forEach(term => {
        conditions.push(`content.ilike.%${term}%`);
        conditions.push(`title.ilike.%${term}%`);
        conditions.push(`location.ilike.%${term}%`);
      });

      const searchQuery = conditions.join(',');
      
      const searchResponse = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_base?or=(${searchQuery})&limit=${limit}&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      );

      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        
        // Calculate basic relevance scores
        results = searchResults.map(item => {
          let score = 0;
          const contentLower = (item.content || '').toLowerCase();
          const titleLower = (item.title || '').toLowerCase();
          const locationLower = (item.location || '').toLowerCase();
          
          searchTerms.forEach(term => {
            if (titleLower.includes(term)) score += 3;
            if (locationLower.includes(term)) score += 2;
            if (contentLower.includes(term)) score += 1;
          });
          
          return {
            ...item,
            relevance_score: score,
            similarity: Math.min(score / (searchTerms.length * 3), 1) // Normalize to 0-1
          };
        }).sort((a, b) => b.relevance_score - a.relevance_score);
      }
    }

    // If no results found, return general Costa Rica content
    if (results.length === 0) {
      const generalResponse = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_base?limit=${Math.min(limit, 3)}&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      );

      if (generalResponse.ok) {
        const generalResults = await generalResponse.json();
        results = generalResults.map(item => ({
          ...item,
          relevance_score: 1,
          similarity: 0.5
        }));
      }
    }

    return new Response(JSON.stringify({
      data: {
        results,
        query,
        search_terms: searchTerms,
        strategy: 'text_search'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Text search error:', error);

    const errorResponse = {
      error: {
        code: 'TEXT_SEARCH_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});