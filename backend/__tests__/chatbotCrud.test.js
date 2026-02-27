/**
 * E2E Tests: Chatbot CRUD Operations
 * Tests intent detection, mutation handler consent flow, and DB context builder.
 * Run: npx jest __tests__/chatbotCrud.test.js --verbose --no-coverage
 */

// ─── Chainable query mock helper (defined before jest.mock factories) ─────
// jest.mock factories run before module-level code, so we use inline data.

const MOCK_WAREHOUSE_DATA = {
    _id: 'wh-001',
    name: 'Nashik Cold Storage',
    type: 'cold_storage',
    capacityQuintals: 1000,
    usedCapacity: 200,
    isActive: true,
    location: { city: 'Nashik' },
    owner: 'user-001',
};

const MOCK_LOT_DATA = {
    _id: 'lot-001',
    lotId: 'LOT-2026-0001',
    cropName: 'Onion',
    quantityQuintals: 150,
    status: 'stored',
    currentCondition: 'good',
    warehouse: { _id: 'wh-001', name: 'Nashik Cold Storage' },
    owner: 'user-001',
    recommendedSellByDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
};

/** Returns a chainable mock that resolves to `value` on await */
function makeFindChain(value) {
    const isArray = Array.isArray(value);
    const obj = {
        populate: () => obj,
        select: () => obj,
        sort: () => obj,
        limit: () => Promise.resolve(isArray ? value : [value]),
        then: (res, rej) => Promise.resolve(isArray ? value : [value]).then(res, rej),
        catch: (rej) => Promise.resolve(isArray ? value : [value]).catch(rej),
    };
    return obj;
}

// ─── Mocks ────────────────────────────────────────────────────────────────

jest.mock('../models/Warehouse', () => {
    const wh = {
        _id: 'wh-001', name: 'Nashik Cold Storage', type: 'cold_storage',
        capacityQuintals: 1000, usedCapacity: 200, isActive: true,
        location: { city: 'Nashik' }, owner: 'user-001',
    };
    const makeChain = (val) => {
        const o = {
            populate: () => o, select: () => o, sort: () => o,
            limit: () => Promise.resolve(Array.isArray(val) ? val : [val]),
            then: (r, j) => Promise.resolve(Array.isArray(val) ? val : [val]).then(r, j),
            catch: (j) => Promise.resolve(Array.isArray(val) ? val : [val]).catch(j),
        };
        return o;
    };
    return {
        find: jest.fn(() => makeChain([wh])),
        findById: jest.fn().mockResolvedValue(wh),
        findByIdAndUpdate: jest.fn().mockResolvedValue(wh),
        updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
        create: jest.fn().mockResolvedValue(wh),
    };
});

jest.mock('../models/ProduceLot', () => {
    const lot = {
        _id: 'lot-001', lotId: 'LOT-2026-0001', cropName: 'Onion',
        quantityQuintals: 150, status: 'stored', currentCondition: 'good',
        warehouse: { _id: 'wh-001', name: 'Nashik Cold Storage' },
        owner: 'user-001',
        recommendedSellByDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    };
    const makeChain = (val) => {
        const arr = Array.isArray(val) ? val : [val];
        const o = {
            populate: () => o, select: () => o, sort: () => o,
            limit: () => Promise.resolve(arr),
            then: (r, j) => Promise.resolve(arr).then(r, j),
            catch: (j) => Promise.resolve(arr).catch(j),
        };
        return o;
    };
    const findOneMock = jest.fn(() => ({
        populate: jest.fn().mockResolvedValue(lot),
        then: (r, j) => Promise.resolve(lot).then(r, j),
    }));
    return {
        find: jest.fn(() => makeChain([lot])),
        findOne: findOneMock,
        findById: jest.fn().mockResolvedValue(lot),
        findByIdAndUpdate: jest.fn().mockResolvedValue(lot),
        findByIdAndDelete: jest.fn().mockResolvedValue(lot),
        create: jest.fn().mockResolvedValue({ ...lot, lotId: 'LOT-2026-0002' }),
        countDocuments: jest.fn().mockResolvedValue(1),
    };
});

jest.mock('../models/Alert', () => {
    const makeChain = () => {
        const o = {
            populate: () => o, select: () => o, sort: () => o,
            limit: () => Promise.resolve([]),
            then: (r, j) => Promise.resolve([]).then(r, j),
            catch: (j) => Promise.resolve([]).catch(j),
        };
        return o;
    };
    return {
        find: jest.fn(() => makeChain()),
        countDocuments: jest.fn().mockResolvedValue(0),
    };
});

