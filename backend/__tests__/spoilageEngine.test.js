const { THRESHOLDS } = require('../utils/spoilageEngine');

describe('spoilageEngine – THRESHOLDS', () => {
    it('has thresholds for common Indian crops', () => {
        const crops = ['Onion', 'Potato', 'Wheat', 'Rice', 'Tomato'];
        crops.forEach((crop) => {
            expect(THRESHOLDS).toHaveProperty(crop);
            expect(THRESHOLDS[crop]).toHaveProperty('maxHumidity');
            expect(THRESHOLDS[crop]).toHaveProperty('maxTemp');
        });
    });

    it('has a default threshold', () => {
        expect(THRESHOLDS).toHaveProperty('default');
        expect(THRESHOLDS.default.maxHumidity).toBe(75);
        expect(THRESHOLDS.default.maxTemp).toBe(30);
    });

    it('Onion has stricter humidity limit than Rice', () => {
        expect(THRESHOLDS.Onion.maxHumidity).toBeLessThan(THRESHOLDS.Rice.maxHumidity);
    });

    it('Tomato requires much lower temperature than Wheat', () => {
        expect(THRESHOLDS.Tomato.maxTemp).toBeLessThan(THRESHOLDS.Wheat.maxTemp);
    });

    it('all thresholds have positive values', () => {
        Object.entries(THRESHOLDS).forEach(([crop, limits]) => {
            expect(limits.maxHumidity).toBeGreaterThan(0);
            expect(limits.maxTemp).toBeGreaterThan(0);
        });
    });
});
