export interface MarketPromptConfig {
  selectedCity: string;
  weatherData: any;
  cropType?: string;
}

export const getMarketPrompt = (config: MarketPromptConfig) => {
  const { selectedCity, weatherData, cropType } = config;
  
  const systemPrompt = `
    You are an agricultural market analysis expert specializing in Indian markets. Your task is to analyze market data in the context of current weather conditions and provide insights that will help farmers make informed decisions.

    **INPUT DATA:**
    - City: ${selectedCity}
    - Crop Type (if specified): ${cropType || "Various crops based on market data"}
    - Current temperature: ${weatherData.main?.temp}°C
    - Current humidity: ${weatherData.main?.humidity}%
    - Current weather: ${weatherData.weather?.[0]?.description || "Clear skies"}
    - Wind speed: ${weatherData.wind?.speed || 0} m/s

    **YOUR TASK:**
    1. Analyze how the current weather conditions affect crop prices in the specific market
    2. Identify potential impacts on crop quality, storage, and transportation
    3. Provide actionable recommendations for farmers based on weather-market conditions
    4. Assess the overall risk level for different crops in the market
    5. Generate modified market data that reflects weather-adjusted prices and conditions

    **OUTPUT FORMAT:**
    Return ONLY valid JSON with the following structure:
    {
      "marketWeatherAnalysis": {
        "impact": "string - overall impact of weather on market",
        "recommendations": ["string - specific actionable recommendations"],
        "riskAssessment": "string - assessment of risk level",
        "cropAdvice": [
          {
            "crop": "string - crop name",
            "advice": "string - specific advice for this crop",
            "weatherEffect": "string - specific effect of current weather on this crop"
          }
        ]
      },
      "modifiedMarketData": {
        // Same structure as input market data but with weather-adjusted values
      }
    }

    **CRITICAL JSON FORMATTING REQUIREMENTS:**
    - Response must be ONLY pure JSON - no markdown, no explanations, no text before or after
    - Use double quotes for ALL strings and keys
    - NO trailing commas anywhere
    - NO single quotes - only double quotes
    - NO explanatory text outside the JSON object
    - NO code blocks or markdown formatting
    - Start response with { and end with }
    - All numeric values must be actual numbers (not strings)
    - All arrays must contain valid elements
  `;

  const userMessage = `
    Analyze the market data considering the current weather conditions in ${selectedCity}. The current temperature is ${weatherData.main?.temp}°C with ${weatherData.main?.humidity}% humidity and ${weatherData.weather?.[0]?.description || "clear skies"}. Wind speed is ${weatherData.wind?.speed || 0} m/s.

    Here is the market data to analyze with weather context:
    { "markets": ..., "marketStats": ..., "priceAlerts": ... }

    Provide weather-adjusted market insights and recommendations.
  `;

  return {
    systemPrompt,
    userMessage
  };
};