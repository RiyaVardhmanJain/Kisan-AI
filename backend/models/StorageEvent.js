const mongoose = require('mongoose');

const storageEventSchema = new mongoose.Schema({
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceLot', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventType: {
        type: String,
        enum: [
            'lot_created',
            'inspection_done',
            'alert_fired',
            'condition_updated',
            'partially_dispatched',
            'dispatched',
            'sold',
            'lot_deleted',
        ],
        required: true,
    },
    description: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    performedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StorageEvent', storageEventSchema);
