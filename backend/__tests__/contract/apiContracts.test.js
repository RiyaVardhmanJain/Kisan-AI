/**
 * Contract Tests: API Request/Response Contracts
 * Tests API contract compliance and data shapes.
 * Run: npx jest __tests__/contract/apiContracts.test.js --verbose
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const jwt = require('jsonwebtoken');

const authRoutes = require('../../routes/authRoutes');
const warehouseRoutes = require('../../routes/warehouseRoutes');
const lotRoutes = require('../../routes/lotRoutes');
const alertRoutes = require('../../routes/alertRoutes');

let app;
let mongoServer;
let authToken;
let testUserId;
const TEST_SECRET = 'test_jwt_secret_contract';

const setupApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/warehouses', warehouseRoutes);
    app.use('/api/lots', lotRoutes);
    app.use('/api/alerts', alertRoutes);
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    return app;
};

beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = setupApp();

    const User = require('../../models/User');
    const user = await User.create({
        name: 'Contract Test User',
        phone: '9555666777',
        passwordHash: 'password123',
    });
    testUserId = user._id;
    authToken = jwt.sign({ id: testUserId.toString() }, TEST_SECRET, { expiresIn: '1h' });
});

afterEach(async () => {
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

describe('API Contract Tests', () => {
    describe('Response Shape Contracts', () => {
        describe('Health Check Contract', () => {
            it('should match health response contract', async () => {
                const res = await request(app).get('/api/health');

                expect(res.body).toMatchObject({
                    status: expect.any(String),
                    timestamp: expect.any(String),
                });
            });
        });

        describe('Auth Contract', () => {
            it('register response should match contract', async () => {
                const res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Contract User',
                        phone: '9111222333',
                        password: 'password',
                    });

                expect(res.body).toMatchObject({
                    token: expect.any(String),
                    user: {
                        _id: expect.any(String),
                        name: expect.any(String),
                        phone: expect.any(String),
                        email: expect.any(String),
                        location: expect.any(Object),
                        createdAt: expect.any(String),
                    },
                });
            });

            it('login response should match contract', async () => {
                await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Login User',
                        phone: '9222333444',
                        password: 'password',
                    });

                const res = await request(app)
                    .post('/api/auth/login')
                    .send({
                        phone: '9222333444',
                        password: 'password',
                    });

                expect(res.body).toMatchObject({
                    token: expect.any(String),
                    user: expect.any(Object),
                });
            });

            it('me response should match contract', async () => {
                const res = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.body).toMatchObject({
                    user: {
                        _id: expect.any(String),
                        name: expect.any(String),
                        phone: expect.any(String),
                    },
                });
            });
        });

        describe('Warehouse Contract', () => {
            it('create warehouse response should match contract', async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Contract Warehouse',
                        location: { city: 'Pune' },
                        capacityQuintals: 1000,
                    });

                expect(res.body).toMatchObject({
                    warehouse: {
                        _id: expect.any(String),
                        owner: expect.any(String),
                        name: expect.any(String),
                        location: {
                            city: expect.any(String),
                            address: expect.any(String),
                        },
                        type: expect.any(String),
                        capacityQuintals: expect.any(Number),
                        usedCapacity: expect.any(Number),
                        isActive: expect.any(Boolean),
                        createdAt: expect.any(String),
                    },
                });
            });

            it('list warehouses response should match contract', async () => {
                const res = await request(app)
                    .get('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.body).toMatchObject({
                    warehouses: expect.any(Array),
                });
            });
        });

        describe('Lot Contract', () => {
            let warehouseId;

            beforeEach(async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Warehouse',
                        location: { city: 'Pune' },
                        capacityQuintals: 1000,
                    });
                warehouseId = res.body.warehouse._id;
            });

            it('create lot response should match contract', async () => {
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: warehouseId,
                        cropName: 'Onion',
                        quantityQuintals: 100,
                    });

                expect(res.body).toMatchObject({
                    lot: {
                        _id: expect.any(String),
                        lotId: expect.any(String),
                        owner: expect.any(String),
                        warehouse: expect.any(Object),
                        cropName: expect.any(String),
                        quantityQuintals: expect.any(Number),
                        entryDate: expect.any(String),
                        currentCondition: expect.any(String),
                        status: expect.any(String),
                        createdAt: expect.any(String),
                    },
                });
            });

            it('list lots response should match contract', async () => {
                const res = await request(app)
                    .get('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`);

                expect(res.body).toMatchObject({
                    lots: expect.any(Array),
                });
            });
        });
    });

    describe('Error Response Contracts', () => {
        it('should return standard error shape for 400', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({}); // Missing required fields

            expect(res.status).toBe(400);
            expect(res.body).toMatchObject({
                error: expect.any(String),
            });
        });

        it('should return standard error shape for 401', async () => {
            const res = await request(app)
                .get('/api/auth/me'); // No token

            expect(res.status).toBe(401);
            expect(res.body).toMatchObject({
                error: expect.any(String),
            });
        });

        it('should return standard error shape for 404', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .put(`/api/warehouses/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated' });

            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                error: expect.any(String),
            });
        });
    });

    describe('Request Validation Contracts', () => {
        describe('Auth Request Validation', () => {
            it('register should reject missing name', async () => {
                const res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        phone: '9000000000',
                        password: 'password',
                    });

                expect(res.status).toBe(400);
            });

            it('register should reject missing phone', async () => {
                const res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test',
                        password: 'password',
                    });

                expect(res.status).toBe(400);
            });

            it('login should reject missing credentials', async () => {
                const res = await request(app)
                    .post('/api/auth/login')
                    .send({});

                expect(res.status).toBe(400);
            });
        });

        describe('Warehouse Request Validation', () => {
            it('create should reject missing name', async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        location: { city: 'Pune' },
                        capacityQuintals: 1000,
                    });

                expect(res.status).toBe(400);
            });

            it('create should reject missing city', async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Warehouse',
                        location: {},
                        capacityQuintals: 1000,
                    });

                expect(res.status).toBe(400);
            });

            it('create should reject invalid capacity', async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Warehouse',
                        location: { city: 'Pune' },
                        capacityQuintals: 0,
                    });

                expect(res.status).toBe(400);
            });
        });

        describe('Lot Request Validation', () => {
            it('create should reject missing warehouse', async () => {
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        cropName: 'Onion',
                        quantityQuintals: 100,
                    });

                expect(res.status).toBe(400);
            });

            it('create should reject missing cropName', async () => {
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: '507f1f77bcf86cd799439011',
                        quantityQuintals: 100,
                    });

                expect(res.status).toBe(400);
            });

            it('create should reject missing quantity', async () => {
                const res = await request(app)
                    .post('/api/lots')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        warehouse: '507f1f77bcf86cd799439011',
                        cropName: 'Onion',
                    });

                expect(res.status).toBe(400);
            });
        });
    });

    describe('Enum Value Contracts', () => {
        describe('Warehouse Type Enum', () => {
            it('should accept valid warehouse types', async () => {
                const types = ['dry', 'cold_storage', 'ventilated'];

                for (const type of types) {
                    const res = await request(app)
                        .post('/api/warehouses')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                            name: `Type ${type}`,
                            location: { city: 'Pune' },
                            type,
                            capacityQuintals: 1000,
                        });

                    expect(res.status).toBe(201);
                    expect(res.body.warehouse.type).toBe(type);
                }
            });
        });

        describe('Lot Status/Condition Enums', () => {
            let warehouseId;

            beforeEach(async () => {
                const res = await request(app)
                    .post('/api/warehouses')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Enum Test',
                        location: { city: 'Pune' },
                        capacityQuintals: 1000,
                    });
                warehouseId = res.body.warehouse._id;
            });

            it('should accept valid status values', async () => {
                const statuses = ['stored', 'partially_dispatched', 'dispatched', 'sold'];

                for (const status of statuses) {
                    const res = await request(app)
                        .post('/api/lots')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                            warehouse: warehouseId,
                            cropName: 'Onion',
                            quantityQuintals: 100,
                            status,
                        });

                    expect(res.status).toBe(201);
                    expect(res.body.lot.status).toBe(status);
                }
            });

            it('should accept valid condition values', async () => {
                const conditions = ['good', 'watch', 'at_risk', 'spoiled'];

                for (const condition of conditions) {
                    const res = await request(app)
                        .post('/api/lots')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                            warehouse: warehouseId,
                            cropName: 'Onion',
                            quantityQuintals: 100,
                            currentCondition: condition,
                        });

                    expect(res.status).toBe(201);
                    expect(res.body.lot.currentCondition).toBe(condition);
                }
            });
        });
    });
});
