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
    const { locations, type = 'current' } = await req.json();
    const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    
    if (!openWeatherApiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    // Costa Rica major destinations with coordinates
    const costaRicaDestinations = {
      'san-jose': { name: 'San José', lat: 9.9281, lon: -84.0907 },
      'manuel-antonio': { name: 'Manuel Antonio', lat: 9.3905, lon: -84.1376 },
      'monteverde': { name: 'Monteverde', lat: 10.3087, lon: -84.8012 },
      'arenal': { name: 'Arenal Volcano', lat: 10.4148, lon: -84.7286 },
      'guanacaste': { name: 'Guanacaste Province', lat: 10.6345, lon: -85.4408 },
      'puerto-viejo': { name: 'Puerto Viejo', lat: 9.6544, lon: -82.7582 },
      'dominical': { name: 'Dominical', lat: 9.2456, lon: -83.8606 },
      'jaco': { name: 'Jacó', lat: 9.6153, lon: -84.6294 }
    };

    const weatherData = [];
    
    // Process locations (either provided or default to all major destinations)
    const locationsToFetch = locations && locations.length > 0 
      ? locations 
      : Object.keys(costaRicaDestinations);

    for (const locationKey of locationsToFetch) {
      const destination = costaRicaDestinations[locationKey];
      if (!destination) continue;

      try {
        let weatherUrl;
        
        if (type === 'forecast') {
          // 5-day forecast
          weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${destination.lat}&lon=${destination.lon}&appid=${openWeatherApiKey}&units=metric`;
        } else {
          // Current weather
          weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${destination.lat}&lon=${destination.lon}&appid=${openWeatherApiKey}&units=metric`;
        }

        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
          console.warn(`Weather API failed for ${destination.name}: ${weatherResponse.status}`);
          continue;
        }

        const data = await weatherResponse.json();
        
        if (type === 'forecast') {
          // Process forecast data
          const processedForecast = {
            location: locationKey,
            name: destination.name,
            type: 'forecast',
            forecast: data.list.slice(0, 15).map((item: any) => ({
              datetime: new Date(item.dt * 1000).toISOString(),
              temperature: Math.round(item.main.temp),
              feels_like: Math.round(item.main.feels_like),
              humidity: item.main.humidity,
              description: item.weather[0].description,
              main: item.weather[0].main,
              icon: item.weather[0].icon,
              wind_speed: item.wind.speed,
              rain: item.rain?.['3h'] || 0
            })),
            city: data.city.name,
            country: data.city.country,
            cached_at: new Date().toISOString()
          };
          weatherData.push(processedForecast);
        } else {
          // Process current weather data
          const processedWeather = {
            location: locationKey,
            name: destination.name,
            type: 'current',
            current: {
              temperature: Math.round(data.main.temp),
              feels_like: Math.round(data.main.feels_like),
              humidity: data.main.humidity,
              description: data.weather[0].description,
              main: data.weather[0].main,
              icon: data.weather[0].icon,
              wind_speed: data.wind.speed,
              pressure: data.main.pressure,
              visibility: data.visibility,
              uv_index: null // Not available in current weather API
            },
            city: data.name,
            country: data.sys.country,
            cached_at: new Date().toISOString()
          };
          weatherData.push(processedWeather);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (locationError) {
        console.error(`Error fetching weather for ${destination.name}:`, locationError);
        // Continue with other locations even if one fails
      }
    }

    if (weatherData.length === 0) {
      throw new Error('No weather data could be retrieved');
    }

    return new Response(JSON.stringify({
      data: {
        weather: weatherData,
        timestamp: new Date().toISOString(),
        cache_duration: type === 'current' ? '10 minutes' : '1 hour'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Weather service error:', error);

    const errorResponse = {
      error: {
        code: 'WEATHER_SERVICE_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});