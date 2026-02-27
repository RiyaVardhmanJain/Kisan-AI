/**
 * Unit Tests: ProduceLot Model
 * Tests schema validation, auto-generated lotId, and constraints.
 * Run: npx jest __tests__/models/produceLot.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ProduceLot = require('../../models/ProduceLot');
const User = require('../../models/User');
const Warehouse = require('../../models/Warehouse');

let mongoServer;
let testUserId;
let testWarehouseId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user and warehouse
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
    await ProduceLot.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('ProduceLot Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid produce lot with required fields', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);

            expect(lot._id).toBeDefined();
            expect(lot.lotId).toBeDefined();
            expect(lot.lotId).toMatch(/^LOT-2026-\d{4}$/);
            expect(lot.owner.toString()).toBe(testUserId.toString());
            expect(lot.warehouse.toString()).toBe(testWarehouseId.toString());
            expect(lot.cropName).toBe('Onion');
            expect(lot.quantityQuintals).toBe(150);
            expect(lot.entryDate).toBeDefined();
            expect(lot.currentCondition).toBe('good'); // default
            expect(lot.status).toBe('stored'); // default
            expect(lot.source).toBe(''); // default
            expect(lot.createdAt).toBeDefined();
        });

        it('should fail validation without owner', async () => {
            const lotData = {
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            await expect(ProduceLot.create(lotData)).rejects.toThrow();
        });

        it('should fail validation without warehouse', async () => {
            const lotData = {
                owner: testUserId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            await expect(ProduceLot.create(lotData)).rejects.toThrow();
        });

        it('should fail validation without cropName', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                quantityQuintals: 150,
            };

            await expect(ProduceLot.create(lotData)).rejects.toThrow();
        });

        it('should fail validation without quantityQuintals', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
            };

            await expect(ProduceLot.create(lotData)).rejects.toThrow();
        });

        it('should fail validation with negative quantityQuintals', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: -10,
            };

            await expect(ProduceLot.create(lotData)).rejects.toThrow();
        });

        it('should accept zero quantityQuintals', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 0,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.quantityQuintals).toBe(0);
        });

        it('should trim whitespace from cropName', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: '  Onion  ',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.cropName).toBe('Onion');
        });
    });

    describe('Auto-generated lotId', () => {
        it('should generate lotId in format LOT-YYYY-NNNN', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);

            expect(lot.lotId).toMatch(/^LOT-2026-\d{4}$/);
        });

        it('should increment lotId sequence for each new lot', async () => {
            const lot1 = await ProduceLot.create({
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const lot2 = await ProduceLot.create({
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Potato',
                quantityQuintals: 200,
            });

            const lot3 = await ProduceLot.create({
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Wheat',
                quantityQuintals: 300,
            });

            expect(lot1.lotId).toMatch(/^LOT-2026-\d{4}$/);
            expect(lot2.lotId).toMatch(/^LOT-2026-\d{4}$/);
            expect(lot3.lotId).toMatch(/^LOT-2026-\d{4}$/);

            // Extract sequence numbers
            const num1 = parseInt(lot1.lotId.split('-')[2]);
            const num2 = parseInt(lot2.lotId.split('-')[2]);
            const num3 = parseInt(lot3.lotId.split('-')[2]);

            expect(num2).toBe(num1 + 1);
            expect(num3).toBe(num2 + 1);
        });

        it('should not overwrite manually provided lotId', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                lotId: 'LOT-CUSTOM-001',
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.lotId).toBe('LOT-CUSTOM-001');
        });
    });

    describe('Shelf Life and Sell-by Date', () => {
        it('should populate expectedShelfLifeDays when provided', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                expectedShelfLifeDays: 120,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.expectedShelfLifeDays).toBe(120);
        });

        it('should populate recommendedSellByDate when provided', async () => {
            const entryDate = new Date('2026-01-01');
            const sellByDate = new Date('2026-05-01');

            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                entryDate,
                recommendedSellByDate: sellByDate,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.recommendedSellByDate).toEqual(sellByDate);
        });

        it('should allow null cropAdvisory by default', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.cropAdvisory).toBeNull();
        });

        it('should accept object in cropAdvisory field', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                cropAdvisory: {
                    pesticide: 'Neem Oil',
                    frequency: 'Weekly',
                    notes: 'Apply in evening',
                },
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.cropAdvisory).toEqual({
                pesticide: 'Neem Oil',
                frequency: 'Weekly',
                notes: 'Apply in evening',
            });
        });
    });

    describe('Current Condition Enum', () => {
        it('should default to "good"', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.currentCondition).toBe('good');
        });

        it.each(['good', 'watch', 'at_risk', 'spoiled'])(
            'should accept "%s" condition',
            async (condition) => {
                const lotData = {
                    owner: testUserId,
                    warehouse: testWarehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 150,
                    currentCondition: condition,
                };

                const lot = await ProduceLot.create(lotData);
                expect(lot.currentCondition).toBe(condition);
            }
        );

        it('should reject invalid condition', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                currentCondition: 'invalid_condition',
            };

            await expect(ProduceLot.create(lotData)).rejects.toThrow();
        });
    });

    describe('Status Enum', () => {
        it('should default to "stored"', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.status).toBe('stored');
        });

        it.each(['stored', 'partially_dispatched', 'dispatched', 'sold'])(
            'should accept "%s" status',
            async (status) => {
                const lotData = {
                    owner: testUserId,
                    warehouse: testWarehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 150,
                    status,
                };

                const lot = await ProduceLot.create(lotData);
                expect(lot.status).toBe(status);
            }
        );

        it('should reject invalid status', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                status: 'invalid_status',
            };

            await expect(ProduceLot.create(lotData)).rejects.toThrow();
        });
    });

    describe('Entry Date', () => {
        it('should default to current date', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);
            const now = new Date();
            const entryDate = new Date(lot.entryDate);

            // Compare dates (within 5 seconds tolerance)
            expect(Math.abs(now - entryDate)).toBeLessThan(5000);
        });

        it('should accept custom entryDate', async () => {
            const customDate = new Date('2026-01-15');

            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                entryDate: customDate,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.entryDate).toEqual(customDate);
        });
    });

    describe('Source Field', () => {
        it('should default to empty string', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.source).toBe('');
        });

        it('should accept source string', async () => {
            const lotData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                cropName: 'Onion',
                quantityQuintals: 150,
                source: 'Farm A, Nashik',
            };

            const lot = await ProduceLot.create(lotData);
            expect(lot.source).toBe('Farm A, Nashik');
        });
    });
});
