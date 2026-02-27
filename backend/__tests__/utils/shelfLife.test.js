/**
 * Unit Tests: Shelf Life Utility
 * Tests shelf life calculations and sell-by date recommendations.
 * Run: npx jest __tests__/utils/shelfLife.test.js --verbose
 */

const { SHELF_LIFE_DAYS, getShelfLife, getRecommendedSellByDate } = require('../../utils/shelfLife');

describe('Shelf Life Utility', () => {
    describe('SHELF_LIFE_DAYS Constants', () => {
        it('should have correct shelf life for Onion (120 days)', () => {
            expect(SHELF_LIFE_DAYS.Onion).toBe(120);
        });

        it('should have correct shelf life for Potato (90 days)', () => {
            expect(SHELF_LIFE_DAYS.Potato).toBe(90);
        });

        it('should have correct shelf life for Wheat (365 days)', () => {
            expect(SHELF_LIFE_DAYS.Wheat).toBe(365);
        });

        it('should have correct shelf life for Rice (365 days)', () => {
            expect(SHELF_LIFE_DAYS.Rice).toBe(365);
        });

        it('should have correct shelf life for Tomato (14 days)', () => {
            expect(SHELF_LIFE_DAYS.Tomato).toBe(14);
        });

        it('should have correct shelf life for perishables', () => {
            expect(SHELF_LIFE_DAYS.Banana).toBe(10);
            expect(SHELF_LIFE_DAYS.Mango).toBe(12);
            expect(SHELF_LIFE_DAYS.Grapes).toBe(14);
        });

        it('should have default shelf life of 60 days', () => {
            expect(SHELF_LIFE_DAYS.default).toBe(60);
        });
    });

    describe('getShelfLife', () => {
        it('should return correct shelf life for known crops', () => {
            expect(getShelfLife('Onion')).toBe(120);
            expect(getShelfLife('Potato')).toBe(90);
            expect(getShelfLife('Wheat')).toBe(365);
            expect(getShelfLife('Rice')).toBe(365);
            expect(getShelfLife('Tomato')).toBe(14);
        });

        it('should return default shelf life for unknown crops', () => {
            expect(getShelfLife('Unknown Crop')).toBe(60);
            expect(getShelfLife('')).toBe(60);
        });

        it('should be case-sensitive', () => {
            expect(getShelfLife('onion')).toBe(60); // lowercase not in map
            expect(getShelfLife('ONION')).toBe(60); // uppercase not in map
            expect(getShelfLife('Onion')).toBe(120); // correct case
        });

        it('should handle null/undefined gracefully', () => {
            expect(getShelfLife(null)).toBe(60);
            expect(getShelfLife(undefined)).toBe(60);
        });
    });

    describe('getRecommendedSellByDate', () => {
        it('should calculate correct sell-by date for Onion (120 days)', () => {
            const entryDate = new Date('2026-01-01');
            const sellByDate = getRecommendedSellByDate(entryDate, 'Onion');

            const expected = new Date('2026-01-01');
            expected.setDate(expected.getDate() + 120);

            expect(sellByDate).toEqual(expected);
        });

        it('should calculate correct sell-by date for Tomato (14 days)', () => {
            const entryDate = new Date('2026-01-01');
            const sellByDate = getRecommendedSellByDate(entryDate, 'Tomato');

            const expected = new Date('2026-01-01');
            expected.setDate(expected.getDate() + 14);

            expect(sellByDate).toEqual(expected);
        });

        it('should use default shelf life for unknown crops', () => {
            const entryDate = new Date('2026-01-01');
            const sellByDate = getRecommendedSellByDate(entryDate, 'Unknown');

            const expected = new Date('2026-01-01');
            expected.setDate(expected.getDate() + 60);

            expect(sellByDate).toEqual(expected);
        });

        it('should not mutate the original entryDate', () => {
            const entryDate = new Date('2026-01-01');
            const originalTime = entryDate.getTime();

            getRecommendedSellByDate(entryDate, 'Onion');

            expect(entryDate.getTime()).toBe(originalTime);
        });

        it('should handle date string input (JavaScript Date coercion)', () => {
            const sellByDate = getRecommendedSellByDate('2026-01-01', 'Onion');
            expect(sellByDate instanceof Date).toBe(true);
        });
    });
});
