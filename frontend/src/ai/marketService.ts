interface WeatherData {
  coord: {
    lat: number;
    lon: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  visibility: number;
  name: string;
}

// Function to fetch weather data for a city
export const fetchWeatherData = async (city: string): Promise<WeatherData> => {
  if (!import.meta.env.VITE_WEATHER_KEY) {
    throw new Error("Missing required VITE_WEATHER_KEY environment variable");
  }

  const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${import.meta.env.VITE_WEATHER_KEY}`;
  
  try {
    const response = await fetch(WEATHER_API_URL);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as WeatherData;
    return normalizeWeatherData(data);
  } catch (error) {
    console.error("Weather data fetch error:", error);
    // Return mock data if API fails
    return getMockWeatherData(city);
  }
};

// Mock weather data for testing purposes
const getMockWeatherData = (city: string): WeatherData => {
  const baseTemp = Math.round(25 + Math.random() * 10 - 5);
  const humidity = Math.round(40 + Math.random() * 40);

  return normalizeWeatherData({
    coord: { lat: 20.5937, lon: 78.9629 }, // Default India coordinates
    weather: [{
      id: 800,
      main: "Clear",
      description: "clear sky",
      icon: "01d"
    }],
    main: {
      temp: baseTemp,
      feels_like: baseTemp,
      temp_min: baseTemp,
      temp_max: baseTemp,
      pressure: Math.round(1012 + Math.random() * 20),
      humidity: humidity
    },
    wind: {
      speed: Math.round(3 + Math.random() * 4),
      deg: Math.round(Math.random() * 360)
    },
    clouds: { all: Math.random() * 20 },
    visibility: 10000,
    name: city
  });
};

// Distribution recommendation types
export interface DistributionLotInput {
  cropName: string;
  quantity: number;
  storageDays: number;
}

export interface StatePrice {
  state: string;
  market: string;
  price: string;
  distance?: string;
}

export interface DistributionResult {
  recommendedMarkets: Array<{
    market: string;
    state: string;
    distance: string;
    price: string;
    transportTime: string;
    netRevenue: string;
    spoilageRisk: string;
  }>;
  urgency: 'low' | 'medium' | 'high';
  dispatchWindow: string;
  summary: string;
}

/**
 * Get AI-powered distribution recommendation for stored produce
 */
export const getDistributionRecommendation = async (
  lot: DistributionLotInput,
  prices: StatePrice[]
): Promise<DistributionResult> => {
  const Groq = (await import('groq-sdk')).default;
  const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const priceList = prices.map(p => `${p.market} (${p.state}): ${p.price}${p.distance ? `, ${p.distance} away` : ''}`).join('\n');

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an agricultural supply chain expert. Analyze stored produce data and market prices to recommend the best distribution plan. Factor in spoilage risk based on storage duration, transport time, and produce type. Return ONLY valid JSON.`
        },
        {
          role: "user",
          content: `Stored produce: ${lot.cropName}, Quantity: ${lot.quantity} quintals, Days in storage: ${lot.storageDays}.

Available markets and prices:
${priceList}

Return JSON:
{
  "recommendedMarkets": [
    { "market": "name", "state": "state", "distance": "X km", "price": "₹Y/quintal", "transportTime": "Z hours", "netRevenue": "₹N", "spoilageRisk": "low/medium/high" }
  ],
  "urgency": "low|medium|high",
  "dispatchWindow": "dispatch recommendation",
  "summary": "brief recommendation summary"
}

Rank by net revenue (price minus transport cost minus spoilage risk). Return top 3-5 markets.`
        }
      ],
      model: "moonshotai/kimi-k2-instruct-0905",
      temperature: 0.1,
      max_tokens: 1000,
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from AI');

    let cleaned = response.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const parsed = JSON.parse(cleaned);

    return {
      recommendedMarkets: parsed.recommendedMarkets || [],
      urgency: parsed.urgency || 'medium',
      dispatchWindow: parsed.dispatchWindow || 'Dispatch within 24-48 hours',
      summary: parsed.summary || 'Distribution analysis complete.'
    };
  } catch (error) {
    console.error('Distribution recommendation error:', error);
    return {
      recommendedMarkets: prices.slice(0, 3).map(p => ({
        market: p.market,
        state: p.state,
        distance: p.distance || 'Unknown',
        price: p.price,
        transportTime: 'Estimated 4-8 hours',
        netRevenue: 'Calculate after transport costs',
        spoilageRisk: lot.storageDays > 14 ? 'high' : lot.storageDays > 7 ? 'medium' : 'low'
      })),
      urgency: lot.storageDays > 14 ? 'high' : lot.storageDays > 7 ? 'medium' : 'low',
      dispatchWindow: `Dispatch ${lot.cropName} within ${lot.storageDays > 14 ? '24 hours' : '3-5 days'}`,
      summary: 'Fallback recommendation based on available price data.'
    };
  }
};

const normalizeWeatherData = (data: WeatherData): WeatherData => {
  return {
    ...data,
    main: {
      ...data.main,
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max),
      pressure: Math.round(data.main.pressure),
      humidity: Math.round(data.main.humidity)
    },
    wind: data.wind
      ? {
          ...data.wind,
          speed: Math.round(data.wind.speed),
          deg: Math.round((data.wind.deg ?? 0)),
          gust: data.wind.gust !== undefined ? Math.round(data.wind.gust) : undefined
        }
      : { speed: 0, deg: 0 },
    clouds: data.clouds
      ? {
          ...data.clouds,
          all: Math.round(data.clouds.all)
        }
      : { all: 0 },
    visibility: Math.round(data.visibility || 0)
  };
};