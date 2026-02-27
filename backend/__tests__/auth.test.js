const jwt = require('jsonwebtoken');

// Simulate the auth middleware logic
const verifyToken = (token, secret) => {
    try {
        return jwt.verify(token, secret);
    } catch {
        return null;
    }
};

describe('Auth JWT logic', () => {
    const TEST_SECRET = 'test_secret_key_123';

    it('signs and verifies a valid token', () => {
        const payload = { id: '507f1f77bcf86cd799439011' };
        const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
        const decoded = verifyToken(token, TEST_SECRET);
        expect(decoded).not.toBeNull();
        expect(decoded.id).toBe(payload.id);
    });

    it('returns null for invalid token', () => {
        const result = verifyToken('invalid.token.here', TEST_SECRET);
        expect(result).toBeNull();
    });

    it('returns null for wrong secret', () => {
        const token = jwt.sign({ id: '123' }, TEST_SECRET);
        const result = verifyToken(token, 'wrong_secret');
        expect(result).toBeNull();
    });

    it('returns null for expired token', () => {
        const token = jwt.sign({ id: '123' }, TEST_SECRET, { expiresIn: '0s' });
        // Immediate verification after 0s expiry should fail
        const result = verifyToken(token, TEST_SECRET);
        expect(result).toBeNull();
    });

    it('token contains iat and exp claims', () => {
        const token = jwt.sign({ id: '123' }, TEST_SECRET, { expiresIn: '7d' });
        const decoded = jwt.decode(token);
        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');
        expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
});
