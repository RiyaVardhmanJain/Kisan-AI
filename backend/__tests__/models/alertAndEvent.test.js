/**
 * Unit Tests: Alert and StorageEvent Models
 * Tests schema validation and constraints.
 * Run: npx jest __tests__/models/alertAndEvent.test.js --verbose
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Alert = require('../../models/Alert');
const StorageEvent = require('../../models/StorageEvent');
const User = require('../../models/User');
const Warehouse = require('../../models/Warehouse');
const ProduceLot = require('../../models/ProduceLot');

let mongoServer;
let testUserId;
let testWarehouseId;
let testLotId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user, warehouse, and lot
    const user = await User.create({
        name: 'Test User',
        phone: '9999999999',
        passwordHash: 'password123',
    });
    testUserId = user._id;

    const warehouse = await Warehouse.create({
        owner: testUserId,
        name: 'Test Warehouse',
        location: { city: 'Pune' },
        capacityQuintals: 1000,
    });
    testWarehouseId = warehouse._id;

    const lot = await ProduceLot.create({
        owner: testUserId,
        warehouse: testWarehouseId,
        cropName: 'Onion',
        quantityQuintals: 150,
    });
    testLotId = lot._id;
});

afterEach(async () => {
    await Alert.deleteMany({});
    await StorageEvent.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Alert Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid alert with required fields', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'High humidity detected',
            };

            const alert = await Alert.create(alertData);

            expect(alert._id).toBeDefined();
            expect(alert.owner.toString()).toBe(testUserId.toString());
            expect(alert.warehouse.toString()).toBe(testWarehouseId.toString());
            expect(alert.alertType).toBe('spoilage_risk');
            expect(alert.message).toBe('High humidity detected');
            expect(alert.severity).toBe('medium'); // default
            expect(alert.isRead).toBe(false); // default
            expect(alert.isResolved).toBe(false); // default
            expect(alert.actionTaken).toBe(''); // default
            expect(alert.triggeredAt).toBeDefined();
        });

        it('should fail validation without owner', async () => {
            const alertData = {
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'High humidity detected',
            };

            await expect(Alert.create(alertData)).rejects.toThrow();
        });

        it('should fail validation without warehouse', async () => {
            const alertData = {
                owner: testUserId,
                alertType: 'spoilage_risk',
                message: 'High humidity detected',
            };

            await expect(Alert.create(alertData)).rejects.toThrow();
        });

        it('should fail validation without alertType', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                message: 'High humidity detected',
            };

            await expect(Alert.create(alertData)).rejects.toThrow();
        });

        it('should fail validation without message', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
            };

            await expect(Alert.create(alertData)).rejects.toThrow();
        });

        it('should accept optional lot reference', async () => {
            const alertData = {
                owner: testUserId,
                lot: testLotId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Crop at risk',
            };

            const alert = await Alert.create(alertData);
            expect(alert.lot.toString()).toBe(testLotId.toString());
        });

        it('should accept optional recommendation', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'High humidity detected',
                recommendation: 'Improve ventilation',
            };

            const alert = await Alert.create(alertData);
            expect(alert.recommendation).toBe('Improve ventilation');
        });
    });

    describe('Alert Type Enum', () => {
        const alertTypes = [
            'spoilage_risk',
            'humidity_breach',
            'temp_breach',
            'overdue',
            'capacity_warning',
            'custom',
        ];

        it.each(alertTypes)('should accept "%s" alert type', async (alertType) => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType,
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            expect(alert.alertType).toBe(alertType);
        });

        it('should reject invalid alert type', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'invalid_type',
                message: 'Test alert',
            };

            await expect(Alert.create(alertData)).rejects.toThrow();
        });
    });

    describe('Severity Enum', () => {
        it('should default to "medium"', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            expect(alert.severity).toBe('medium');
        });

        it.each(['low', 'medium', 'high', 'critical'])(
            'should accept "%s" severity',
            async (severity) => {
                const alertData = {
                    owner: testUserId,
                    warehouse: testWarehouseId,
                    alertType: 'spoilage_risk',
                    message: 'Test alert',
                    severity,
                };

                const alert = await Alert.create(alertData);
                expect(alert.severity).toBe(severity);
            }
        );

        it('should reject invalid severity', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
                severity: 'invalid',
            };

            await expect(Alert.create(alertData)).rejects.toThrow();
        });
    });

    describe('Alert Status Management', () => {
        it('should default isRead to false', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            expect(alert.isRead).toBe(false);
        });

        it('should default isResolved to false', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            expect(alert.isResolved).toBe(false);
        });

        it('should allow marking alert as read', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            alert.isRead = true;
            await alert.save();

            const updated = await Alert.findById(alert._id);
            expect(updated.isRead).toBe(true);
        });

        it('should allow resolving alert with actionTaken', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            alert.isResolved = true;
            alert.actionTaken = 'Moved to cold storage';
            alert.resolvedAt = new Date();
            await alert.save();

            const updated = await Alert.findById(alert._id);
            expect(updated.isResolved).toBe(true);
            expect(updated.actionTaken).toBe('Moved to cold storage');
            expect(updated.resolvedAt).toBeDefined();
        });

        it('should default resolvedAt to null', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            expect(alert.resolvedAt).toBeNull();
        });
    });

    describe('Triggered At', () => {
        it('should default to current date', async () => {
            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
            };

            const alert = await Alert.create(alertData);
            const now = new Date();
            const triggeredAt = new Date(alert.triggeredAt);

            expect(Math.abs(now - triggeredAt)).toBeLessThan(5000);
        });

        it('should accept custom triggeredAt', async () => {
            const customDate = new Date('2026-01-15');

            const alertData = {
                owner: testUserId,
                warehouse: testWarehouseId,
                alertType: 'spoilage_risk',
                message: 'Test alert',
                triggeredAt: customDate,
            };

            const alert = await Alert.create(alertData);
            expect(alert.triggeredAt).toEqual(customDate);
        });
    });
});

describe('StorageEvent Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid storage event with required fields', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'lot_created',
            };

            const event = await StorageEvent.create(eventData);

            expect(event._id).toBeDefined();
            expect(event.lot.toString()).toBe(testLotId.toString());
            expect(event.owner.toString()).toBe(testUserId.toString());
            expect(event.eventType).toBe('lot_created');
            expect(event.description).toBe(''); // default
            expect(event.metadata).toEqual({}); // default
            expect(event.performedAt).toBeDefined();
        });

        it('should fail validation without lot', async () => {
            const eventData = {
                owner: testUserId,
                eventType: 'lot_created',
            };

            await expect(StorageEvent.create(eventData)).rejects.toThrow();
        });

        it('should fail validation without owner', async () => {
            const eventData = {
                lot: testLotId,
                eventType: 'lot_created',
            };

            await expect(StorageEvent.create(eventData)).rejects.toThrow();
        });

        it('should fail validation without eventType', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
            };

            await expect(StorageEvent.create(eventData)).rejects.toThrow();
        });

        it('should accept optional description', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'lot_created',
                description: 'Lot created successfully',
            };

            const event = await StorageEvent.create(eventData);
            expect(event.description).toBe('Lot created successfully');
        });
    });

    describe('Event Type Enum', () => {
        const eventTypes = [
            'lot_created',
            'inspection_done',
            'alert_fired',
            'condition_updated',
            'partially_dispatched',
            'dispatched',
            'sold',
            'lot_deleted',
        ];

        it.each(eventTypes)('should accept "%s" event type', async (eventType) => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType,
            };

            const event = await StorageEvent.create(eventData);
            expect(event.eventType).toBe(eventType);
        });

        it('should reject invalid event type', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'invalid_type',
            };

            await expect(StorageEvent.create(eventData)).rejects.toThrow();
        });
    });

    describe('Metadata Field', () => {
        it('should default to empty object', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'lot_created',
            };

            const event = await StorageEvent.create(eventData);
            expect(event.metadata).toEqual({});
        });

        it('should accept simple metadata object', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'inspection_done',
                metadata: {
                    inspector: 'John Doe',
                    temperature: 25,
                    humidity: 60,
                },
            };

            const event = await StorageEvent.create(eventData);
            expect(event.metadata).toEqual({
                inspector: 'John Doe',
                temperature: 25,
                humidity: 60,
            });
        });

        it('should accept nested metadata object', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'condition_updated',
                metadata: {
                    previous: { condition: 'good', temp: 25 },
                    current: { condition: 'watch', temp: 30 },
                    changes: ['condition', 'temp'],
                },
            };

            const event = await StorageEvent.create(eventData);
            expect(event.metadata).toEqual({
                previous: { condition: 'good', temp: 25 },
                current: { condition: 'watch', temp: 30 },
                changes: ['condition', 'temp'],
            });
        });
    });

    describe('Performed At', () => {
        it('should default to current date', async () => {
            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'lot_created',
            };

            const event = await StorageEvent.create(eventData);
            const now = new Date();
            const performedAt = new Date(event.performedAt);

            expect(Math.abs(now - performedAt)).toBeLessThan(5000);
        });

        it('should accept custom performedAt', async () => {
            const customDate = new Date('2026-01-15');

            const eventData = {
                lot: testLotId,
                owner: testUserId,
                eventType: 'inspection_done',
                performedAt: customDate,
            };

            const event = await StorageEvent.create(eventData);
            expect(event.performedAt).toEqual(customDate);
        });
    });
});
