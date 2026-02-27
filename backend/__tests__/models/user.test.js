/**
 * Unit Tests: User Model
 * Tests schema validation, hooks, and instance methods.
 * Run: npx jest __tests__/models/user.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterEach(async () => {
    await User.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('User Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid user with required fields', async () => {
            const userData = {
                name: 'Rajesh Kumar',
                phone: '9876543210',
                passwordHash: 'password123',
            };

            const user = await User.create(userData);

            expect(user._id).toBeDefined();
            expect(user.name).toBe('Rajesh Kumar');
            expect(user.phone).toBe('9876543210');
            expect(user.passwordHash).toBeDefined();
            expect(user.email).toBe('');
            expect(user.location.state).toBe('');
            expect(user.location.district).toBe('');
            expect(user.location.tahsil).toBe('');
            expect(user.createdAt).toBeDefined();
        });

        it('should fail validation without name', async () => {
            const userData = {
                phone: '9876543210',
                passwordHash: 'password123',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should fail validation without phone', async () => {
            const userData = {
                name: 'Rajesh Kumar',
                passwordHash: 'password123',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should fail validation without passwordHash', async () => {
            const userData = {
                name: 'Rajesh Kumar',
                phone: '9876543210',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should enforce unique phone constraint', async () => {
            const userData1 = {
                name: 'Rajesh Kumar',
                phone: '9876543210',
                passwordHash: 'password123',
            };

            const userData2 = {
                name: 'Suresh Patel',
                phone: '9876543210',
                passwordHash: 'password456',
            };

            await User.create(userData1);
            await expect(User.create(userData2)).rejects.toThrow();
        });

        it('should trim whitespace from name and phone', async () => {
            const userData = {
                name: '  Rajesh Kumar  ',
                phone: '  9876543210  ',
                passwordHash: 'password123',
            };

            const user = await User.create(userData);

            expect(user.name).toBe('Rajesh Kumar');
            expect(user.phone).toBe('9876543210');
        });

        it('should accept optional email field', async () => {
            const userData = {
                name: 'Rajesh Kumar',
                phone: '9876543210',
                passwordHash: 'password123',
                email: 'rajesh@example.com',
            };

            const user = await User.create(userData);
            expect(user.email).toBe('rajesh@example.com');
        });

        it('should accept optional location fields', async () => {
            const userData = {
                name: 'Rajesh Kumar',
                phone: '9876543210',
                passwordHash: 'password123',
                location: {
                    state: 'Maharashtra',
                    district: 'Pune',
                    tahsil: 'Haveli',
                },
            };

            const user = await User.create(userData);
            expect(user.location.state).toBe('Maharashtra');
            expect(user.location.district).toBe('Pune');
            expect(user.location.tahsil).toBe('Haveli');
        });
    });

    describe('Pre-save Hook - Password Hashing', () => {
        it('should hash password before saving', async () => {
            const userData = {
                name: 'Rajesh Kumar',
                phone: '9876543210',
                passwordHash: 'plainPassword123',
            };

            const user = await User.create(userData);

            // Password should be hashed (bcrypt hashes start with $2)
            expect(user.passwordHash).not.toBe('plainPassword123');
            expect(user.passwordHash).toMatch(/^\$2[ayb]?\$\d+\$/);
        });

        it('should not re-hash already hashed password on update', async () => {
            const userData = {
                name: 'Rajesh Kumar',
                phone: '9876543210',
                passwordHash: 'password123',
            };

            const user = await User.create(userData);
            const originalHash = user.passwordHash;

            // Update non-password field
            user.name = 'Rajesh Kumar Updated';
            await user.save();

            const updatedUser = await User.findById(user._id);
            expect(updatedUser.passwordHash).toBe(originalHash);
        });
    });

    describe('Instance Methods', () => {
        describe('comparePassword', () => {
            it('should return true for correct password', async () => {
                const userData = {
                    name: 'Rajesh Kumar',
                    phone: '9876543210',
                    passwordHash: 'correctPassword123',
                };

                const user = await User.create(userData);
                const isMatch = await user.comparePassword('correctPassword123');

                expect(isMatch).toBe(true);
            });

            it('should return false for incorrect password', async () => {
                const userData = {
                    name: 'Rajesh Kumar',
                    phone: '9876543210',
                    passwordHash: 'correctPassword123',
                };

                const user = await User.create(userData);
                const isMatch = await user.comparePassword('wrongPassword');

                expect(isMatch).toBe(false);
            });

            it('should handle empty password gracefully', async () => {
                const userData = {
                    name: 'Rajesh Kumar',
                    phone: '9876543210',
                    passwordHash: 'correctPassword123',
                };

                const user = await User.create(userData);
                const isMatch = await user.comparePassword('');

                expect(isMatch).toBe(false);
            });
        });

        describe('toJSON', () => {
            it('should remove passwordHash from JSON output', async () => {
                const userData = {
                    name: 'Rajesh Kumar',
                    phone: '9876543210',
                    passwordHash: 'password123',
                };

                const user = await User.create(userData);
                const jsonUser = user.toJSON();

                expect(jsonUser.passwordHash).toBeUndefined();
                expect(jsonUser.__v).toBeUndefined();
                expect(jsonUser._id).toBeDefined();
                expect(jsonUser.name).toBe('Rajesh Kumar');
                expect(jsonUser.phone).toBe('9876543210');
            });

            it('should include all non-sensitive fields', async () => {
                const userData = {
                    name: 'Rajesh Kumar',
                    phone: '9876543210',
                    passwordHash: 'password123',
                    email: 'rajesh@example.com',
                    location: {
                        state: 'Maharashtra',
                        district: 'Pune',
                        tahsil: 'Haveli',
                    },
                };

                const user = await User.create(userData);
                const jsonUser = user.toJSON();

                expect(jsonUser).toHaveProperty('_id');
                expect(jsonUser).toHaveProperty('name');
                expect(jsonUser).toHaveProperty('phone');
                expect(jsonUser).toHaveProperty('email');
                expect(jsonUser).toHaveProperty('location');
                expect(jsonUser).toHaveProperty('createdAt');
            });
        });
    });
});
