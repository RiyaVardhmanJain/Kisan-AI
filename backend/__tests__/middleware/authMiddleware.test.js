/**
 * Unit Tests: Authentication Middleware
 * Tests JWT token verification and user lookup.
 * Run: npx jest __tests__/middleware/authMiddleware.test.js --verbose
 */

const jwt = require('jsonwebtoken');
const { protect } = require('../../middleware/authMiddleware');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let testUser;
let validToken;
let expiredToken;
let invalidToken;

const TEST_SECRET = 'test_jwt_secret_for_testing_only';

// Mock response object
const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Mock request object
const createMockReq = (overrides = {}) => ({
    headers: { authorization: 'Bearer ' + validToken },
    ...overrides,
});

beforeAll(async () => {
    // Set test JWT secret
    process.env.JWT_SECRET = TEST_SECRET;

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user
    testUser = await User.create({
        name: 'Test User',
        phone: '9999999999',
        passwordHash: 'password123',
    });

    // Generate tokens
    validToken = jwt.sign({ id: testUser._id.toString() }, TEST_SECRET, { expiresIn: '1h' });
    expiredToken = jwt.sign({ id: testUser._id.toString() }, TEST_SECRET, { expiresIn: '0s' });
    invalidToken = 'invalid.token.here';
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
});

describe('Authentication Middleware - protect', () => {
    describe('Success Cases', () => {
        it('should call next() with valid token', async () => {
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.user).toBeDefined();
            expect(req.user._id.toString()).toBe(testUser._id.toString());
            expect(req.user.passwordHash).toBeUndefined();
        });

        it('should attach user without passwordHash', async () => {
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.name).toBe('Test User');
            expect(req.user.phone).toBe('9999999999');
            expect(req.user.passwordHash).toBeUndefined();
        });
    });

    describe('Failure Cases - Missing/Invalid Authorization Header', () => {
        it('should return 401 when no authorization header', async () => {
            const req = createMockReq({ headers: {} });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Not authorized — no token' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header is empty', async () => {
            const req = createMockReq({ headers: { authorization: '' } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Not authorized — no token' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when header does not start with "Bearer "', async () => {
            const req = createMockReq({ headers: { authorization: 'Token123' } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Not authorized — no token' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when header is just "Bearer" without token', async () => {
            const req = createMockReq({ headers: { authorization: 'Bearer' } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Not authorized — no token' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Failure Cases - Invalid Token', () => {
        it('should return 401 for invalid token format', async () => {
            const req = createMockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token invalid or expired' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for token signed with wrong secret', async () => {
            const wrongSecretToken = jwt.sign({ id: testUser._id.toString() }, 'wrong_secret');
            const req = createMockReq({ headers: { authorization: 'Bearer ' + wrongSecretToken } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token invalid or expired' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for expired token', async () => {
            const req = createMockReq({ headers: { authorization: 'Bearer ' + expiredToken } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token invalid or expired' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for malformed token', async () => {
            const req = createMockReq({ headers: { authorization: 'Bearer malformed' } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token invalid or expired' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Failure Cases - User Not Found', () => {
        it('should return 401 when user not found (deleted after token issued)', async () => {
            // Create a token for a non-existent user
            const fakeId = new mongoose.Types.ObjectId();
            const fakeToken = jwt.sign({ id: fakeId.toString() }, TEST_SECRET, { expiresIn: '1h' });

            const req = createMockReq({ headers: { authorization: 'Bearer ' + fakeToken } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle token with extra spaces', async () => {
            const req = createMockReq({ headers: { authorization: 'Bearer  ' + validToken } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            // Should still work as split(' ')[1] gets the token
            expect(next).toHaveBeenCalled();
        });

        it('should handle token with query params in auth header (edge case)', async () => {
            const req = createMockReq({ headers: { authorization: 'Bearer ' + validToken + ' extra' } });
            const res = createMockRes();
            const next = jest.fn();

            await protect(req, res, next);

            // Token extraction uses split(' ')[1], so this should fail
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });
});
