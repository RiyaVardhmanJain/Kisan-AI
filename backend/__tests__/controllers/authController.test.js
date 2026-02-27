/**
 * Unit Tests: Auth Controller
 * Tests register, login, and getMe handlers.
 * Run: npx jest __tests__/controllers/authController.test.js --verbose
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const { register, login, getMe } = require('../../controllers/authController');

let mongoServer;
const TEST_SECRET = 'test_jwt_secret_controller';

// Mock response
const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
});

describe('Auth Controller', () => {
    describe('register', () => {
        it('should register a new user successfully', async () => {
            const req = {
                body: {
                    name: 'Rajesh Kumar',
                    phone: '9876543210',
                    password: 'password123',
                    email: 'rajesh@example.com',
                    location: { state: 'Maharashtra', district: 'Pune' },
                },
            };
            const res = createMockRes();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData).toHaveProperty('token');
            expect(responseData).toHaveProperty('user');
            expect(responseData.user.name).toBe('Rajesh Kumar');
            expect(responseData.user.phone).toBe('9876543210');
            expect(responseData.user.passwordHash).toBeUndefined();
        });

        it('should return 400 when name is missing', async () => {
            const req = {
                body: {
                    phone: '9876543210',
                    password: 'password123',
                },
            };
            const res = createMockRes();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Name, phone, and password are required' });
        });

        it('should return 400 when phone is missing', async () => {
            const req = {
                body: {
                    name: 'Rajesh Kumar',
                    password: 'password123',
                },
            };
            const res = createMockRes();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Name, phone, and password are required' });
        });

        it('should return 400 when password is missing', async () => {
            const req = {
                body: {
                    name: 'Rajesh Kumar',
                    phone: '9876543210',
                },
            };
            const res = createMockRes();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Name, phone, and password are required' });
        });

        it('should return 400 when phone number already exists', async () => {
            await User.create({
                name: 'Existing User',
                phone: '9876543210',
                passwordHash: 'password123',
            });

            const req = {
                body: {
                    name: 'New User',
                    phone: '9876543210',
                    password: 'password456',
                },
            };
            const res = createMockRes();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Phone number already registered' });
        });

        it('should hash password before saving', async () => {
            const req = {
                body: {
                    name: 'Test User',
                    phone: '9999999999',
                    password: 'plainPassword',
                },
            };
            const res = createMockRes();

            await register(req, res);

            const user = await User.findOne({ phone: '9999999999' });
            expect(user.passwordHash).not.toBe('plainPassword');
            expect(user.passwordHash).toMatch(/^\$2[ayb]?\$\d+\$/);
        });

        it('should accept optional email and location', async () => {
            const req = {
                body: {
                    name: 'Test User',
                    phone: '9999999998',
                    password: 'password123',
                },
            };
            const res = createMockRes();

            await register(req, res);

            const user = await User.findOne({ phone: '9999999998' });
            expect(user.email).toBe('');
            expect(user.location.state).toBe('');
        });
    });

    describe('login', () => {
        beforeEach(async () => {
            await User.create({
                name: 'Test User',
                phone: '9876543210',
                passwordHash: 'password123', // Will be hashed by hook
            });
        });

        it('should login with valid credentials', async () => {
            const req = {
                body: {
                    phone: '9876543210',
                    password: 'password123',
                },
            };
            const res = createMockRes();

            await login(req, res);

            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];
            expect(responseData).toHaveProperty('token');
            expect(responseData).toHaveProperty('user');
            expect(responseData.user.name).toBe('Test User');
        });

        it('should return 400 when phone is missing', async () => {
            const req = {
                body: {
                    password: 'password123',
                },
            };
            const res = createMockRes();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Phone and password are required' });
        });

        it('should return 400 when password is missing', async () => {
            const req = {
                body: {
                    phone: '9876543210',
                },
            };
            const res = createMockRes();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Phone and password are required' });
        });

        it('should return 401 for invalid phone', async () => {
            const req = {
                body: {
                    phone: '0000000000',
                    password: 'password123',
                },
            };
            const res = createMockRes();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid phone or password' });
        });

        it('should return 401 for invalid password', async () => {
            const req = {
                body: {
                    phone: '9876543210',
                    password: 'wrongpassword',
                },
            };
            const res = createMockRes();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid phone or password' });
        });
    });

    describe('getMe', () => {
        it('should return current user profile', async () => {
            const user = await User.create({
                name: 'Test User',
                phone: '9876543210',
                passwordHash: 'password123',
            });

            const req = {
                user: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                },
            };
            const res = createMockRes();

            await getMe(req, res);

            expect(res.json).toHaveBeenCalledWith({ user: req.user });
        });

        it('should not include passwordHash in response', async () => {
            const user = await User.create({
                name: 'Test User',
                phone: '9876543210',
                passwordHash: 'password123',
            });

            const req = {
                user: user.toJSON(),
            };
            const res = createMockRes();

            await getMe(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.user.passwordHash).toBeUndefined();
        });
    });
});
