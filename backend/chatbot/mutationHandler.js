/**
 * Mutation Handler for KisanAI Chatbot
 * Consent-gated CRUD: parse intent → ask confirmation → execute on "yes"
 *
 * Schema constraints obeyed:
 *  - ProduceLot.status  enum: ['stored','partially_dispatched','dispatched','sold']
 *  - ProduceLot.currentCondition enum: ['good','watch','at_risk','spoiled']
 *  - ProduceLot requires: owner, warehouse, cropName, quantityQuintals
 *  - Warehouse.type enum: ['dry','cold_storage','ventilated']
 *  - Warehouse requires: owner, name, location.city, capacityQuintals
 */

const Warehouse = require('../models/Warehouse');
const ProduceLot = require('../models/ProduceLot');
const StorageEvent = require('../models/StorageEvent');
const { getShelfLife, getRecommendedSellByDate } = require('../utils/shelfLife');

// ─── In-memory pending actions (per userId, 5-min expiry) ─────────────────
const pendingActions = new Map();

const hasPendingAction = (userId) => pendingActions.has(userId.toString());
const getPendingAction = (userId) => pendingActions.get(userId.toString());
const clearPendingAction = (userId) => pendingActions.delete(userId.toString());

// ─── Entity Extraction ────────────────────────────────────────────────────

const CROPS = [
    'wheat', 'rice', 'onion', 'potato', 'tomato', 'maize', 'corn', 'sugarcane',
    'cotton', 'soybean', 'groundnut', 'bajra', 'jowar', 'tur', 'moong', 'urad',
    'chana', 'chilli', 'garlic', 'ginger', 'banana', 'mango', 'grapes',
    'pomegranate', 'orange',
];

function extractCropName(message) {
    const lower = message.toLowerCase();
    return CROPS.find((c) => lower.includes(c)) || null;
}

function extractQuantity(message) {
    const match =
        message.match(/(\d+(?:\.\d+)?)\s*(?:quintals?|qtl)/i) ||
        message.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilogram)/i) ||
        message.match(/(\d+(?:\.\d+)?)\s*(?:ton|tonne)/i) ||
        message.match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    if (/kg|kilogram/i.test(message)) return +(value / 100).toFixed(2);
    if (/ton|tonne/i.test(message)) return +(value * 10).toFixed(2);
    return value;
}

/**
 * Returns one of the valid ProduceLot.status or condition values.
 * Prefix '__condition:' means we update currentCondition instead of status.
 */
function extractNewStatus(message) {
    const lower = message.toLowerCase();
    if (/sold/i.test(lower)) return 'sold';               // status
    if (/dispatch/i.test(lower)) return 'dispatched';         // status
    if (/partial/i.test(lower)) return 'partially_dispatched'; // status
    if (/harvest/i.test(lower)) return 'sold';               // status
    if (/spoil/i.test(lower)) return '__condition:spoiled';
    if (/at.?risk/i.test(lower)) return '__condition:at_risk';
    if (/watch/i.test(lower)) return '__condition:watch';
    if (/good|ok|fine|recover/i.test(lower)) return '__condition:good';
    return null;
}

function extractWarehouseName(message) {
    const quoted = message.match(/["']([^"']+)["']/);
    if (quoted) return quoted[1];
    const named = message.match(/(?:called|named|is)\s+([A-Za-z][A-Za-z\s]+?)(?:\s+in|\s+at|\s+with|,|$)/i);
    if (named) return named[1].trim();
    return null;
}

function extractCity(message) {
    const inAt = message.match(/(?:in|at)\s+([A-Za-z][A-Za-z\s]+?)(?:\s+with|,|\.|$)/i);
    if (inAt) return inAt[1].trim();
    return 'Unknown';
}

// ─── Create pending action (consent prompt) ───────────────────────────────

