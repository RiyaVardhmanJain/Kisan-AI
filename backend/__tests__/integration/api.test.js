/**
 * Integration Tests: API Endpoints
 * Tests full HTTP request/response cycles with test database.
 * Run: npx jest __tests__/integration/api.test.js --verbose
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

const TEST_SECRET = 'test_jwt_secret_integration';

// Setup test app
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

    // Register a test user and get auth token
    const User = require('../../models/User');
    const user = await User.create({
        name: 'Integration Test User',
        phone: '9123456789',
        passwordHash: 'testpassword123',
    });
    testUserId = user._id;

    authToken = jwt.sign({ id: testUserId.toString() }, TEST_SECRET, { expiresIn: '1h' });
});

afterEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
});

describe('API Integration Tests', () => {
    describe('Health Check', () => {
        it('should return health status', async () => {
            const res = await request(app).get('/api/health');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.timestamp).toBeDefined();
        });
    });

    describe('Authentication Flow', () => {
        describe('POST /api/auth/register', () => {
            it('should register a new user', async () => {
                const res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'New User',
                        phone: '9988776655',
                        password: 'securepassword',
                    });

                expect(res.status).toBe(201);
                expect(res.body).toHaveProperty('token');
                expect(res.body).toHaveProperty('user');
                expect(res.body.user.name).toBe('New User');
                expect(res.body.user.passwordHash).toBeUndefined();
            });

            it('should reject duplicate phone number', async () => {
                // First registration
                await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'First User',
                        phone: '9111222333',
                        password: 'password',
                    });

                // Duplicate registration
                const res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Second User',
                        phone: '9111222333',
                        password: 'password',
                    });

                expect(res.status).toBe(400);
                expect(res.body.error).toBe('Phone number already registered');
            });
        });

        describe('POST /api/auth/login', () => {
            beforeEach(async () => {
                await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Login User',
                        phone: '9444555666',
                        password: 'loginpassword',
                    });
            });

            it('should login with valid credentials', async () => {
                const res = await request(app)
                    .post('/api/auth/login')
                    .send({
                        phone: '9444555666',
                        password: 'loginpassword',
                    });

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('token');
                expect(res.body).toHaveProperty('user');
            });

            it('should reject invalid credentials', async () => {
                const res = await request(app)
                    .post('/api/auth/login')
                    .send({
                        phone: '9444555666',
                        password: 'wrongpassword',
                    });

                expect(res.status).toBe(401);
                expect(res.body.error).toBe('Invalid phone or password');
            });
        });

        describe('GET /api/auth/me', () => {
            it('should return user profile with valid token', async () => {
                const res = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body).toHaveProperty('user');
                expect(res.body.user.name).toBe('Integration Test User');
            });

            it('should reject request without token', async () => {
                const res = await request(app).get('/api/auth/me');

                expect(res.status).toBe(401);
                expect(res.body.error).toBe('Not authorized — no token');
            });

            it('should reject request with invalid token', async () => {
                const res = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', 'Bearer invalid.token');

                expect(res.status).toBe(401);
                expect(res.body.error).toBe('Token invalid or expired');
            });
        });
    });

    describe('Warehouse CRUD', () => {
        describe('POST /api/warehouses', () => {
            it('should create a warehouse', async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Warehouse',
                        location: { city: 'Pune', address: 'MIDC Area' },
                        type: 'cold_storage',
                        capacityQuintals: 1000,
                    });

                expect(res.status).toBe(201);
                expect(res.body.warehouse.name).toBe('Test Warehouse');
                expect(res.body.warehouse.type).toBe('cold_storage');
            });

            it('should reject unauthenticated request', async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .send({
                        name: 'Test Warehouse',
                        location: { city: 'Pune' },
                        capacityQuintals: 1000,
                    });

                expect(res.status).toBe(401);
            });
        });

        describe('GET /api/warehouses', () => {
            beforeEach(async () => {
                await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Warehouse 1',
                        location: { city: 'Pune' },
                        capacityQuintals: 500,
                    });
            });

            it('should list user warehouses', async () => {
                const res = await request(app)
                    .get('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body.warehouses).toHaveLength(1);
                expect(res.body.warehouses[0].name).toBe('Warehouse 1');
            });
        });

        describe('PUT /api/warehouses/:id', () => {
            let warehouseId;

            beforeEach(async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Update Test',
                        location: { city: 'Pune' },
                        capacityQuintals: 500,
                    });
                warehouseId = res.body.warehouse._id;
            });

            it('should update warehouse', async () => {
                const res = await request(app)
                    .put(`/api/warehouses/${warehouseId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ name: 'Updated Name' });

                expect(res.status).toBe(200);
                expect(res.body.warehouse.name).toBe('Updated Name');
            });
        });

        describe('DELETE /api/warehouses/:id', () => {
            let warehouseId;

            beforeEach(async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Delete Test',
                        location: { city: 'Pune' },
                        capacityQuintals: 500,
                    });
                warehouseId = res.body.warehouse._id;
            });

            it('should soft delete warehouse', async () => {
                const res = await request(app)
                    .delete(`/api/warehouses/${warehouseId}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body.message).toBe('Warehouse deactivated');
                expect(res.body.warehouse.isActive).toBe(false);
            });
        });
    });

    describe('Lot CRUD', () => {
        let warehouseId;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Lot Test Warehouse',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                });
            warehouseId = res.body.warehouse._id;
        });

        describe('POST /api/lots', () => {
            it('should create a lot', async () => {
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: warehouseId,
                        cropName: 'Onion',
                        quantityQuintals: 100,
                    });

                expect(res.status).toBe(201);
                expect(res.body.lot.cropName).toBe('Onion');
                expect(res.body.lot.quantityQuintals).toBe(100);
                expect(res.body.lot.lotId).toMatch(/^LOT-2026-\d{4}$/);
            });

            it('should merge duplicate lots', async () => {
                // Create first lot
                await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: warehouseId,
                        cropName: 'Onion',
                        quantityQuintals: 50,
                    });

                // Create duplicate lot
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: warehouseId,
                        cropName: 'Onion',
                        quantityQuintals: 50,
                    });

                expect(res.status).toBe(200);
                expect(res.body.merged).toBe(true);
                expect(res.body.lot.quantityQuintals).toBe(100);
            });
        });

        describe('GET /api/lots', () => {
            beforeEach(async () => {
                await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: warehouseId,
                        cropName: 'Onion',
                        quantityQuintals: 100,
                    });
            });

            it('should list lots', async () => {
                const res = await request(app)
                    .get('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body.lots).toHaveLength(1);
            });

            it('should filter by warehouseId', async () => {
                const res = await request(app)
                    .get(`/api/lots?warehouseId=${warehouseId}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body.lots.length).toBeGreaterThan(0);
            });
        });

        describe('PUT /api/lots/:id', () => {
            let lotId;

            beforeEach(async () => {
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: warehouseId,
                        cropName: 'Onion',
                        quantityQuintals: 100,
                    });
                lotId = res.body.lot._id;
            });

            it('should update lot condition', async () => {
                const res = await request(app)
                    .put(`/api/lots/${lotId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ currentCondition: 'watch' });

                expect(res.status).toBe(200);
                expect(res.body.lot.currentCondition).toBe('watch');
            });
        });

        describe('DELETE /api/lots/:id', () => {
            let lotId;

            beforeEach(async () => {
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: warehouseId,
                        cropName: 'Onion',
                        quantityQuintals: 100,
                    });
                lotId = res.body.lot._id;
            });

            it('should delete lot', async () => {
                const res = await request(app)
                    .delete(`/api/lots/${lotId}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body.message).toBe('Lot deleted successfully');
            });
        });
    });

    describe('Alerts', () => {
        let warehouseId;
        let lotId;

        beforeEach(async () => {
            const whRes = await request(app)
                .post('/api/warehouses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Alert Test Warehouse',
                    location: { city: 'Pune' },
                    capacityQuintals: 1000,
                });
            warehouseId = whRes.body.warehouse._id;

            const lotRes = await request(app)
                .post('/api/lots')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    warehouse: warehouseId,
                    cropName: 'Onion',
                    quantityQuintals: 100,
                });
            lotId = lotRes.body.lot._id;
        });

        describe('GET /api/alerts', () => {
            it('should return empty alerts list', async () => {
                const res = await request(app)
                    .get('/api/alerts')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.status).toBe(200);
                expect(res.body.alerts).toEqual([]);
            });
        });
    });
});
