const { deriveStorageConditions } = require('../utils/weatherClient');

describe('weatherClient – deriveStorageConditions', () => {
    const mockWeather = { temp: 30, humidity: 70, description: 'clear sky', city: 'Nashik' };

    it('applies +2°C and same humidity for dry storage', () => {
        const result = deriveStorageConditions(mockWeather, 'dry');
        expect(result.temp).toBe(32);
        expect(result.humidity).toBe(70);
        expect(result.source).toBe('derived_from_weather');
    });

    it('applies same temp and -5% humidity for ventilated', () => {
        const result = deriveStorageConditions(mockWeather, 'ventilated');
        expect(result.temp).toBe(30);
        expect(result.humidity).toBe(65);
        expect(result.source).toBe('derived_from_weather');
    });

    it('applies -10°C and 55% fixed humidity for cold_storage', () => {
        const result = deriveStorageConditions(mockWeather, 'cold_storage');
        expect(result.temp).toBe(20);
        expect(result.humidity).toBe(55);
        expect(result.source).toBe('derived_from_weather');
    });

    it('cold storage temp floors at 2°C minimum', () => {
        const coldWeather = { temp: 5, humidity: 80, description: 'cold', city: 'Shimla' };
        const result = deriveStorageConditions(coldWeather, 'cold_storage');
        expect(result.temp).toBe(2); // max(5-10, 2) = 2
    });

    it('ventilated humidity floors at 30%', () => {
        const dryWeather = { temp: 40, humidity: 30, description: 'dry', city: 'Jaisalmer' };
        const result = deriveStorageConditions(dryWeather, 'ventilated');
        expect(result.humidity).toBe(30); // max(30-5, 30) = 30
    });

    it('defaults to dry storage for unknown type', () => {
        const result = deriveStorageConditions(mockWeather, 'unknown');
        expect(result.temp).toBe(32);
        expect(result.humidity).toBe(70);
    });
});
