/**
 * Unit Tests: Alert Controller
 * Tests getAll, markRead, and resolve handlers.
 * Run: npx jest __tests__/controllers/alertController.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Alert = require('../../models/Alert');
const Warehouse = require('../../models/Warehouse');
const ProduceLot = require('../../models/ProduceLot');
const { getAll, markRead, resolve } = require('../../controllers/alertController');

let mongoServer;
let testUser;
let testWarehouse;
let testLot;

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

    testLot = await ProduceLot.create({
        owner: testUser._id,
        warehouse: testWarehouse._id,
        cropName: 'Onion',
        quantityQuintals: 100,
    });
});

afterEach(async () => {
    await Alert.deleteMany({});
    jest.clearAllMocks();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Alert Controller', () => {
    describe('getAll', () => {
        it('should return all alerts for user', async () => {
            await Alert.create([
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    alertType: 'spoilage_risk',
                    message: 'Alert 1',
                },
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    alertType: 'humidity_breach',
                    message: 'Alert 2',
                },
            ]);

            const req = { user: { _id: testUser._id }, query: {} };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alerts).toHaveLength(2);
        });

        it('should filter unread alerts when unreadOnly=true', async () => {
            await Alert.create([
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    alertType: 'spoilage_risk',
                    message: 'Unread Alert',
                    isRead: false,
                },
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    alertType: 'humidity_breach',
                    message: 'Read Alert',
                    isRead: true,
                },
            ]);

            const req = {
                user: { _id: testUser._id },
                query: { unreadOnly: 'true' },
            };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alerts).toHaveLength(1);
            expect(responseData.alerts[0].isRead).toBe(false);
        });

        it('should populate lot information', async () => {
            await Alert.create({
                owner: testUser._id,
                lot: testLot._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Alert with lot',
            });

            const req = { user: { _id: testUser._id }, query: {} };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alerts[0].lot).toBeDefined();
            expect(responseData.alerts[0].lot.cropName).toBe('Onion');
        });

        it('should populate warehouse information', async () => {
            await Alert.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Alert with warehouse',
            });

            const req = { user: { _id: testUser._id }, query: {} };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alerts[0].warehouse).toBeDefined();
            expect(responseData.alerts[0].warehouse.name).toBe('Test Warehouse');
        });

        it('should not return alerts belonging to other users', async () => {
            const OtherUser = require('../../models/User');
            const otherUser = await OtherUser.create({
                name: 'Other User',
                phone: '8888888888',
                passwordHash: 'password123',
            });

            await Alert.create({
                owner: otherUser._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Other user alert',
            });

            const req = { user: { _id: testUser._id }, query: {} };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alerts).toHaveLength(0);
        });

        it('should sort by triggeredAt descending', async () => {
            const oldDate = new Date('2025-01-01');
            const newDate = new Date('2026-01-01');

            await Alert.create([
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    alertType: 'spoilage_risk',
                    message: 'Old Alert',
                    triggeredAt: oldDate,
                },
                {
                    owner: testUser._id,
                    warehouse: testWarehouse._id,
                    alertType: 'humidity_breach',
                    message: 'New Alert',
                    triggeredAt: newDate,
                },
            ]);

            const req = { user: { _id: testUser._id }, query: {} };
            const res = createMockRes();

            await getAll(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alerts[0].message).toBe('New Alert');
            expect(responseData.alerts[1].message).toBe('Old Alert');
        });
    });

    describe('markRead', () => {
        it('should mark alert as read', async () => {
            const alert = await Alert.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Test Alert',
                isRead: false,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: alert._id },
            };
            const res = createMockRes();

            await markRead(req, res);

            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alert.isRead).toBe(true);
        });

        it('should return 404 when alert not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
            };
            const res = createMockRes();

            await markRead(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Alert not found' });
        });

        it('should return 404 when alert belongs to another user', async () => {
            const OtherUser = require('../../models/User');
            const otherUser = await OtherUser.create({
                name: 'Other User',
                phone: '8888888888',
                passwordHash: 'password123',
            });

            const alert = await Alert.create({
                owner: otherUser._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Other user alert',
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: alert._id },
            };
            const res = createMockRes();

            await markRead(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('resolve', () => {
        it('should resolve alert with actionTaken', async () => {
            const alert = await Alert.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Test Alert',
                isRead: false,
                isResolved: false,
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: alert._id },
                body: { actionTaken: 'Moved to cold storage' },
            };
            const res = createMockRes();

            await resolve(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alert.isRead).toBe(true);
            expect(responseData.alert.isResolved).toBe(true);
            expect(responseData.alert.actionTaken).toBe('Moved to cold storage');
            expect(responseData.alert.resolvedAt).toBeDefined();
        });

        it('should handle empty actionTaken', async () => {
            const alert = await Alert.create({
                owner: testUser._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Test Alert',
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: alert._id },
                body: {},
            };
            const res = createMockRes();

            await resolve(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alert.actionTaken).toBe('');
        });

        it('should return 404 when alert not found', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const req = {
                user: { _id: testUser._id },
                params: { id: fakeId },
                body: { actionTaken: 'Fixed' },
            };
            const res = createMockRes();

            await resolve(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Alert not found' });
        });

        it('should return 404 when alert belongs to another user', async () => {
            const OtherUser = require('../../models/User');
            const otherUser = await OtherUser.create({
                name: 'Other User',
                phone: '8888888888',
                passwordHash: 'password123',
            });

            const alert = await Alert.create({
                owner: otherUser._id,
                warehouse: testWarehouse._id,
                alertType: 'spoilage_risk',
                message: 'Other user alert',
            });

            const req = {
                user: { _id: testUser._id },
                params: { id: alert._id },
                body: { actionTaken: 'Fixed' },
            };
            const res = createMockRes();

            await resolve(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
