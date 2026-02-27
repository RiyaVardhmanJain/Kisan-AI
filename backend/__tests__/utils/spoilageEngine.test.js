/**
 * Unit Tests: Spoilage Engine
 * Tests alert generation and risk score calculation.
 * Run: npx jest __tests__/utils/spoilageEngine.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { THRESHOLDS, checkAndFireAlerts, computeSpoilageRiskScore } = require('../../utils/spoilageEngine');
const Alert = require('../../models/Alert');
const User = require('../../models/User');
const Warehouse = require('../../models/Warehouse');
const ProduceLot = require('../../models/ProduceLot');

let mongoServer;
let testUserId;
let testWarehouseId;

const TEST_SECRET = 'test_jwt_secret';

beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    const user = await User.create({
        name: 'Test User',
        phone: '9999999999',
        passwordHash: 'password123',
    });
    testUserId = user._id;

    const warehouse = await Warehouse.create({
        owner: testUserId,
        name: 'Test Warehouse',
        location: { city: 'Pune' },
        capacityQuintals: 1000,
    });
    testWarehouseId = warehouse._id;
});

afterEach(async () => {
    await Alert.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
});

describe('Spoilage Engine', () => {
    describe('THRESHOLDS Constants', () => {
        it('should have correct thresholds for Onion', () => {
            expect(THRESHOLDS.Onion).toEqual({ maxHumidity: 65, maxTemp: 30 });
        });

        it('should have correct thresholds for Potato', () => {
            expect(THRESHOLDS.Potato).toEqual({ maxHumidity: 85, maxTemp: 10 });
        });

        it('should have correct thresholds for Wheat', () => {
            expect(THRESHOLDS.Wheat).toEqual({ maxHumidity: 70, maxTemp: 32 });
        });

        it('should have default thresholds', () => {
            expect(THRESHOLDS.default).toEqual({ maxHumidity: 75, maxTemp: 30 });
        });
    });

    describe('checkAndFireAlerts', () => {
        const createTestLot = async (cropName, entryDate = new Date()) => {
            return ProduceLot.create({
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName,
                quantityQuintals: 100,
                entryDate,
                recommendedSellByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
            });
        };

        it('should create humidity breach alert', async () => {
            const lot = await createTestLot('Onion');
            const conditions = { temp: 25, humidity: 80 }; // 80% > 65% threshold

            const alerts = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts).toHaveLength(1);
            expect(alerts[0].alertType).toBe('humidity_breach');
            expect(alerts[0].severity).toBe('high');
            expect(alerts[0].message).toContain('Humidity');
            expect(alerts[0].message).toContain('exceeds');
        });

        it('should create critical humidity alert for severe breach', async () => {
            const lot = await createTestLot('Onion');
            const conditions = { temp: 25, humidity: 85 }; // 85% > 65% + 15%

            const alerts = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts).toHaveLength(1);
            expect(alerts[0].severity).toBe('critical');
        });

        it('should create temperature breach alert', async () => {
            const lot = await createTestLot('Onion');
            const conditions = { temp: 35, humidity: 60 }; // 35°C > 30°C threshold

            const alerts = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts).toHaveLength(1);
            expect(alerts[0].alertType).toBe('temp_breach');
            expect(alerts[0].severity).toBe('high');
        });

        it('should create critical temperature alert for severe breach', async () => {
            const lot = await createTestLot('Onion');
            const conditions = { temp: 45, humidity: 60 }; // 45°C > 30°C + 10°C

            const alerts = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts).toHaveLength(1);
            expect(alerts[0].severity).toBe('critical');
        });

        it('should create overdue alert when past sell-by date', async () => {
            const lot = await createTestLot('Onion', new Date('2025-01-01'));
            lot.recommendedSellByDate = new Date('2025-06-01'); // Past date
            await lot.save();

            const conditions = { temp: 25, humidity: 60 };

            const alerts = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts).toHaveLength(1);
            expect(alerts[0].alertType).toBe('overdue');
            expect(alerts[0].severity).toBe('critical');
            expect(alerts[0].message).toContain('past its recommended sell-by date');
        });

        it('should create multiple alerts for multiple breaches', async () => {
            const lot = await createTestLot('Onion');
            const conditions = { temp: 45, humidity: 85 }; // Both temp and humidity breach

            const alerts = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts.length).toBeGreaterThanOrEqual(2);
            const alertTypes = alerts.map(a => a.alertType);
            expect(alertTypes).toContain('temp_breach');
            expect(alertTypes).toContain('humidity_breach');
        });

        it('should not create duplicate alerts for same type', async () => {
            const lot = await createTestLot('Onion');
            const conditions = { temp: 35, humidity: 60 };

            // First call
            const alerts1 = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            // Second call with same conditions
            const alerts2 = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts1).toHaveLength(1);
            expect(alerts2).toHaveLength(0); // No new alerts
        });

        it('should create new alert after previous one is resolved', async () => {
            const lot = await createTestLot('Onion');
            const conditions = { temp: 35, humidity: 60 };

            // First alert
            await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            // Resolve the alert
            await Alert.updateMany({ isResolved: false }, { isResolved: true, actionTaken: 'Fixed' });

            // New alert should fire
            const alerts = await checkAndFireAlerts({
                lot,
                warehouse: { _id: testWarehouseId },
                conditions,
                owner: testUserId,
            });

            expect(alerts).toHaveLength(1);
        });

        it('should use default thresholds for unknown crop', () => {
            const lot = {
                _id: new mongoose.Types.ObjectId(),
                cropName: 'Unknown Crop',
                recommendedSellByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            };
            const conditions = { temp: 35, humidity: 80 }; // Breaches default (75%, 30°C)

            const score = computeSpoilageRiskScore(lot, conditions);
            expect(score).toBeGreaterThan(0);
        });
    });

    describe('computeSpoilageRiskScore', () => {
        const createTestLot = (cropName, daysUntilExpiry = 30) => ({
            _id: new mongoose.Types.ObjectId(),
            cropName,
            entryDate: new Date(),
            recommendedSellByDate: new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000),
        });

        it('should return 0-100 score', () => {
            const lot = createTestLot('Onion', 60);
            const conditions = { temp: 25, humidity: 60 }; // Within thresholds

            const score = computeSpoilageRiskScore(lot, conditions);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should have low risk for fresh lot in good conditions', () => {
            const lot = createTestLot('Onion', 100); // Fresh
            const conditions = { temp: 25, humidity: 60 }; // Good

            const score = computeSpoilageRiskScore(lot, conditions);
            expect(score).toBeLessThan(30);
        });

        it('should have high risk for lot near expiry', () => {
            const lot = createTestLot('Onion', 5); // Near expiry
            const conditions = { temp: 25, humidity: 60 };

            const score = computeSpoilageRiskScore(lot, conditions);
            expect(score).toBeGreaterThan(40);
        });

        it('should increase risk score for temperature breach', () => {
            const lot = createTestLot('Onion', 60);
            const goodConditions = { temp: 25, humidity: 60 };
            const badConditions = { temp: 40, humidity: 60 }; // Temp breach

            const goodScore = computeSpoilageRiskScore(lot, goodConditions);
            const badScore = computeSpoilageRiskScore(lot, badConditions);

            expect(badScore).toBeGreaterThan(goodScore);
        });

        it('should increase risk score for humidity breach', () => {
            const lot = createTestLot('Onion', 60);
            const goodConditions = { temp: 25, humidity: 60 };
            const badConditions = { temp: 25, humidity: 90 }; // Humidity breach

            const goodScore = computeSpoilageRiskScore(lot, goodConditions);
            const badScore = computeSpoilageRiskScore(lot, badConditions);

            expect(badScore).toBeGreaterThan(goodScore);
        });

        it('should have highest risk for multiple breaches', () => {
            const lot = createTestLot('Onion', 10); // Near expiry
            const conditions = { temp: 45, humidity: 90 }; // Both breach

            const score = computeSpoilageRiskScore(lot, conditions);
            expect(score).toBeGreaterThan(50);
        });

        it('should handle lot without recommendedSellByDate', () => {
            const lot = {
                _id: new mongoose.Types.ObjectId(),
                cropName: 'Onion',
                entryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            };
            const conditions = { temp: 25, humidity: 60 };

            const score = computeSpoilageRiskScore(lot, conditions);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should handle missing conditions', () => {
            const lot = createTestLot('Onion', 60);

            const score = computeSpoilageRiskScore(lot, null);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(50); // Only shelf-life component
        });
    });
});
