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