async function createPendingAction(intent, message, userId) {
    const action = { type: intent, createdAt: Date.now(), userId: userId.toString() };
    const warehouses = await Warehouse.find({ owner: userId });

    // ── add_lot ──
    if (intent === 'add_lot') {
        const cropName = extractCropName(message);
        const quantity = extractQuantity(message);

        if (!cropName) return { success: false, message: `I couldn't detect the crop name. Try: "Add 200 quintals of **Onion** to my warehouse"` };
        if (!quantity) return { success: false, message: `I couldn't detect the quantity. Try: "Add **200 quintals** of Onion to my warehouse"` };
        if (!warehouses.length) return { success: false, message: `You don't have any warehouses yet. Create one first from the Warehouse page.` };

        const warehouse = warehouses.length === 1
            ? warehouses[0]
            : warehouses.find((w) => message.toLowerCase().includes(w.name.toLowerCase()));

        if (!warehouse) {
            const names = warehouses.map((w) => `"${w.name}"`).join(', ');
            return { success: false, message: `You have multiple warehouses: ${names}. Please mention which one, e.g. "Add 200 qtl Onion to ${warehouses[0].name}"` };
        }

        Object.assign(action, {
            cropName: cropName.charAt(0).toUpperCase() + cropName.slice(1),
            quantityQuintals: quantity,
            warehouseId: warehouse._id,
            warehouseName: warehouse.name,
        });
        pendingActions.set(userId.toString(), action);
        return {
            success: true,
            requiresConsent: true,
            message: `Got it! 📦 Shall I add a **${action.cropName}** lot (${quantity} qtl) to **"${warehouse.name}"**?\n\nReply **yes** to confirm or **no** to cancel.`,
        };
    }

    // ── add_warehouse ──
    if (intent === 'add_warehouse') {
        const name = extractWarehouseName(message);
        if (!name) return { success: false, message: `Please include the warehouse name. Try: "Create a warehouse called **'Nashik Cold Storage'**"` };

        let whType = 'dry';
        if (/cold/i.test(message)) whType = 'cold_storage';
        else if (/ventilated/i.test(message)) whType = 'ventilated';

        const capacity = extractQuantity(message) || 500;
        const city = extractCity(message);

        Object.assign(action, { name, whType, capacity, city });
        pendingActions.set(userId.toString(), action);
        return {
            success: true,
            requiresConsent: true,
            message: `I'll create a **${whType.replace('_', ' ')}** warehouse named **"${name}"** (${capacity} qtl capacity) in ${city}.\n\nReply **yes** to confirm or **no** to cancel.`,
        };
    }

    // ── update_lot_status ──
    if (intent === 'update_lot_status') {
        const rawStatus = extractNewStatus(message);
        if (!rawStatus) return { success: false, message: `I couldn't detect the new status. Try: "Mark my onion lot as **sold**" (sold / dispatched / at_risk / spoiled / good)` };

        const cropName = extractCropName(message);
        const warehouseIds = warehouses.map((w) => w._id);
        const query = { warehouse: { $in: warehouseIds } };
        if (cropName) query.cropName = new RegExp(cropName, 'i');

        const lot = await ProduceLot.findOne(query).populate('warehouse', 'name');
        if (!lot) return { success: false, message: `I couldn't find ${cropName ? `a ${cropName} lot` : 'any lot'} in your warehouses.` };

        const displayStatus = rawStatus.replace('__condition:', '');
        Object.assign(action, {
            lotId: lot._id,
            lotDisplay: lot.cropName,
            lotRef: lot.lotId,
            warehouseName: lot.warehouse?.name,
            rawStatus,
        });
        pendingActions.set(userId.toString(), action);
        return {
            success: true,
            requiresConsent: true,
            message: `Shall I mark **${lot.cropName}** (${lot.lotId}) in **"${lot.warehouse?.name}"** as **${displayStatus}**?\n\nReply **yes** to confirm or **no** to cancel.`,
        };
    }

    // ── delete_lot ──
    if (intent === 'delete_lot') {
        const cropName = extractCropName(message);
        const warehouseIds = warehouses.map((w) => w._id);
        const query = { warehouse: { $in: warehouseIds } };
        if (cropName) query.cropName = new RegExp(cropName, 'i');

        const lot = await ProduceLot.findOne(query).populate('warehouse', 'name');
        if (!lot) return { success: false, message: `I couldn't find ${cropName ? `a ${cropName} lot` : 'any lot'} in your warehouses.` };

        Object.assign(action, {
            lotId: lot._id,
            lotDisplay: lot.cropName,
            lotRef: lot.lotId,
            warehouseName: lot.warehouse?.name,
            quantityQuintals: lot.quantityQuintals,
            warehouseId: lot.warehouse?._id,
        });
        pendingActions.set(userId.toString(), action);
        return {
            success: true,
            requiresConsent: true,
            message: `⚠️ Shall I **permanently delete** the **${lot.cropName}** lot (${lot.lotId}, ${lot.quantityQuintals} qtl) from **"${lot.warehouse?.name}"**?\n\nReply **yes** to confirm or **no** to cancel.`,
        };
    }

    return { success: false, message: 'Unknown action type.' };
}

// ─── Execute confirmed action ─────────────────────────────────────────────

