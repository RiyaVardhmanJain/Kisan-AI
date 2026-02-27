const Warehouse = require('../models/Warehouse');
const ProduceLot = require('../models/ProduceLot');
const { getWeatherForCity, deriveStorageConditions } = require('../utils/weatherClient');
const { checkAndFireAlerts } = require('../utils/spoilageEngine');

// GET /api/warehouses
exports.getAll = async (req, res) => {
    try {
        const warehouses = await Warehouse.find({ owner: req.user._id, isActive: true });
        res.json({ warehouses });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch warehouses' });
    }
};

// POST /api/warehouses
exports.create = async (req, res) => {
    try {
        const { name, location, type, capacityQuintals } = req.body;

        if (!name || !location?.city || !capacityQuintals) {
            return res.status(400).json({ error: 'Name, city, and capacity are required' });
        }

        const warehouse = await Warehouse.create({
            owner: req.user._id,
            name,
            location,
            type: type || 'dry',
            capacityQuintals,
        });

        res.status(201).json({ warehouse });
    } catch (err) {
        console.error('Create warehouse error:', err);
        res.status(500).json({ error: 'Failed to create warehouse' });
    }
};

// PUT /api/warehouses/:id
exports.update = async (req, res) => {
    try {
        const warehouse = await Warehouse.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }

        res.json({ warehouse });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update warehouse' });
    }
};

// DELETE /api/warehouses/:id (soft delete)
exports.remove = async (req, res) => {
    try {
        const warehouse = await Warehouse.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            { isActive: false },
            { new: true }
        );

        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }

        res.json({ message: 'Warehouse deactivated', warehouse });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete warehouse' });
    }
};

// GET /api/warehouses/:id/conditions
exports.getConditions = async (req, res) => {
    try {
        const warehouse = await Warehouse.findOne({ _id: req.params.id, owner: req.user._id });
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }

        const weather = await getWeatherForCity(warehouse.location.city);
        const conditions = deriveStorageConditions(weather, warehouse.type);

        // Check all active lots in this warehouse for spoilage
        const lots = await ProduceLot.find({
            warehouse: warehouse._id,
            status: { $in: ['stored', 'partially_dispatched'] },
        });

        const newAlerts = [];
        for (const lot of lots) {
            const alerts = await checkAndFireAlerts({
                lot,
                warehouse,
                conditions,
                owner: req.user._id,
            });
            newAlerts.push(...alerts);
        }

        res.json({
            weather,
            conditions,
            warehouseType: warehouse.type,
            activeLots: lots.length,
            newAlerts: newAlerts.length,
        });
    } catch (err) {
        console.error('Get conditions error:', err);
        res.status(500).json({ error: 'Failed to fetch conditions' });
    }
};
