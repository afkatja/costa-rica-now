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
    const { weatherCondition, temperature, humidity, location, activityType } = await req.json();
    
    if (!weatherCondition) {
      throw new Error('Weather condition is required');
    }

    // Weather-based activity recommendations for Costa Rica
    const weatherRecommendations = {
      'Clear': {
        activities: [
          'Beach activities and swimming',
          'Hiking in national parks',
          'Zip-lining adventures',
          'Wildlife watching',
          'Photography tours',
          'Volcano hiking (if safe)',
          'Surfing lessons',
          'Canopy tours'
        ],
        clothing: [
          'Light, breathable clothing',
          'Sun hat and sunglasses',
          'Strong sunscreen (SPF 30+)',
          'Comfortable hiking shoes',
          'Swimwear',
          'Light rain jacket (just in case)'
        ],
        tips: [
          'Stay hydrated - drink plenty of water',
          'Start outdoor activities early to avoid midday heat',
          'Perfect weather for beach destinations',
          'Great visibility for volcano and mountain views'
        ]
      },
      'Clouds': {
        activities: [
          'Cloud forest exploration',
          'Photography (great lighting)',
          'Wildlife watching',
          'Coffee plantation tours',
          'Cultural site visits',
          'Zip-lining (cooler temperatures)',
          'Nature walks',
          'Bird watching'
        ],
        clothing: [
          'Light layers for temperature changes',
          'Light jacket or sweater',
          'Comfortable walking shoes',
          'Light rain protection',
          'Hat for sun protection'
        ],
        tips: [
          'Excellent conditions for outdoor activities',
          'Perfect for photography - soft, even lighting',
          'Comfortable temperatures for hiking',
          'Great weather for wildlife observation'
        ]
      },
      'Rain': {
        activities: [
          'Coffee tours and tastings',
          'Indoor cultural attractions',
          'Museums and art galleries',
          'Spa treatments and relaxation',
          'Cooking classes',
          'Shopping in local markets',
          'Hot springs (still enjoyable in rain)',
          'Wildlife refuges with covered areas'
        ],
        clothing: [
          'Waterproof rain jacket',
          'Quick-dry clothing',
          'Waterproof shoes or boots',
          'Umbrella',
          'Extra dry clothes',
          'Waterproof bag for electronics'
        ],
        tips: [
          'Rain often comes in short bursts',
          'Great time for indoor cultural experiences',
          'Hot springs are magical in the rain',
          'Wildlife is often more active after rain stops',
          'Perfect time to experience "pura vida" relaxation'
        ]
      },
      'Thunderstorm': {
        activities: [
          'Indoor cultural centers',
          'Coffee museums and tours',
          'Spa and wellness centers',
          'Cooking classes',
          'Shopping centers',
          'Hotel amenities and relaxation',
          'Planning future activities',
          'Local restaurants and cuisine tasting'
        ],
        clothing: [
          'Full rain gear',
          'Waterproof everything',
          'Extra dry clothes',
          'Non-slip footwear',
          'Protective gear for electronics'
        ],
        tips: [
          'Stay indoors during active storms',
          'Avoid outdoor activities for safety',
          'Great time to rest and plan',
          'Storms usually pass quickly in Costa Rica',
          'Perfect for experiencing local indoor culture'
        ]
      }
    };

    // Temperature-based recommendations
    const temperatureRecommendations = {
      hot: { // >28°C
        tips: [
          'Start activities early morning (6-9 AM)',
          'Take midday rest during hottest hours',
          'Drink extra water and electrolytes',
          'Seek shade and air conditioning when needed'
        ],
        clothing: ['Light colors', 'Breathable fabrics', 'Sun protection']
      },
      warm: { // 22-28°C
        tips: [
          'Perfect temperature for most activities',
          'Great for all-day outdoor adventures',
          'Comfortable for hiking and exploring'
        ],
        clothing: ['Light layers', 'Comfortable outdoor wear']
      },
      cool: { // <22°C
        tips: [
          'Great for vigorous activities like hiking',
          'Perfect for cloud forest exploration',
          'Comfortable for long walks and tours'
        ],
        clothing: ['Light layers', 'Long pants recommended', 'Light jacket']
      }
    };

    // Location-specific weather considerations
    const locationSpecific = {
      'san-jose': {
        rainy: ['Visit museums', 'Explore indoor markets', 'Theater and cultural shows'],
        sunny: ['Central Valley tours', 'Day trips to nearby volcanoes']
      },
      'manuel-antonio': {
        rainy: ['Spa treatments', 'Wildlife refuge visits', 'Restaurant hopping'],
        sunny: ['Beach time', 'National park hiking', 'Water sports']
      },
      'monteverde': {
        rainy: ['Coffee tours', 'Indoor exhibits', 'Night wildlife tours'],
        sunny: ['Zip-lining', 'Suspension bridges', 'Bird watching']
      },
      'arenal': {
        rainy: ['Hot springs', 'Spa treatments', 'Indoor dining with volcano views'],
        sunny: ['Volcano hiking', 'Adventure tours', 'Lake activities']
      }
    };

    // Get base recommendations
    const baseRec = weatherRecommendations[weatherCondition] || weatherRecommendations['Clear'];
    
    // Determine temperature category
    let tempCategory = 'warm';
    if (temperature > 28) tempCategory = 'hot';
    else if (temperature < 22) tempCategory = 'cool';
    
    const tempRec = temperatureRecommendations[tempCategory];
    
    // Get location-specific recommendations if available
    const locationRec = locationSpecific[location] || {};
    const locationActivities = weatherCondition === 'Rain' || weatherCondition === 'Thunderstorm' 
      ? locationRec.rainy || []
      : locationRec.sunny || [];

    // Compile final recommendations
    const recommendations = {
      weather_condition: weatherCondition,
      temperature: temperature,
      location: location,
      activities: {
        recommended: baseRec.activities.concat(locationActivities).slice(0, 8),
        weather_specific: baseRec.activities.slice(0, 4)
      },
      clothing: {
        essential: baseRec.clothing.concat(tempRec.clothing).slice(0, 6),
        temperature_specific: tempRec.clothing
      },
      tips: {
        weather: baseRec.tips.slice(0, 3),
        temperature: tempRec.tips.slice(0, 2),
        general: [
          'Check weather updates regularly',
          'Have backup indoor activities planned',
          'Costa Rica weather can change quickly'
        ]
      },
      packing_suggestions: {
        essential: ['Rain jacket', 'Comfortable shoes', 'Sunscreen', 'Insect repellent'],
        weather_specific: baseRec.clothing.slice(0, 3)
      }
    };

    return new Response(JSON.stringify({
      data: recommendations
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Weather recommendations error:', error);

    const errorResponse = {
      error: {
        code: 'WEATHER_RECOMMENDATIONS_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});