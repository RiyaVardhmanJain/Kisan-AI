const mongoose = require('mongoose');

const produceLotSchema = new mongoose.Schema({
    lotId: { type: String, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    cropName: { type: String, required: true, trim: true },
    quantityQuintals: { type: Number, required: true, min: 0.1 },
    entryDate: { type: Date, default: Date.now },
    expectedShelfLifeDays: { type: Number },
    recommendedSellByDate: { type: Date },
    source: { type: String, default: '' },
    currentCondition: {
        type: String,
        enum: ['good', 'watch', 'at_risk', 'spoiled'],
        default: 'good',
    },
    status: {
        type: String,
        enum: ['stored', 'partially_dispatched', 'dispatched', 'sold'],
        default: 'stored',
    },
    cropAdvisory: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
});

// Auto-generate lotId before saving
produceLotSchema.pre('save', async function (next) {
    if (!this.lotId) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('ProduceLot').countDocuments();
        this.lotId = `LOT-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('ProduceLot', produceLotSchema);
