/**
 * Unit Tests: Warehouse Model
 * Tests schema validation and constraints.
 * Run: npx jest __tests__/models/warehouse.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Warehouse = require('../../models/Warehouse');
const User = require('../../models/User');

let mongoServer;
let testUserId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a test user
    const user = await User.create({
        name: 'Test User',
        phone: '9999999999',
        passwordHash: 'password123',
    });
    testUserId = user._id;
});

afterEach(async () => {
    await Warehouse.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Warehouse Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid warehouse with required fields', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Nashik Cold Storage',
                location: {
                    city: 'Nashik',
                    address: 'MIDC Area',
                },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);

            expect(warehouse._id).toBeDefined();
            expect(warehouse.owner.toString()).toBe(testUserId.toString());
            expect(warehouse.name).toBe('Nashik Cold Storage');
            expect(warehouse.location.city).toBe('Nashik');
            expect(warehouse.location.address).toBe('MIDC Area');
            expect(warehouse.type).toBe('dry'); // default
            expect(warehouse.capacityQuintals).toBe(1000);
            expect(warehouse.usedCapacity).toBe(0); // default
            expect(warehouse.isActive).toBe(true); // default
            expect(warehouse.createdAt).toBeDefined();
        });

        it('should fail validation without owner', async () => {
            const warehouseData = {
                name: 'Nashik Cold Storage',
                location: { city: 'Nashik' },
                capacityQuintals: 1000,
            };

            await expect(Warehouse.create(warehouseData)).rejects.toThrow();
        });

        it('should fail validation without name', async () => {
            const warehouseData = {
                owner: testUserId,
                location: { city: 'Nashik' },
                capacityQuintals: 1000,
            };

            await expect(Warehouse.create(warehouseData)).rejects.toThrow();
        });

        it('should fail validation without city', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Nashik Cold Storage',
                location: { address: 'MIDC Area' }, // missing city
                capacityQuintals: 1000,
            };

            await expect(Warehouse.create(warehouseData)).rejects.toThrow();
        });

        it('should fail validation without capacityQuintals', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Nashik Cold Storage',
                location: { city: 'Nashik' },
            };

            await expect(Warehouse.create(warehouseData)).rejects.toThrow();
        });

        it('should fail validation with capacityQuintals less than 1', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Nashik Cold Storage',
                location: { city: 'Nashik' },
                capacityQuintals: 0,
            };

            await expect(Warehouse.create(warehouseData)).rejects.toThrow();
        });

        it('should trim whitespace from name and city', async () => {
            const warehouseData = {
                owner: testUserId,
                name: '  Nashik Cold Storage  ',
                location: {
                    city: '  Nashik  ',
                    address: '  MIDC Area  ',
                },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);

            expect(warehouse.name).toBe('Nashik Cold Storage');
            expect(warehouse.location.city).toBe('Nashik');
            expect(warehouse.location.address).toBe('MIDC Area');
        });

        it('should accept optional address field with default empty string', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Nashik Cold Storage',
                location: { city: 'Nashik' },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.location.address).toBe('');
        });
    });

    describe('Warehouse Type Enum', () => {
        it('should accept "dry" type', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Dry Warehouse',
                location: { city: 'Pune' },
                type: 'dry',
                capacityQuintals: 500,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.type).toBe('dry');
        });

        it('should accept "cold_storage" type', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Cold Storage',
                location: { city: 'Mumbai' },
                type: 'cold_storage',
                capacityQuintals: 2000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.type).toBe('cold_storage');
        });

        it('should accept "ventilated" type', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Ventilated Godown',
                location: { city: 'Nagpur' },
                type: 'ventilated',
                capacityQuintals: 800,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.type).toBe('ventilated');
        });

        it('should reject invalid warehouse type', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Invalid Warehouse',
                location: { city: 'Pune' },
                type: 'invalid_type',
                capacityQuintals: 500,
            };

            await expect(Warehouse.create(warehouseData)).rejects.toThrow();
        });

        it('should default to "dry" type when not specified', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Default Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 500,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.type).toBe('dry');
        });
    });

    describe('Capacity Management', () => {
        it('should allow creating warehouse with large capacity', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Large Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 10000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.capacityQuintals).toBe(10000);
        });

        it('should initialize usedCapacity to 0', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Empty Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.usedCapacity).toBe(0);
        });

        it('should allow updating usedCapacity', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Test Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            warehouse.usedCapacity = 500;
            await warehouse.save();

            const updated = await Warehouse.findById(warehouse._id);
            expect(updated.usedCapacity).toBe(500);
        });

        it('should allow negative usedCapacity (for edge cases)', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Test Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            warehouse.usedCapacity = -100;
            await warehouse.save();

            const updated = await Warehouse.findById(warehouse._id);
            expect(updated.usedCapacity).toBe(-100);
        });
    });

    describe('Active Status', () => {
        it('should default isActive to true', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Active Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.isActive).toBe(true);
        });

        it('should allow setting isActive to false (soft delete)', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Inactive Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
                isActive: false,
            };

            const warehouse = await Warehouse.create(warehouseData);
            expect(warehouse.isActive).toBe(false);
        });

        it('should allow toggling isActive status', async () => {
            const warehouseData = {
                owner: testUserId,
                name: 'Toggle Warehouse',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
            };

            const warehouse = await Warehouse.create(warehouseData);
            warehouse.isActive = false;
            await warehouse.save();

            const updated = await Warehouse.findById(warehouse._id);
            expect(updated.isActive).toBe(false);
        });
    });
});
