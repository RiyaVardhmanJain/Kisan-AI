const ProduceLot = require('../models/ProduceLot');
const Warehouse = require('../models/Warehouse');
const StorageEvent = require('../models/StorageEvent');
const { getShelfLife, getRecommendedSellByDate } = require('../utils/shelfLife');

// GET /api/lots
exports.getAll = async (req, res) => {
    try {
        const filter = { owner: req.user._id };
        if (req.query.warehouseId) {
            filter.warehouse = req.query.warehouseId;
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const lots = await ProduceLot.find(filter)
            .populate('warehouse', 'name location type')
            .sort({ createdAt: -1 });

        res.json({ lots });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch lots' });
    }
};

// POST /api/lots
exports.create = async (req, res) => {
    try {
        const { warehouse, cropName, quantityQuintals, source, entryDate } = req.body;

        if (!warehouse || !cropName || !quantityQuintals) {
            return res.status(400).json({ error: 'Warehouse, crop name, and quantity are required' });
        }

        // Verify warehouse belongs to user
        const wh = await Warehouse.findOne({ _id: warehouse, owner: req.user._id });
        if (!wh) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }

        const entry = entryDate ? new Date(entryDate) : new Date();
        const shelfLife = getShelfLife(cropName);
        const sellByDate = getRecommendedSellByDate(entry, cropName);

        const lot = await ProduceLot.create({
            owner: req.user._id,
            warehouse,
            cropName,
            quantityQuintals,
            source: source || '',
            entryDate: entry,
            expectedShelfLifeDays: shelfLife,
            recommendedSellByDate: sellByDate,
        });

        // Update warehouse used capacity
        await Warehouse.findByIdAndUpdate(warehouse, {
            $inc: { usedCapacity: quantityQuintals },
        });

        // Create traceability event
        await StorageEvent.create({
            lot: lot._id,
            owner: req.user._id,
            eventType: 'lot_created',
            description: `${cropName} — ${quantityQuintals} quintals stored`,
        });

        res.status(201).json({ lot });
    } catch (err) {
        console.error('Create lot error:', err);
        res.status(500).json({ error: 'Failed to create lot' });
    }
};

// PUT /api/lots/:id
exports.update = async (req, res) => {
    try {
        const lot = await ProduceLot.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!lot) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        // Log condition/status changes as events
        if (req.body.currentCondition || req.body.status) {
            await StorageEvent.create({
                lot: lot._id,
                owner: req.user._id,
                eventType: req.body.status ? req.body.status : 'condition_updated',
                description: req.body.currentCondition
                    ? `Condition updated to ${req.body.currentCondition}`
                    : `Status changed to ${req.body.status}`,
                metadata: req.body,
            });
        }

        // On dispatch/sold: free up warehouse capacity
        if (['dispatched', 'sold'].includes(req.body.status)) {
            const warehouseId = typeof lot.warehouse === 'object' ? lot.warehouse._id : lot.warehouse;
            await Warehouse.findByIdAndUpdate(warehouseId, {
                $inc: { usedCapacity: -lot.quantityQuintals },
            });
        }

        res.json({ lot });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update lot' });
    }
};

// GET /api/lots/:id/timeline
exports.getTimeline = async (req, res) => {
    try {
        const events = await StorageEvent.find({
            lot: req.params.id,
            owner: req.user._id,
        }).sort({ performedAt: -1 });

        res.json({ events });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timeline' });
    }
};

// POST /api/lots/:id/events
exports.addEvent = async (req, res) => {
    try {
        const { eventType, description, metadata } = req.body;

        const lot = await ProduceLot.findOne({ _id: req.params.id, owner: req.user._id });
        if (!lot) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        const event = await StorageEvent.create({
            lot: lot._id,
            owner: req.user._id,
            eventType: eventType || 'inspection_done',
            description: description || '',
            metadata: metadata || {},
        });

        res.status(201).json({ event });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add event' });
    }
};
