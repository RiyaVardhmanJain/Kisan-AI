const Alert = require('../models/Alert');

// GET /api/alerts
exports.getAll = async (req, res) => {
    try {
        const filter = { owner: req.user._id };
        if (req.query.unreadOnly === 'true') {
            filter.isRead = false;
        }

        const alerts = await Alert.find(filter)
            .populate('lot', 'lotId cropName')
            .populate('warehouse', 'name')
            .sort({ triggeredAt: -1 });

        res.json({ alerts });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};

// PUT /api/alerts/:id/read
exports.markRead = async (req, res) => {
    try {
        const alert = await Alert.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ alert });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark alert as read' });
    }
};

// PUT /api/alerts/:id/resolve
exports.resolve = async (req, res) => {
    try {
        const alert = await Alert.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            { isRead: true, isResolved: true },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ alert });
    } catch (err) {
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
};
