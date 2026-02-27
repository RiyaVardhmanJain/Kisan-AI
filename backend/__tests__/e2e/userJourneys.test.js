/**
 * End-to-End Tests: User Journeys
 * Tests complete user workflows from registration to alert management.
 * Run: npx jest __tests__/e2e/userJourneys.test.js --verbose
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const jwt = require('jsonwebtoken');

// Import app modules
const authRoutes = require('../../routes/authRoutes');
const warehouseRoutes = require('../../routes/warehouseRoutes');
const lotRoutes = require('../../routes/lotRoutes');
const alertRoutes = require('../../routes/alertRoutes');
const chatbotRoutes = require('../../routes/chatbotRoutes');

let app;
let mongoServer;
let authToken;
let testUserId;

const TEST_SECRET = 'test_jwt_secret_e2e';

jest.setTimeout(60000);

const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/warehouses', warehouseRoutes);
    app.use('/api/lots', lotRoutes);
    app.use('/api/alerts', alertRoutes);
    app.use('/api/chatbot', chatbotRoutes);
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    return app;
};

beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    app = setupApp();
}, 60000);

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}, 30000);

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    delete process.env.JWT_SECRET;
}, 30000);

describe('E2E User Journeys', () => {
    describe('Complete Farmer Onboarding Flow', () => {
        let userId, token;

        it('should complete full onboarding: register → login → create warehouse → create lot', async () => {
            // Step 1: Register
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Farmer Rao',
                    phone: '9000000001',
                    password: 'farmer123',
                    email: 'rao@example.com',
                    location: { state: 'Maharashtra', district: 'Nashik' },
                });

            expect(registerRes.status).toBe(201);
            expect(registerRes.body.user.name).toBe('Farmer Rao');
            token = registerRes.body.token;
            userId = registerRes.body.user._id;

            // Step 2: Verify login works
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    phone: '9000000001',
                    password: 'farmer123',
                });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.user.name).toBe('Farmer Rao');

            // Step 3: Get profile
            const profileRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(profileRes.status).toBe(200);
            expect(profileRes.body.user.email).toBe('rao@example.com');

            // Step 4: Create warehouse
            const warehouseRes = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Nashik Cold Storage',
                    location: { city: 'Nashik', address: 'MIDC Area' },
                    type: 'cold_storage',
                    capacityQuintals: 2000,
                });

            expect(warehouseRes.status).toBe(201);
            expect(warehouseRes.body.warehouse.name).toBe('Nashik Cold Storage');
            const warehouseId = warehouseRes.body.warehouse._id;

            // Step 5: Create first lot
            const lot1Res = await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    warehouse: warehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 500,
                    source: 'Farm A, Nashik',
                });

            expect(lot1Res.status).toBe(201);
            expect(lot1Res.body.lot.cropName).toBe('Onion');
            expect(lot1Res.body.lot.lotId).toMatch(/^LOT-2026-\d{4}$/);

            // Step 6: Create second lot
            const lot2Res = await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    warehouse: warehouseId,
                    cropName: 'Potato',
                    quantityQuintals: 300,
                });

            expect(lot2Res.status).toBe(201);
            expect(lot2Res.body.lot.cropName).toBe('Potato');

            // Step 7: Verify warehouse capacity updated
            const warehouseCheckRes = await request(app)
                .get('/api/warehouses')
                .set('Authorization', `Bearer ${token}`);

            expect(warehouseCheckRes.body.warehouses[0].usedCapacity).toBe(800); // 500 + 300

            // Step 8: List all lots
            const lotsRes = await request(app)
                .get('/api/lots')
                .set('Authorization', `Bearer ${token}`);

            expect(lotsRes.status).toBe(200);
            expect(lotsRes.body.lots).toHaveLength(2);
        });
    });

    describe('Lot Management Workflow', () => {
        let token, warehouseId, lotId;

        beforeEach(async () => {
            // Register and login
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Lot Manager',
                    phone: '9000000002',
                    password: 'manager123',
                });
            token = registerRes.body.token;

            // Create warehouse
            const warehouseRes = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Warehouse',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                });
            warehouseId = warehouseRes.body.warehouse._id;
        });

        it('should complete lot lifecycle: create → update → shift → delete', async () => {
            // Create lot
            const createRes = await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    warehouse: warehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 200,
                });

            lotId = createRes.body.lot._id;
            expect(createRes.body.lot.quantityQuintals).toBe(200);

            // Update lot condition
            const updateRes = await request(app)
                .put(`/api/lots/${lotId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ currentCondition: 'watch' });

            expect(updateRes.body.lot.currentCondition).toBe('watch');

            // Create second warehouse for shifting
            const warehouse2Res = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Warehouse 2',
                    location: { city: 'Mumbai' },
                    capacityQuintals: 500,
                });

            // Shift lot to new warehouse
            const shiftRes = await request(app)
                .put(`/api/lots/${lotId}/shift`)
                .set('Authorization', `Bearer ${token}`)
                .send({ targetWarehouseId: warehouse2Res.body.warehouse._id });

            expect(shiftRes.status).toBe(200);
            expect(shiftRes.body.message).toContain('shifted');

            // Get timeline
            const timelineRes = await request(app)
                .get(`/api/lots/${lotId}/timeline`)
                .set('Authorization', `Bearer ${token}`);

            expect(timelineRes.status).toBe(200);
            expect(timelineRes.body.events.length).toBeGreaterThan(0);

            // Delete lot
            const deleteRes = await request(app)
                .delete(`/api/lots/${lotId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.message).toBe('Lot deleted successfully');
        });

        it('should merge duplicate lots correctly', async () => {
            // Create first Onion lot
            const lot1Res = await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    warehouse: warehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 100,
                });

            expect(lot1Res.body.lot.quantityQuintals).toBe(100);
            const lotId1 = lot1Res.body.lot._id;

            // Create duplicate Onion lot (should merge)
            const lot2Res = await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    warehouse: warehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 50,
                });

            expect(lot2Res.status).toBe(200);
            expect(lot2Res.body.merged).toBe(true);
            expect(lot2Res.body.lot.quantityQuintals).toBe(150); // 100 + 50
            expect(lot2Res.body.lot._id).toBe(lotId1); // Same lot ID

            // Verify only one lot exists
            const lotsRes = await request(app)
                .get('/api/lots')
                .set('Authorization', `Bearer ${token}`);

            expect(lotsRes.body.lots).toHaveLength(1);
        });
    });

    describe('Warehouse Management Workflow', () => {
        let token;

        beforeEach(async () => {
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Warehouse Manager',
                    phone: '9000000003',
                    password: 'manager123',
                });
            token = registerRes.body.token;
        });

        it('should manage multiple warehouses', async () => {
            // Create first warehouse
            const wh1Res = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Pune Storage',
                    location: { city: 'Pune' },
                    type: 'dry',
                    capacityQuintals: 1000,
                });

            // Create second warehouse
            const wh2Res = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Mumbai Cold Storage',
                    location: { city: 'Mumbai' },
                    type: 'cold_storage',
                    capacityQuintals: 2000,
                });

            // List warehouses
            const listRes = await request(app)
                .get('/api/warehouses')
                .set('Authorization', `Bearer ${token}`);

            expect(listRes.body.warehouses).toHaveLength(2);

            // Update first warehouse
            const updateRes = await request(app)
                .put(`/api/warehouses/${wh1Res.body.warehouse._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Pune Storage Updated' });

            expect(updateRes.body.warehouse.name).toBe('Pune Storage Updated');

            // Soft delete second warehouse
            const deleteRes = await request(app)
                .delete(`/api/warehouses/${wh2Res.body.warehouse._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(deleteRes.body.warehouse.isActive).toBe(false);

            // Verify only active warehouse is listed
            const finalListRes = await request(app)
                .get('/api/warehouses')
                .set('Authorization', `Bearer ${token}`);

            expect(finalListRes.body.warehouses).toHaveLength(1);
            expect(finalListRes.body.warehouses[0].name).toBe('Pune Storage Updated');
        });
    });

    describe('Chatbot Conversation Flow', () => {
        let token, warehouseId;

        beforeEach(async () => {
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Chatbot User',
                    phone: '9000000004',
                    password: 'chat123',
                });
            token = registerRes.body.token;

            const warehouseRes = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Warehouse',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                });
            warehouseId = warehouseRes.body.warehouse._id;
        });

        it('should handle chatbot view intents', async () => {
            // Create a lot first
            await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    warehouse: warehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 100,
                });

            // Test view_lots intent
            const viewLotsRes = await request(app)
                .post('/api/chatbot/context')
                .set('Authorization', `Bearer ${token}`)
                .send({ message: 'Show my stored crops' });

            expect(viewLotsRes.status).toBe(200);
            expect(viewLotsRes.body.intent).toBe('view_lots');
            expect(viewLotsRes.body.context).toContain('Onion');

            // Test view_warehouses intent
            const viewWhRes = await request(app)
                .post('/api/chatbot/context')
                .set('Authorization', `Bearer ${token}`)
                .send({ message: 'Show my warehouses' });

            expect(viewWhRes.status).toBe(200);
            expect(viewWhRes.body.intent).toBe('view_warehouses');
        });

        it('should handle chatbot mutation flow with consent', async () => {
            // Step 1: User requests to add a lot
            const addLotRes = await request(app)
                .post('/api/chatbot/context')
                .set('Authorization', `Bearer ${token}`)
                .send({ message: 'Add 200 quintals of Onion to my warehouse' });

            expect(addLotRes.status).toBe(200);
            expect(addLotRes.body.intent).toBe('add_lot');
            expect(addLotRes.body.requiresConsent).toBe(true);

            // Step 2: User confirms
            const confirmRes = await request(app)
                .post('/api/chatbot/context')
                .set('Authorization', `Bearer ${token}`)
                .send({ message: 'yes' });

            expect(confirmRes.status).toBe(200);
            expect(confirmRes.body.success).toBe(true);

            // Step 3: Verify lot was created
            const lotsRes = await request(app)
                .get('/api/lots')
                .set('Authorization', `Bearer ${token}`);

            expect(lotsRes.body.lots).toHaveLength(1);
            expect(lotsRes.body.lots[0].cropName).toBe('Onion');
            expect(lotsRes.body.lots[0].quantityQuintals).toBe(200);
        });
    });

    describe('Multi-User Isolation', () => {
        let user1Token, user2Token, user1WarehouseId, user2WarehouseId;

        beforeEach(async () => {
            // Register user 1
            const user1Res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'User 1',
                    phone: '9000000010',
                    password: 'user1pass',
                });
            user1Token = user1Res.body.token;

            // Register user 2
            const user2Res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'User 2',
                    phone: '9000000020',
                    password: 'user2pass',
                });
            user2Token = user2Res.body.token;

            // User 1 creates warehouse
            const wh1Res = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    name: 'User 1 Warehouse',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                });
            user1WarehouseId = wh1Res.body.warehouse._id;

            // User 2 creates warehouse
            const wh2Res = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    name: 'User 2 Warehouse',
                    location: { city: 'Mumbai' },
                    capacityQuintals: 500,
                });
            user2WarehouseId = wh2Res.body.warehouse._id;
        });

        it('should isolate data between users', async () => {
            // User 1 creates lot
            await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    warehouse: user1WarehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 100,
                });

            // User 2 creates lot
            await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({
                    warehouse: user2WarehouseId,
                    cropName: 'Potato',
                    quantityQuintals: 200,
                });

            // User 1 should only see their lot
            const user1LotsRes = await request(app)
                .get('/api/lots')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(user1LotsRes.body.lots).toHaveLength(1);
            expect(user1LotsRes.body.lots[0].cropName).toBe('Onion');

            // User 2 should only see their lot
            const user2LotsRes = await request(app)
                .get('/api/lots')
                .set('Authorization', `Bearer ${user2Token}`);

            expect(user2LotsRes.body.lots).toHaveLength(1);
            expect(user2LotsRes.body.lots[0].cropName).toBe('Potato');

            // User 1 cannot access User 2's warehouse
            const forbiddenRes = await request(app)
                .put(`/api/warehouses/${user2WarehouseId}`)
                .set('Authorization', `Bearer ${user1Token}`)
                .send({ name: 'Hacked Name' });

            expect(forbiddenRes.status).toBe(404);
        });
    });
});
