const axios = require('axios');

const getWeatherForCity = async (city) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        // Return mock weather data if no API key configured
        return {
            temp: 28 + Math.random() * 8,
            humidity: 55 + Math.random() * 30,
            description: 'partly cloudy',
            city,
        };
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&units=metric&appid=${apiKey}`;
        const { data } = await axios.get(url);
        return {
            temp: data.main.temp,
            humidity: data.main.humidity,
            description: data.weather?.[0]?.description || '',
            city,
        };
    } catch (err) {
        console.error(`Weather API error for ${city}:`, err.message);
        // Fallback mock
        return {
            temp: 30,
            humidity: 65,
            description: 'unavailable',
            city,
        };
    }
};

/**
 * Derive internal storage conditions based on warehouse type + ambient weather.
 * No IoT sensors — we simulate from weather data per PRD spec.
 */
const deriveStorageConditions = (weather, warehouseType) => {
    switch (warehouseType) {
        case 'cold_storage':
            return {
                temp: Math.max(weather.temp - 10, 2),
                humidity: 55,
                source: 'derived_from_weather',
            };
        case 'ventilated':
            return {
                temp: weather.temp,
                humidity: Math.max(weather.humidity - 5, 30),
                source: 'derived_from_weather',
            };
        case 'dry':
        default:
            return {
                temp: weather.temp + 2,
                humidity: weather.humidity,
                source: 'derived_from_weather',
            };
    }
};

module.exports = { getWeatherForCity, deriveStorageConditions };
