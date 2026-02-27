const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    location: {
        city: { type: String, required: true, trim: true },
        address: { type: String, default: '' },
    },
    type: {
        type: String,
        enum: ['dry', 'cold_storage', 'ventilated'],
        default: 'dry',
    },
    capacityQuintals: { type: Number, required: true, min: 1 },
    usedCapacity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Warehouse', warehouseSchema);
