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
    const envVars = {
      OPENWEATHER_API_KEY: Deno.env.get('OPENWEATHER_API_KEY') ? 'Available' : 'Missing',
      OPENWEATHERMAP_API_KEY: Deno.env.get('OPENWEATHERMAP_API_KEY') ? 'Available' : 'Missing',
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') ? 'Available' : 'Missing',
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'Available' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Available' : 'Missing',
      
      // Also try alternative environment variable names
      ENV_VARS_COUNT: Object.keys(Deno.env.toObject()).length,
      AVAILABLE_VARS: Object.keys(Deno.env.toObject()).filter(key => 
        key.includes('WEATHER') || 
        key.includes('OPENAI') || 
        key.includes('SUPABASE')
      )
    };

    return new Response(JSON.stringify({
      data: envVars
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'ENV_TEST_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});