const Alert = require('../models/Alert');

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

    // Save all new alerts
    const savedAlerts = [];
    for (const alertData of alerts) {
        const alert = await Alert.create(alertData);
        savedAlerts.push(alert);
    }

    return savedAlerts;
};

module.exports = { THRESHOLDS, checkAndFireAlerts };
