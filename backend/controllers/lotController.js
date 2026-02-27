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

        // Dedup: If a stored lot of the SAME crop in the SAME warehouse exists, merge into it
        const existingLot = await ProduceLot.findOne({
            owner: req.user._id,
            warehouse,
            cropName,
            status: 'stored',
        });

        if (existingLot) {
            // Merge into existing lot — add quantity
            existingLot.quantityQuintals += quantityQuintals;
            if (source) existingLot.source = source;
            await existingLot.save();

            // Update warehouse used capacity
            await Warehouse.findByIdAndUpdate(warehouse, {
                $inc: { usedCapacity: quantityQuintals },
            });

            // Log merge event in timeline
            await StorageEvent.create({
                lot: existingLot._id,
                owner: req.user._id,
                eventType: 'lot_merged',
                description: `Added ${quantityQuintals}q ${cropName} (total now ${existingLot.quantityQuintals}q)`,
                metadata: { addedQuantity: quantityQuintals, source: source || '' },
            });

            const populated = await ProduceLot.findById(existingLot._id).populate('warehouse', 'name location type');
            return res.status(200).json({ lot: populated, merged: true });
        }

        // No existing lot — create fresh
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
        if (err.code === 11000) {
            return res.status(500).json({ error: 'Lot ID collision — please try again' });
        }
        const message = err.message || 'Failed to create lot';
        res.status(500).json({ error: message });
    }
};

// PUT /api/lots/:id
exports.update = async (req, res) => {
    try {
        // Fetch old lot BEFORE update to compute quantity delta
        const oldLot = await ProduceLot.findOne({ _id: req.params.id, owner: req.user._id });
        if (!oldLot) {
            return res.status(404).json({ error: 'Lot not found' });
        }
        const oldQty = oldLot.quantityQuintals;

        // Apply update
        const lot = await ProduceLot.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        // Auto-correct status based on quantity reality
        let statusCorrected = false;
        if (lot.quantityQuintals > 0 && (lot.status === 'dispatched' || lot.status === 'sold')) {
            lot.status = 'partially_dispatched';
            statusCorrected = true;
        } else if (lot.quantityQuintals <= 0 && (lot.status === 'stored' || lot.status === 'partially_dispatched')) {
            lot.status = 'dispatched';
            statusCorrected = true;
        }
        if (statusCorrected) await lot.save();

        // Log condition/status changes as events
        if (req.body.currentCondition || req.body.status) {
            await StorageEvent.create({
                lot: lot._id,
                owner: req.user._id,
                eventType: req.body.status ? req.body.status : 'condition_updated',
                description: req.body.currentCondition
                    ? `Condition updated to ${req.body.currentCondition}`
                    : `Status changed to ${lot.status}`,
                metadata: req.body,
            });
        }

        // Free up warehouse capacity by the ACTUAL dispatched amount
        if (['dispatched', 'sold', 'partially_dispatched'].includes(req.body.status)) {
            const dispatchedQty = oldQty - lot.quantityQuintals; // e.g. 80 - 50 = 30q dispatched
            if (dispatchedQty > 0) {
                const warehouseId = typeof lot.warehouse === 'object' ? lot.warehouse._id : lot.warehouse;
                await Warehouse.findByIdAndUpdate(warehouseId, {
                    $inc: { usedCapacity: -dispatchedQty },
                });
            }
        }

        res.json({ lot });
    } catch (err) {
        console.error('❌ Lot update error:', err.message, err);
        res.status(500).json({ error: 'Failed to update lot', details: err.message });
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

// DELETE /api/lots/:id
exports.deleteLot = async (req, res) => {
    try {
        const lot = await ProduceLot.findOne({ _id: req.params.id, owner: req.user._id });
        if (!lot) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        // Decrease warehouse usedCapacity by the lot's remaining quantity
        if (lot.quantityQuintals > 0) {
            const warehouseId = typeof lot.warehouse === 'object' ? lot.warehouse._id : lot.warehouse;
            await Warehouse.findByIdAndUpdate(warehouseId, {
                $inc: { usedCapacity: -lot.quantityQuintals },
            });
        }

        // Log deletion event
        await StorageEvent.create({
            lot: lot._id,
            owner: req.user._id,
            eventType: 'lot_deleted',
            description: `${lot.cropName} — ${lot.quantityQuintals} quintals removed from storage`,
        });

        await ProduceLot.deleteOne({ _id: lot._id });

        // Also clean up any unresolved alerts for this lot
        const Alert = require('../models/Alert');
        await Alert.updateMany(
            { lot: lot._id, isResolved: false },
            { isResolved: true, actionTaken: 'Lot deleted', resolvedAt: new Date() }
        );

        res.json({ message: 'Lot deleted successfully' });
    } catch (err) {
        console.error('Delete lot error:', err);
        res.status(500).json({ error: 'Failed to delete lot' });
    }
};

// PUT /api/lots/:id/shift
exports.shiftLot = async (req, res) => {
    try {
        const { targetWarehouseId } = req.body;
        if (!targetWarehouseId) {
            return res.status(400).json({ error: 'Target warehouse ID is required' });
        }

        const lot = await ProduceLot.findOne({ _id: req.params.id, owner: req.user._id });
        if (!lot) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        const currentWarehouseId = typeof lot.warehouse === 'object' ? lot.warehouse._id : lot.warehouse;
        if (String(currentWarehouseId) === String(targetWarehouseId)) {
            return res.status(400).json({ error: 'Lot is already in this warehouse' });
        }

        // Verify target warehouse belongs to user
        const targetWh = await Warehouse.findOne({ _id: targetWarehouseId, owner: req.user._id, isActive: true });
        if (!targetWh) {
            return res.status(404).json({ error: 'Target warehouse not found' });
        }

        // Check target warehouse has enough capacity
        const remainingCapacity = targetWh.capacityQuintals - targetWh.usedCapacity;
        if (lot.quantityQuintals > remainingCapacity) {
            return res.status(400).json({ error: `Not enough capacity. Available: ${remainingCapacity}q, Required: ${lot.quantityQuintals}q` });
        }

        // Decrease old warehouse capacity
        await Warehouse.findByIdAndUpdate(currentWarehouseId, {
            $inc: { usedCapacity: -lot.quantityQuintals },
        });

        // Increase new warehouse capacity
        await Warehouse.findByIdAndUpdate(targetWarehouseId, {
            $inc: { usedCapacity: lot.quantityQuintals },
        });

        // Update lot's warehouse reference
        lot.warehouse = targetWarehouseId;
        await lot.save();

        // Log traceability event
        const sourceWh = await Warehouse.findById(currentWarehouseId).select('name location');
        await StorageEvent.create({
            lot: lot._id,
            owner: req.user._id,
            eventType: 'lot_shifted',
            description: `Shifted from ${sourceWh?.name || 'Unknown'} to ${targetWh.name} (${targetWh.location.city})`,
            metadata: { fromWarehouse: currentWarehouseId, toWarehouse: targetWarehouseId },
        });

        // Re-populate warehouse for response
        const updatedLot = await ProduceLot.findById(lot._id).populate('warehouse', 'name location type');

        res.json({ lot: updatedLot, message: `Lot shifted to ${targetWh.name}` });
    } catch (err) {
        console.error('Shift lot error:', err);
        res.status(500).json({ error: 'Failed to shift lot' });
    }
};
