const { SHELF_LIFE_DAYS, getShelfLife, getRecommendedSellByDate } = require('../utils/shelfLife');

describe('shelfLife utility', () => {
    describe('getShelfLife', () => {
        it('returns correct shelf life for known crops', () => {
            expect(getShelfLife('Onion')).toBe(120);
            expect(getShelfLife('Potato')).toBe(90);
            expect(getShelfLife('Wheat')).toBe(365);
            expect(getShelfLife('Rice')).toBe(365);
            expect(getShelfLife('Tomato')).toBe(14);
            expect(getShelfLife('Sugarcane')).toBe(7);
        });

        it('returns default shelf life for unknown crops', () => {
            expect(getShelfLife('Unknown Crop')).toBe(60);
            expect(getShelfLife('')).toBe(60);
        });

        it('SHELF_LIFE_DAYS has expected keys', () => {
            expect(SHELF_LIFE_DAYS).toHaveProperty('Onion');
            expect(SHELF_LIFE_DAYS).toHaveProperty('default');
            expect(Object.keys(SHELF_LIFE_DAYS).length).toBeGreaterThan(5);
        });
    });

    describe('getRecommendedSellByDate', () => {
        it('calculates sell-by date correctly for Onion (120 days)', () => {
            const entryDate = new Date('2025-01-01');
            const sellBy = getRecommendedSellByDate(entryDate, 'Onion');
            const expected = new Date('2025-05-01'); // Jan 1 + 120 days
            expect(sellBy.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
        });

        it('calculates sell-by date correctly for Tomato (14 days)', () => {
            const entryDate = new Date('2025-06-01');
            const sellBy = getRecommendedSellByDate(entryDate, 'Tomato');
            const expected = new Date('2025-06-15');
            expect(sellBy.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
        });

        it('uses default for unknown crop', () => {
            const entryDate = new Date('2025-01-01');
            const sellBy = getRecommendedSellByDate(entryDate, 'Mystery Plant');
            const expected = new Date('2025-03-02'); // Jan 1 + 60 days
            expect(sellBy.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
        });

        it('does not mutate the input date', () => {
            const entryDate = new Date('2025-01-01');
            const originalTime = entryDate.getTime();
            getRecommendedSellByDate(entryDate, 'Wheat');
            expect(entryDate.getTime()).toBe(originalTime);
        });
    });
});