async function executeAction(userId) {
    const action = getPendingAction(userId);
    if (!action) return { success: false, message: 'No pending action. What would you like to do?' };

    if (Date.now() - action.createdAt > 5 * 60 * 1000) {
        clearPendingAction(userId);
        return { success: false, message: 'Action expired (5 min). Please try again.' };
    }

    clearPendingAction(userId);

    try {
        // ── add_lot ──
        if (action.type === 'add_lot') {
            const entryDate = new Date();
            const shelfLifeDays = getShelfLife(action.cropName);
            const sellByDate = getRecommendedSellByDate(entryDate, action.cropName);

            const lot = await ProduceLot.create({
                owner: userId,
                warehouse: action.warehouseId,
                cropName: action.cropName,
                quantityQuintals: action.quantityQuintals,
                status: 'stored',
                currentCondition: 'good',
                entryDate,
                expectedShelfLifeDays: shelfLifeDays,
                recommendedSellByDate: sellByDate,
            });
            await Warehouse.findByIdAndUpdate(action.warehouseId, {
                $inc: { usedCapacity: action.quantityQuintals },
            });

            // Traceability event
            await StorageEvent.create({
                lot: lot._id,
                owner: userId,
                eventType: 'lot_created',
                description: `${action.cropName} — ${action.quantityQuintals} quintals stored (via chatbot)`,
                metadata: { source: 'chatbot', warehouseName: action.warehouseName },
            });

            return {
                success: true,
                message: `✅ Added **${action.cropName}** (${action.quantityQuintals} qtl) to **"${action.warehouseName}"**!\nLot ID: **${lot.lotId}** · Shelf life: **${shelfLifeDays} days**`,
            };
        }

        // ── add_warehouse ──
        if (action.type === 'add_warehouse') {
            const wh = await Warehouse.create({
                owner: userId,
                name: action.name,
                type: action.whType,             // validated enum
                location: { city: action.city },  // required field
                capacityQuintals: action.capacity,
                usedCapacity: 0,
                isActive: true,
            });
            return {
                success: true,
                message: `✅ Warehouse **"${wh.name}"** created! (${wh.type.replace('_', ' ')}, ${wh.capacityQuintals} qtl capacity)`,
            };
        }

        // ── update_lot_status ──
        if (action.type === 'update_lot_status') {
            const isConditionUpdate = action.rawStatus.startsWith('__condition:');
            const payload = isConditionUpdate
                ? { currentCondition: action.rawStatus.replace('__condition:', '') }
                : { status: action.rawStatus };
            await ProduceLot.findByIdAndUpdate(action.lotId, payload);
            const displayStatus = action.rawStatus.replace('__condition:', '');

            // Traceability event
            const eventType = isConditionUpdate ? 'condition_updated' : action.rawStatus;
            await StorageEvent.create({
                lot: action.lotId,
                owner: userId,
                eventType,
                description: `${isConditionUpdate ? 'Condition' : 'Status'} changed to ${displayStatus} (via chatbot)`,
                metadata: { source: 'chatbot', warehouseName: action.warehouseName },
            });

            return {
                success: true,
                message: `✅ **${action.lotDisplay}** (${action.lotRef}) updated to **${displayStatus}** in **"${action.warehouseName}"**.`,
            };
        }

        // ── delete_lot ──
        if (action.type === 'delete_lot') {
            // Log traceability BEFORE deleting
            await StorageEvent.create({
                lot: action.lotId,
                owner: userId,
                eventType: 'lot_deleted',
                description: `${action.lotDisplay} (${action.lotRef}, ${action.quantityQuintals} qtl) deleted from ${action.warehouseName} (via chatbot)`,
                metadata: { source: 'chatbot', warehouseName: action.warehouseName, quantity: action.quantityQuintals },
            });

            await ProduceLot.findByIdAndDelete(action.lotId);
            // Free up warehouse used capacity
            if (action.warehouseId && action.quantityQuintals) {
                await Warehouse.findByIdAndUpdate(action.warehouseId, {
                    $inc: { usedCapacity: -action.quantityQuintals },
                });
            }
            return {
                success: true,
                message: `🗑️ **${action.lotDisplay}** lot (${action.lotRef}) deleted from **"${action.warehouseName}"**.`,
            };
        }
    } catch (err) {
        console.error('[MutationHandler] Execute error:', err);
        return { success: false, message: `Something went wrong: ${err.message}. Please try again.` };
    }
}

// ─── Reject pending action ────────────────────────────────────────────────

function rejectAction(userId) {
    const had = hasPendingAction(userId);
    clearPendingAction(userId);
    return had
        ? { success: true, message: 'Cancelled. ✨ What else can I help you with?' }
        : { success: true, message: 'No action to cancel. How can I help?' };
}

module.exports = {
    hasPendingAction,
    getPendingAction,
    clearPendingAction,
    createPendingAction,
    executeAction,
    rejectAction,
};
