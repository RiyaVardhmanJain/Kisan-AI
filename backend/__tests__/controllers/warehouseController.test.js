/**
 * Unit Tests: Warehouse Controller
 * Tests getAll, create, update, remove, and getConditions handlers.
 * Run: npx jest __tests__/controllers/warehouseController.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Warehouse = require('../../models/Warehouse');
const ProduceLot = require('../../models/ProduceLot');
const { getAll, create, update, remove, getConditions } = require('../../controllers/warehouseController');

// Mock utils
jest.mock('../../utils/weatherClient');
jest.mock('../../utils/spoilageEngine');
const { getWeatherForCity, deriveStorageConditions } = require('../../utils/weatherClient');
const { checkAndFireAlerts, computeSpoilageRiskScore } = require('../../utils/spoilageEngine');

let mongoServer;
let testUser;

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    const User = require('../../models/User');
    testUser = await User.create({
        name: 'Test User',
        phone: '9999999999',
        passwordHash: 'password123',
    });
});

afterEach(async () => {
    await Warehouse.deleteMany({});
    await ProduceLot.deleteMany({});
    jest.clearAllMocks();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Warehouse Controller', () => {
    describe('getAll', () => {
        it('should return all active warehouses for user', async () => {
            await Warehouse.create([
                {
                    owner: testUser._id,
                    name: 'Warehouse 1',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                    isActive: true,
                },
                {
                    owner: testUser._id,
                    name: 'Warehouse 2',
                    location: { city: 'Mumbai' },
                    capacityQuintals: 500,
                    isActive: true,
                },
            ]);

            const req = { user: { _id: testUser._id } };
            const res = createMockRes();

            await getAll(req, res);

            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.warehouses).toHaveLength(2);
        });

        it('should not return inactive warehouses', async () => {
            await Warehouse.create([
                {
                    owner: testUser._id,
                    name: 'Active Warehouse',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                    isActive: true,
                },
                {
                    owner: testUser._id,
                    name: 'Inactive Warehouse',
                    location: { city: 'Mumbai' },
                    capacityQuintals: 500,
                    isActive: false,
                },
            ]);

            const req = { user: { _id: testUser._id } };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.warehouses).toHaveLength(1);
            expect(responseData.warehouses[0].name).toBe('Active Warehouse');
        });

        it('should not return warehouses belonging to other users', async () => {
            const OtherUser = require('../../models/User');
            const otherUser = await OtherUser.create({
                name: 'Other User',
                phone: '8888888888',
                passwordHash: 'password123',
            });

            await Warehouse.create({
                owner: otherUser._id,
                name: 'Other User Warehouse',
                location: { city: 'Delhi' },
                capacityQuintals: 1000,
            });

            const req = { user: { _id: testUser._id } };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.warehouses).toHaveLength(0);
        });
    });

    describe('create', () => {
        it('should create a warehouse successfully', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    name: 'New Warehouse',
                    location: { city: 'Pune', address: 'MIDC' },
                    type: 'cold_storage',
                    capacityQuintals: 2000,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.warehouse.name).toBe('New Warehouse');
            expect(responseData.warehouse.owner.toString()).toBe(testUser._id.toString());
        });

        it('should default type to "dry" when not specified', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    name: 'Default Warehouse',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                },
            };
            const res = createMockRes();

            await create(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.warehouse.type).toBe('dry');
        });

        it('should return 400 when name is missing', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Name, city, and capacity are required' });
        });

        it('should return 400 when city is missing', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    name: 'Warehouse',
                    location: {},
                    capacityQuintals: 1000,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Name, city, and capacity are required' });
        });

        it('should return 400 when capacityQuintals is missing', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    name: 'Warehouse',
                    location: { city: 'Pune' },
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Name, city, and capacity are required' });
        });
    });

    describe('update', () => {
        it('should update warehouse successfully', async () => {
            const warehouse = await Warehouse.create({
                owner: testUser._id,
                name: 'Old Name',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: warehouse._id },
                body: { name: 'Updated Name' },
            };
            const res = createMockRes();

            await update(req, res);

            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.warehouse.name).toBe('Updated Name');
        });

        it('should return 404 when warehouse not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
                body: { name: 'Updated' },
            };
            const res = createMockRes();

            await update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Warehouse not found' });
        });

        it('should return 404 when updating another user\'s warehouse', async () => {
            const OtherUser = require('../../models/User');
            const otherUser = await OtherUser.create({
                name: 'Other',
                phone: '7777777777',
                passwordHash: 'password',
            });

            const warehouse = await Warehouse.create({
                owner: otherUser._id,
                name: 'Other Warehouse',
                location: { city: 'Delhi' },
                capacityQuintals: 500,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: warehouse._id },
                body: { name: 'Updated' },
            };
            const res = createMockRes();

            await update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('remove', () => {
        it('should soft delete warehouse (set isActive=false)', async () => {
            const warehouse = await Warehouse.create({
                owner: testUser._id,
                name: 'To Delete',
                location: { city: 'Pune' },
                capacityQuintals: 1000,
                isActive: true,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: warehouse._id },
            };
            const res = createMockRes();

            await remove(req, res);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Warehouse deactivated',
                warehouse: expect.objectContaining({ isActive: false }),
            });
        });

        it('should return 404 when warehouse not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
            };
            const res = createMockRes();

            await remove(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Warehouse not found' });
        });
    });

    describe('getConditions', () => {
        beforeEach(() => {
            getWeatherForCity.mockResolvedValue({ temp: 30, humidity: 65, description: 'clear', city: 'Pune' });
            deriveStorageConditions.mockReturnValue({ temp: 32, humidity: 65, source: 'derived_from_weather' });
            checkAndFireAlerts.mockResolvedValue([]);
            computeSpoilageRiskScore.mockReturnValue(25);
        });

        it('should return weather and storage conditions', async () => {
            const warehouse = await Warehouse.create({
                owner: testUser._id,
                name: 'Test Warehouse',
                location: { city: 'Pune' },
                type: 'dry',
                capacityQuintals: 1000,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: warehouse._id },
            };
            const res = createMockRes();

            await getConditions(req, res);

            expect(getWeatherForCity).toHaveBeenCalledWith('Pune');
            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData).toHaveProperty('weather');
            expect(responseData).toHaveProperty('conditions');
            expect(responseData.warehouseType).toBe('dry');
        });

        it('should return 404 when warehouse not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
            };
            const res = createMockRes();

            await getConditions(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Warehouse not found' });
        });

        it('should check active lots for spoilage alerts', async () => {
            const warehouse = await Warehouse.create({
                owner: testUser._id,
                name: 'Test Warehouse',
                location: { city: 'Pune' },
                type: 'dry',
                capacityQuintals: 1000,
            });

            await ProduceLot.create({
                owner: testUser._id,
                warehouse: warehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
                status: 'stored',
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: warehouse._id },
            };
            const res = createMockRes();

            await getConditions(req, res);

            expect(checkAndFireAlerts).toHaveBeenCalled();
        });

        it('should return risk scores for active lots', async () => {
            const warehouse = await Warehouse.create({
                owner: testUser._id,
                name: 'Test Warehouse',
                location: { city: 'Pune' },
                type: 'dry',
                capacityQuintals: 1000,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: warehouse._id },
            };
            const res = createMockRes();

            await getConditions(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData).toHaveProperty('riskScores');
            expect(responseData).toHaveProperty('activeLots');
        });
    });
});
