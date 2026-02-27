/**
 * Unit Tests: Lot Controller
 * Tests getAll, create, update, deleteLot, getTimeline, addEvent, and shiftLot handlers.
 * Run: npx jest __tests__/controllers/lotController.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ProduceLot = require('../../models/ProduceLot');
const Warehouse = require('../../models/Warehouse');
const StorageEvent = require('../../models/StorageEvent');
const { getAll, create, update, deleteLot, getTimeline, addEvent, shiftLot } = require('../../controllers/lotController');

let mongoServer;
let testUser;
let testWarehouse;

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

    testWarehouse = await Warehouse.create({
        owner: testUser._id,
        name: 'Test Warehouse',
        location: { city: 'Pune' },
        capacityQuintals: 1000,
    });
});

afterEach(async () => {
    await ProduceLot.deleteMany({});
    await StorageEvent.deleteMany({});
    jest.clearAllMocks();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Lot Controller', () => {
    describe('getAll', () => {
        it('should return all lots for user', async () => {
            await ProduceLot.create([
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    cropName: 'Onion',
                    quantityQuintals: 100,
                },
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    cropName: 'Potato',
                    quantityQuintals: 200,
                },
            ]);

            const req = { user: { _id: testUser._id }, query: {} };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.lots).toHaveLength(2);
        });

        it('should filter by warehouseId', async () => {
            const warehouse2 = await Warehouse.create({
                owner: testUser._id,
                name: 'Warehouse 2',
                location: { city: 'Mumbai' },
                capacityQuintals: 500,
            });

            await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                query: { warehouseId: warehouse2._id.toString() },
            };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.lots).toHaveLength(0);
        });

        it('should filter by status', async () => {
            await ProduceLot.create([
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    cropName: 'Onion',
                    quantityQuintals: 100,
                    status: 'stored',
                },
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    cropName: 'Potato',
                    quantityQuintals: 200,
                    status: 'sold',
                },
            ]);

            const req = {
                user: { _id: testUser._id },
                query: { status: 'stored' },
            };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.lots).toHaveLength(1);
            expect(responseData.lots[0].status).toBe('stored');
        });

        it('should populate warehouse information', async () => {
            await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = { user: { _id: testUser._id }, query: {} };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.lots[0].warehouse).toBeDefined();
            expect(responseData.lots[0].warehouse.name).toBe('Test Warehouse');
        });
    });

    describe('create', () => {
        it('should create a new lot successfully', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: testWarehouse._id.toString(),
                    cropName: 'Onion',
                    quantityQuintals: 150,
                    source: 'Farm A',
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.lot.cropName).toBe('Onion');
            expect(responseData.lot.quantityQuintals).toBe(150);
            expect(responseData.merged).toBeUndefined();
        });

        it('should merge quantity into existing lot of same crop', async () => {
            const existingLot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
                status: 'stored',
            });

            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: testWarehouse._id.toString(),
                    cropName: 'Onion',
                    quantityQuintals: 50,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.merged).toBe(true);
            expect(responseData.lot.quantityQuintals).toBe(150); // 100 + 50
        });

        it('should not merge lots with different status', async () => {
            await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
                status: 'sold', // Different status
            });

            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: testWarehouse._id.toString(),
                    cropName: 'Onion',
                    quantityQuintals: 50,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(201); // New lot created
        });

        it('should return 400 when warehouse is missing', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    cropName: 'Onion',
                    quantityQuintals: 100,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Warehouse, crop name, and quantity are required' });
        });

        it('should return 400 when cropName is missing', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: testWarehouse._id.toString(),
                    quantityQuintals: 100,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Warehouse, crop name, and quantity are required' });
        });

        it('should return 400 when quantityQuintals is missing', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: testWarehouse._id.toString(),
                    cropName: 'Onion',
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Warehouse, crop name, and quantity are required' });
        });

        it('should return 404 when warehouse not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: fakeId.toString(),
                    cropName: 'Onion',
                    quantityQuintals: 100,
                },
            };
            const res = createMockRes();

            await create(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Warehouse not found' });
        });

        it('should update warehouse usedCapacity', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: testWarehouse._id.toString(),
                    cropName: 'Onion',
                    quantityQuintals: 200,
                },
            };
            const res = createMockRes();

            await create(req, res);

            const updatedWarehouse = await Warehouse.findById(testWarehouse._id);
            expect(updatedWarehouse.usedCapacity).toBe(200);
        });

        it('should create a storage event', async () => {
            const req = {
                user: { _id: testUser._id },
                body: {
                    warehouse: testWarehouse._id.toString(),
                    cropName: 'Onion',
                    quantityQuintals: 100,
                },
            };
            const res = createMockRes();

            await create(req, res);

            const events = await StorageEvent.find({ eventType: 'lot_created' });
            expect(events).toHaveLength(1);
        });
    });

    describe('update', () => {
        it('should update lot successfully', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: { currentCondition: 'watch' },
            };
            const res = createMockRes();

            await update(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.lot.currentCondition).toBe('watch');
        });

        it('should auto-correct status when quantity > 0 but status is dispatched', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 50,
                status: 'dispatched',
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: {},
            };
            const res = createMockRes();

            await update(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.lot.status).toBe('partially_dispatched');
        });

        it('should return 404 when lot not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
                body: { currentCondition: 'watch' },
            };
            const res = createMockRes();

            await update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Lot not found' });
        });
    });

    describe('deleteLot', () => {
        it('should delete lot successfully', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
            };
            const res = createMockRes();

            await deleteLot(req, res);

            expect(res.json).toHaveBeenCalledWith({ message: 'Lot deleted successfully' });

            const deletedLot = await ProduceLot.findById(lot._id);
            expect(deletedLot).toBeNull();
        });

        it('should decrease warehouse usedCapacity', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
            };
            const res = createMockRes();

            await deleteLot(req, res);

            const updatedWarehouse = await Warehouse.findById(testWarehouse._id);
            expect(updatedWarehouse.usedCapacity).toBe(0);
        });

        it('should create deletion event', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
            };
            const res = createMockRes();

            await deleteLot(req, res);

            const events = await StorageEvent.find({ eventType: 'lot_deleted' });
            expect(events).toHaveLength(1);
        });

        it('should return 404 when lot not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
            };
            const res = createMockRes();

            await deleteLot(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Lot not found' });
        });
    });

    describe('getTimeline', () => {
        it('should return storage events for lot', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            await StorageEvent.create({
                lot: lot._id,
                owner: testUser._id,
                eventType: 'inspection_done',
                description: 'Quality check',
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
            };
            const res = createMockRes();

            await getTimeline(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.events).toHaveLength(1);
        });

        it('should return empty array when no events', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
            };
            const res = createMockRes();

            await getTimeline(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.events).toEqual([]);
        });
    });

    describe('addEvent', () => {
        it('should add event to lot', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: {
                    eventType: 'inspection_done',
                    description: 'Quality check passed',
                },
            };
            const res = createMockRes();

            await addEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.event.eventType).toBe('inspection_done');
        });

        it('should default eventType to inspection_done', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: {},
            };
            const res = createMockRes();

            await addEvent(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.event.eventType).toBe('inspection_done');
        });

        it('should return 404 when lot not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
                body: { eventType: 'inspection_done' },
            };
            const res = createMockRes();

            await addEvent(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Lot not found' });
        });
    });

    describe('shiftLot', () => {
        it('should shift lot to another warehouse', async () => {
            const warehouse2 = await Warehouse.create({
                owner: testUser._id,
                name: 'Warehouse 2',
                location: { city: 'Mumbai' },
                capacityQuintals: 1000,
            });

            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: { targetWarehouseId: warehouse2._id.toString() },
            };
            const res = createMockRes();

            await shiftLot(req, res);

            const updatedLot = await ProduceLot.findById(lot._id);
            expect(updatedLot.warehouse.toString()).toBe(warehouse2._id.toString());
        });

        it('should update warehouse capacities', async () => {
            const warehouse2 = await Warehouse.create({
                owner: testUser._id,
                name: 'Warehouse 2',
                location: { city: 'Mumbai' },
                capacityQuintals: 1000,
            });

            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: { targetWarehouseId: warehouse2._id.toString() },
            };
            const res = createMockRes();

            await shiftLot(req, res);

            const oldWh = await Warehouse.findById(testWarehouse._id);
            const newWh = await Warehouse.findById(warehouse2._id);
            expect(oldWh.usedCapacity).toBe(0);
            expect(newWh.usedCapacity).toBe(100);
        });

        it('should return 400 when targetWarehouseId is missing', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: {},
            };
            const res = createMockRes();

            await shiftLot(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Target warehouse ID is required' });
        });

        it('should return 400 when lot is already in target warehouse', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: { targetWarehouseId: testWarehouse._id.toString() },
            };
            const res = createMockRes();

            await shiftLot(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Lot is already in this warehouse' });
        });

        it('should return 400 when not enough capacity in target warehouse', async () => {
            const warehouse2 = await Warehouse.create({
                owner: testUser._id,
                name: 'Warehouse 2',
                location: { city: 'Mumbai' },
                capacityQuintals: 50, // Less than lot quantity
                usedCapacity: 0,
            });

            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: { targetWarehouseId: warehouse2._id.toString() },
            };
            const res = createMockRes();

            await shiftLot(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expect.stringContaining('Not enough capacity') })
            );
        });

        it('should return 404 when target warehouse not found', async () => {
            const lot = await ProduceLot.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                cropName: 'Onion',
                quantityQuintals: 100,
            });

            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: lot._id },
                body: { targetWarehouseId: fakeId.toString() },
            };
            const res = createMockRes();

            await shiftLot(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Target warehouse not found' });
        });
    });
});
