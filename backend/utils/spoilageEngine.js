const Alert = require('../models/Alert');
const { getShelfLife } = require('./shelfLife');

const THRESHOLDS = {
    Onion: { maxHumidity: 65, maxTemp: 30 },
    Potato: { maxHumidity: 85, maxTemp: 10 },
    Wheat: { maxHumidity: 70, maxTemp: 32 },
    Rice: { maxHumidity: 75, maxTemp: 30 },
    Tomato: { maxHumidity: 90, maxTemp: 8 },
    Cotton: { maxHumidity: 65, maxTemp: 35 },
    Sugarcane: { maxHumidity: 80, maxTemp: 30 },
    Garlic: { maxHumidity: 65, maxTemp: 28 },
    default: { maxHumidity: 75, maxTemp: 30 },
};

/**
 * Check storage conditions against crop thresholds.
 * Creates Alert documents in DB if breached.
 * Returns array of newly created alerts.
 */
const checkAndFireAlerts = async ({ lot, warehouse, conditions, owner }) => {
    const thresholds = THRESHOLDS[lot.cropName] || THRESHOLDS.default;
    const alerts = [];

    if (conditions.humidity > thresholds.maxHumidity) {
        alerts.push({
            owner,
            lot: lot._id,
            warehouse: warehouse._id,
            alertType: 'humidity_breach',
            severity: conditions.humidity > thresholds.maxHumidity + 15 ? 'critical' : 'high',
            message: `Humidity ${conditions.humidity.toFixed(0)}% exceeds safe limit of ${thresholds.maxHumidity}% for ${lot.cropName}`,
            recommendation: 'Improve ventilation or shift to cold storage',
        });
    }

    if (conditions.temp > thresholds.maxTemp) {
        alerts.push({
            owner,
            lot: lot._id,
            warehouse: warehouse._id,
            alertType: 'temp_breach',
            severity: conditions.temp > thresholds.maxTemp + 10 ? 'critical' : 'high',
            message: `Temperature ${conditions.temp.toFixed(1)}°C exceeds safe limit of ${thresholds.maxTemp}°C for ${lot.cropName}`,
            recommendation: 'Consider cold storage or improved ventilation',
        });
    }

    // Check if lot is overdue (past sell-by date)
    if (lot.recommendedSellByDate && new Date() > lot.recommendedSellByDate) {
        alerts.push({
            owner,
            lot: lot._id,
            warehouse: warehouse._id,
            alertType: 'overdue',
            severity: 'critical',
            message: `${lot.cropName} (${lot.lotId}) has passed its recommended sell-by date`,
            recommendation: 'Sell or distribute immediately to minimize losses',
        });
    }

    // Check warehouse capacity overstocking
    const usedPct = warehouse.capacityQuintals > 0
        ? (warehouse.usedCapacity / warehouse.capacityQuintals) * 100
        : 0;
    if (usedPct > 90) {
        alerts.push({
            owner,
            lot: lot._id,
            warehouse: warehouse._id,
            alertType: 'capacity_warning',
            severity: usedPct >= 100 ? 'critical' : 'high',
            message: `Warehouse "${warehouse.name}" is at ${usedPct.toFixed(0)}% capacity (${warehouse.usedCapacity}/${warehouse.capacityQuintals} qtl)`,
            recommendation: 'Consider dispatching produce or using another warehouse to prevent overcrowding',
        });
    }

    // Save all new alerts
    const savedAlerts = [];
    for (const alertData of alerts) {
        const alert = await Alert.create(alertData);
        savedAlerts.push(alert);
    }

    return savedAlerts;
};

/**
 * Compute a 0–100 spoilage risk score for a lot.
 * Combines: shelf-life remaining (50%), temp vs threshold (25%), humidity vs threshold (25%).
 * Higher = more at risk.
 */
const computeSpoilageRiskScore = (lot, conditions) => {
    const thresholds = THRESHOLDS[lot.cropName] || THRESHOLDS.default;

    // Shelf-life component (0-50 points)
    let shelfLifeScore = 0;
    if (lot.recommendedSellByDate) {
        const now = new Date();
        const entry = new Date(lot.entryDate || lot.createdAt);
        const sellBy = new Date(lot.recommendedSellByDate);
        const totalDays = Math.max(1, (sellBy - entry) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, (sellBy - now) / (1000 * 60 * 60 * 24));
        const pctUsed = 1 - (daysRemaining / totalDays);
        shelfLifeScore = Math.min(50, Math.round(pctUsed * 50));
    } else {
        const shelfDays = getShelfLife(lot.cropName);
        const entry = new Date(lot.entryDate || lot.createdAt);
        const daysStored = (new Date() - entry) / (1000 * 60 * 60 * 24);
        shelfLifeScore = Math.min(50, Math.round((daysStored / shelfDays) * 50));
    }

    // Temp component (0-25 points)
    let tempScore = 0;
    if (conditions && conditions.temp > thresholds.maxTemp) {
        const excess = conditions.temp - thresholds.maxTemp;
        tempScore = Math.min(25, Math.round((excess / 15) * 25));
    }

    // Humidity component (0-25 points)
    let humidityScore = 0;
    if (conditions && conditions.humidity > thresholds.maxHumidity) {
        const excess = conditions.humidity - thresholds.maxHumidity;
        humidityScore = Math.min(25, Math.round((excess / 20) * 25));
    }

    return Math.min(100, shelfLifeScore + tempScore + humidityScore);
};

module.exports = { THRESHOLDS, checkAndFireAlerts, computeSpoilageRiskScore };
