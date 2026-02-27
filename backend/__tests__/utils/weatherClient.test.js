/**
 * Unit Tests: Weather Client Utility
 * Tests weather API integration and condition derivation.
 * Run: npx jest __tests__/utils/weatherClient.test.js --verbose
 */

const { getWeatherForCity, deriveStorageConditions } = require('../../utils/weatherClient');

// Mock axios for API tests
jest.mock('axios');
const axios = require('axios');

describe('Weather Client', () => {
    const originalApiKey = process.env.OPENWEATHER_API_KEY;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env.OPENWEATHER_API_KEY = originalApiKey;
    });

    describe('getWeatherForCity - Mock Data (No API Key)', () => {
        beforeEach(() => {
            delete process.env.OPENWEATHER_API_KEY;
        });

        afterAll(() => {
            process.env.OPENWEATHER_API_KEY = originalApiKey;
        });

        it('should return mock data when no API key configured', async () => {
            const weather = await getWeatherForCity('Pune');

            expect(weather).toHaveProperty('temp');
            expect(weather).toHaveProperty('humidity');
            expect(weather).toHaveProperty('description');
            expect(weather).toHaveProperty('city');
            expect(weather.city).toBe('Pune');
        });

        it('should return temp between 28-36°C (mock range)', async () => {
            const weather = await getWeatherForCity('Mumbai');
            expect(weather.temp).toBeGreaterThanOrEqual(28);
            expect(weather.temp).toBeLessThanOrEqual(36);
        });

        it('should return humidity between 55-85% (mock range)', async () => {
            const weather = await getWeatherForCity('Delhi');
            expect(weather.humidity).toBeGreaterThanOrEqual(55);
            expect(weather.humidity).toBeLessThanOrEqual(85);
        });

        it('should return consistent mock data structure', async () => {
            const cities = ['Pune', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai'];

            for (const city of cities) {
                const weather = await getWeatherForCity(city);
                expect(weather).toEqual({
                    temp: expect.any(Number),
                    humidity: expect.any(Number),
                    description: expect.any(String),
                    city: city,
                });
            }
        });
    });

    describe('getWeatherForCity - API Mode', () => {
        beforeEach(() => {
            process.env.OPENWEATHER_API_KEY = 'test_api_key_123';
        });

        afterAll(() => {
            delete process.env.OPENWEATHER_API_KEY;
        });

        it('should call OpenWeather API with correct parameters', async () => {
            const mockResponse = {
                data: {
                    main: { temp: 30, humidity: 65 },
                    weather: [{ description: 'clear sky' }],
                },
            };
            axios.get.mockResolvedValue(mockResponse);

            const weather = await getWeatherForCity('Pune');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('api.openweathermap.org'),
                expect.objectContaining({
                    params: expect.anything(),
                })
            );
            expect(weather.temp).toBe(30);
            expect(weather.humidity).toBe(65);
            expect(weather.description).toBe('clear sky');
        });

        it('should handle API error and return fallback data', async () => {
            axios.get.mockRejectedValue(new Error('Network error'));

            const weather = await getWeatherForCity('Pune');

            expect(weather).toEqual({
                temp: 30,
                humidity: 65,
                description: 'unavailable',
                city: 'Pune',
            });
        });

        it('should handle 404 error for invalid city', async () => {
            axios.get.mockRejectedValue({ response: { status: 404 } });

            const weather = await getWeatherForCity('InvalidCity123');

            expect(weather.description).toBe('unavailable');
        });

        it('should handle missing weather description gracefully', async () => {
            const mockResponse = {
                data: {
                    main: { temp: 25, humidity: 60 },
                    weather: [],
                },
            };
            axios.get.mockResolvedValue(mockResponse);

            const weather = await getWeatherForCity('Pune');
            expect(weather.description).toBe('');
        });
    });

    describe('deriveStorageConditions', () => {
        const ambientWeather = {
            temp: 30,
            humidity: 65,
            description: 'partly cloudy',
            city: 'Pune',
        };

        describe('Dry Warehouse', () => {
            it('should add 2°C to ambient temperature', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'dry');
                expect(conditions.temp).toBe(32); // 30 + 2
            });

            it('should keep same humidity as ambient', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'dry');
                expect(conditions.humidity).toBe(65);
            });

            it('should set source to derived_from_weather', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'dry');
                expect(conditions.source).toBe('derived_from_weather');
            });
        });

        describe('Cold Storage Warehouse', () => {
            it('should subtract 10°C from ambient (with 2°C floor)', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'cold_storage');
                expect(conditions.temp).toBe(20); // 30 - 10
            });

            it('should enforce 2°C minimum temperature', () => {
                const coldWeather = { ...ambientWeather, temp: 5 };
                const conditions = deriveStorageConditions(coldWeather, 'cold_storage');
                expect(conditions.temp).toBe(2); // Floor at 2°C
            });

            it('should set fixed 55% humidity', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'cold_storage');
                expect(conditions.humidity).toBe(55);
            });
        });

        describe('Ventilated Warehouse', () => {
            it('should keep same temperature as ambient', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'ventilated');
                expect(conditions.temp).toBe(30);
            });

            it('should reduce humidity by 5%', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'ventilated');
                expect(conditions.humidity).toBe(60); // 65 - 5
            });

            it('should enforce 30% minimum humidity', () => {
                const humidWeather = { ...ambientWeather, humidity: 30 };
                const conditions = deriveStorageConditions(humidWeather, 'ventilated');
                expect(conditions.humidity).toBe(30); // Floor at 30%
            });

            it('should handle high humidity reduction correctly', () => {
                const highHumidity = { ...ambientWeather, humidity: 90 };
                const conditions = deriveStorageConditions(highHumidity, 'ventilated');
                expect(conditions.humidity).toBe(85); // 90 - 5
            });
        });

        describe('Unknown/Default Warehouse Type', () => {
            it('should default to dry warehouse behavior', () => {
                const conditions = deriveStorageConditions(ambientWeather, 'unknown_type');
                expect(conditions.temp).toBe(32); // +2 like dry
                expect(conditions.humidity).toBe(65); // same as dry
            });

            it('should handle null type', () => {
                const conditions = deriveStorageConditions(ambientWeather, null);
                expect(conditions.temp).toBe(32);
            });

            it('should handle undefined type', () => {
                const conditions = deriveStorageConditions(ambientWeather, undefined);
                expect(conditions.temp).toBe(32);
            });
        });

        describe('Edge Cases', () => {
            it('should handle extreme ambient temperatures', () => {
                const extremeWeather = { ...ambientWeather, temp: 50 };

                const dry = deriveStorageConditions(extremeWeather, 'dry');
                expect(dry.temp).toBe(52);

                const cold = deriveStorageConditions(extremeWeather, 'cold_storage');
                expect(cold.temp).toBe(40); // 50 - 10
            });

            it('should handle extreme humidity values', () => {
                const extremeWeather = { ...ambientWeather, humidity: 100 };

                const dry = deriveStorageConditions(extremeWeather, 'dry');
                expect(dry.humidity).toBe(100);

                const vent = deriveStorageConditions(extremeWeather, 'ventilated');
                expect(vent.humidity).toBe(95); // 100 - 5
            });

            it('should handle zero humidity', () => {
                const zeroHumidity = { ...ambientWeather, humidity: 0 };

                const vent = deriveStorageConditions(zeroHumidity, 'ventilated');
                expect(vent.humidity).toBe(30); // Floor at 30%
            });
        });
    });
});