jest.mock('../models/StorageEvent', () => ({
    create: jest.fn().mockResolvedValue({ _id: 'evt-001', eventType: 'lot_created' }),
}));

// ─── Module imports (after mocks) ─────────────────────────────────────────

const { detectIntent, isMutationIntent } = require('../chatbot/intentDetector');
const {
    hasPendingAction,
    clearPendingAction,
    createPendingAction,
    executeAction,
    rejectAction,
} = require('../chatbot/mutationHandler');
const { buildDbContext } = require('../chatbot/dbContextBuilder');

const USER_ID = 'user-001';
const clearState = () => clearPendingAction(USER_ID);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Intent Detection
// ═══════════════════════════════════════════════════════════════════════════

describe('Intent Detection', () => {
    describe('View intents', () => {
        test.each([
            ['show my stored crops', 'view_lots'],
            ['what lots do I have', 'view_lots'],
            ['my warehouse capacity', 'view_warehouses'],
            ['show my godown', 'view_warehouses'],
            ['any alerts?', 'view_alerts'],
            ['show warnings', 'view_alerts'],
            ['give me a summary', 'view_summary'],
            ['storage overview', 'view_summary'],
        ])('"%s" → %s', (msg, expected) => {
            expect(detectIntent(msg).intent).toBe(expected);
        });
    });

    describe('Mutation intents (priority over view on tie)', () => {
        test.each([
            ['Add 200 quintals of Onion to my warehouse', 'add_lot'],
            ['Store 50 qtl wheat in Nashik storage', 'add_lot'],
            ['create a new warehouse called Pune Storage', 'add_warehouse'],
            ['add a warehouse named "Nashik Godown"', 'add_warehouse'],
            ['mark my onion lot as sold', 'update_lot_status'],
            ['update status of wheat lot', 'update_lot_status'],
            ['delete the onion lot', 'delete_lot'],
            ['remove crop lot from warehouse', 'delete_lot'],
        ])('"%s" → %s', (msg, expected) => {
            expect(detectIntent(msg).intent).toBe(expected);
        });

        test('isMutationIntent() correctly classifies intents', () => {
            ['add_lot', 'add_warehouse', 'update_lot_status', 'delete_lot'].forEach(i =>
                expect(isMutationIntent(i)).toBe(true)
            );
            ['view_lots', 'view_warehouses', 'general'].forEach(i =>
                expect(isMutationIntent(i)).toBe(false)
            );
        });
    });

    describe('Confirm / Reject', () => {
        test.each([
            ['yes', 'confirm'], ['yeah', 'confirm'], ['ok', 'confirm'],
            ['sure', 'confirm'], ['haan', 'confirm'],
            ['no', 'reject'], ['nope', 'reject'], ['cancel', 'reject'], ['nahi', 'reject'],
        ])('"%s" → %s', (msg, expected) => {
            expect(detectIntent(msg).intent).toBe(expected);
        });
    });

    describe('General (no DB call)', () => {
        test.each([
            ['What is PM Kisan scheme?'],
            ['How much rain is expected?'],
            ['Hello'],
        ])('"%s" → general', (msg) => {
            expect(detectIntent(msg).intent).toBe('general');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Mutation Handler — Consent Flow
// ═══════════════════════════════════════════════════════════════════════════

describe('Mutation Handler — Consent Flow', () => {
    afterEach(clearState);

    describe('add_lot', () => {
        test('creates pending action + returns confirmation prompt', async () => {
            const r = await createPendingAction('add_lot', 'Add 200 quintals of Onion', USER_ID);
            expect(r.success).toBe(true);
            expect(r.requiresConsent).toBe(true);
            expect(r.message).toMatch(/Onion/);
            expect(r.message).toMatch(/200/);
            expect(hasPendingAction(USER_ID)).toBe(true);
        });

        test('returns error when crop name missing', async () => {
            const r = await createPendingAction('add_lot', 'Add 200 quintals to my warehouse', USER_ID);
            expect(r.success).toBe(false);
            expect(r.message).toMatch(/crop name/);
        });

        test('returns error when quantity missing', async () => {
            const r = await createPendingAction('add_lot', 'Add onion to my warehouse', USER_ID);
            expect(r.success).toBe(false);
            expect(r.message).toMatch(/quantity/);
        });

        test('EXECUTE: creates lot, returns lotId, clears pending', async () => {
            await createPendingAction('add_lot', 'Add 200 quintals of Onion', USER_ID);
            const r = await executeAction(USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/Onion/);
            expect(r.message).toMatch(/LOT-/);
            expect(hasPendingAction(USER_ID)).toBe(false);
        });
    });

    describe('add_warehouse', () => {
        test('creates pending action for warehouse creation', async () => {
            const r = await createPendingAction('add_warehouse', "Create a cold warehouse called 'Nashik Silo' in Nashik", USER_ID);
            expect(r.success).toBe(true);
            expect(r.requiresConsent).toBe(true);
            expect(r.message).toMatch(/Nashik Silo/);
        });

        test('returns error when no name given', async () => {
            const r = await createPendingAction('add_warehouse', 'Create a warehouse', USER_ID);
            expect(r.success).toBe(false);
            expect(r.message).toMatch(/name/);
        });

        test('EXECUTE: creates warehouse + returns success', async () => {
            await createPendingAction('add_warehouse', "Create a cold warehouse called 'Nashik Silo' in Nashik", USER_ID);
            const r = await executeAction(USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/creat/i);
        });
    });

    describe('update_lot_status', () => {
        test('detects sold status', async () => {
            const r = await createPendingAction('update_lot_status', 'mark my onion lot as sold', USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/sold/);
        });

        test('detects at_risk condition', async () => {
            const r = await createPendingAction('update_lot_status', 'mark onion as at risk', USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/at_risk/);
        });

        test('detects spoiled condition', async () => {
            const r = await createPendingAction('update_lot_status', 'onion lot is spoiled', USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/spoiled/);
        });

        test('returns error when status not recognizable', async () => {
            const r = await createPendingAction('update_lot_status', 'update my lot', USER_ID);
            expect(r.success).toBe(false);
        });

        test('EXECUTE: updates lot and confirms', async () => {
            await createPendingAction('update_lot_status', 'mark my onion lot as sold', USER_ID);
            const r = await executeAction(USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/sold/);
        });
    });

    describe('delete_lot', () => {
        test('creates pending action with deletion warning', async () => {
            const r = await createPendingAction('delete_lot', 'delete the onion lot', USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/permanently delete/i);
            expect(r.message).toMatch(/Onion/);
        });

        test('EXECUTE: deletes lot + returns confirmation', async () => {
            await createPendingAction('delete_lot', 'delete the onion lot', USER_ID);
            const r = await executeAction(USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/deleted/i);
        });
    });

    describe('Safety: Confirm / Reject edge cases', () => {
        test('reject clears pending action', async () => {
            await createPendingAction('add_lot', 'Add 200 quintals of Onion', USER_ID);
            expect(hasPendingAction(USER_ID)).toBe(true);
            const r = rejectAction(USER_ID);
            expect(r.success).toBe(true);
            expect(hasPendingAction(USER_ID)).toBe(false);
        });

        test('reject with no pending action is graceful', () => {
            const r = rejectAction(USER_ID);
            expect(r.success).toBe(true);
            expect(r.message).toMatch(/No action/i);
        });

        test('execute with no pending action is graceful', async () => {
            const r = await executeAction(USER_ID);
            expect(r.success).toBe(false);
            expect(r.message).toMatch(/No pending action/);
        });

        test('cannot double-execute (cleared after confirmed)', async () => {
            await createPendingAction('add_lot', 'Add 200 quintals of Onion', USER_ID);
            await executeAction(USER_ID);
            const r = await executeAction(USER_ID);
            expect(r.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. DB Context Builder
// ═══════════════════════════════════════════════════════════════════════════

describe('DB Context Builder', () => {
    test('view_lots returns a non-empty string', async () => {
        const ctx = await buildDbContext('view_lots', USER_ID);
        expect(typeof ctx).toBe('string');
        expect(ctx.length).toBeGreaterThan(0);
    });

    test('view_warehouses contains WAREHOUSES header', async () => {
        const ctx = await buildDbContext('view_warehouses', USER_ID);
        expect(ctx).toMatch(/WAREHOUSES/);
    });

    test('view_alerts returns a string', async () => {
        const ctx = await buildDbContext('view_alerts', USER_ID);
        expect(typeof ctx).toBe('string');
    });

    test('view_summary contains SUMMARY header', async () => {
        const ctx = await buildDbContext('view_summary', USER_ID);
        expect(ctx).toMatch(/SUMMARY/);
    });

    test('general returns null', async () => {
        const ctx = await buildDbContext('general', USER_ID);
        expect(ctx).toBeNull();
    });
});
