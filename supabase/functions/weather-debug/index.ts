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
    const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    
    if (!openWeatherApiKey) {
      throw new Error('OpenWeatherMap API key not found');
    }

    console.log('API Key available:', openWeatherApiKey ? 'Yes' : 'No');

    // Test with San José coordinates
    const lat = 9.9281;
    const lon = -84.0907;
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=metric`;
    
    console.log('Making request to:', weatherUrl.replace(openWeatherApiKey, 'API_KEY_HIDDEN'));
    
    const weatherResponse = await fetch(weatherUrl);
    
    console.log('Weather API response status:', weatherResponse.status);
    
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.log('Weather API error response:', errorText);
      throw new Error(`Weather API failed: ${weatherResponse.status} - ${errorText}`);
    }

    const weatherData = await weatherResponse.json();
    console.log('Weather data received for:', weatherData.name);
    
    return new Response(JSON.stringify({
      data: {
        success: true,
        location: weatherData.name,
        temperature: Math.round(weatherData.main.temp),
        description: weatherData.weather[0].description,
        status: 'Weather API working correctly'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Weather debug error:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'WEATHER_DEBUG_ERROR',
        message: error.message,
        details: 'Check function logs for more information'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});