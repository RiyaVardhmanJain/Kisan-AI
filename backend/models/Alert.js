const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceLot' },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    alertType: {
        type: String,
        enum: ['spoilage_risk', 'humidity_breach', 'temp_breach', 'overdue', 'custom'],
        required: true,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    message: { type: String, required: true },
    recommendation: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false },
    triggeredAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Alert', alertSchema);
