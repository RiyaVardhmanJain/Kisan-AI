/**
 * DB Context Builder for KisanAI Chatbot
 * Fetches MongoDB data based on detected intent and formats it for AI consumption
 */

const Warehouse = require('../models/Warehouse');
const ProduceLot = require('../models/ProduceLot');
const Alert = require('../models/Alert');
const { getWeatherForCity, deriveStorageConditions } = require('../utils/weatherClient');
const { THRESHOLDS, computeSpoilageRiskScore } = require('../utils/spoilageEngine');

/**
 * Build context string from DB data based on intent
 * @param {string} intent - Detected intent
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<string|null>} - Formatted context string or null
 */
async function buildDbContext(intent, userId) {
    switch (intent) {
        case 'view_lots':
            return fetchLots(userId);
        case 'view_warehouses':
            return fetchWarehouses(userId);
        case 'view_conditions':
            return fetchConditions(userId);
        case 'view_alerts':
            return fetchAlerts(userId);
        case 'view_summary':
            return fetchSummary(userId);
        default:
            return null;
    }
}

/* ─── Data Fetchers ─── */

async function fetchLots(userId) {
    const warehouses = await Warehouse.find({ owner: userId }).select('_id name');
    if (warehouses.length === 0) return 'User has no warehouses yet.';

    const warehouseIds = warehouses.map((w) => w._id);
    const lots = await ProduceLot.find({ warehouse: { $in: warehouseIds } })
        .populate('warehouse', 'name location.city type')
        .sort({ createdAt: -1 })
        .limit(20);

    if (lots.length === 0) return 'No produce lots stored yet.';

    const list = lots.map((l) => {
        const whName = l.warehouse?.name || 'Unknown';
        const daysLeft = Math.max(
            0,
            Math.ceil((new Date(l.recommendedSellByDate) - new Date()) / (1000 * 60 * 60 * 24))
        );
        return `• ${l.cropName} (${l.lotId}) — ${l.quantityQuintals} qtl in "${whName}" | Condition: ${l.currentCondition} | ${daysLeft} days until sell-by | Status: ${l.status}`;
    });

    return `USER'S STORED PRODUCE (${lots.length} lots):\n${list.join('\n')}`;
}

async function fetchWarehouses(userId) {
    const warehouses = await Warehouse.find({ owner: userId }).sort({ createdAt: -1 });

    if (warehouses.length === 0) return 'User has no warehouses registered.';

    const list = warehouses.map((w) => {
        const usedPct = w.capacityQuintals > 0
            ? Math.round((w.usedCapacity / w.capacityQuintals) * 100)
            : 0;
        return `• "${w.name}" (${w.type}) at ${w.location?.city || 'unknown'} — ${w.usedCapacity}/${w.capacityQuintals} qtl used (${usedPct}%) | Active: ${w.isActive ? 'Yes' : 'No'}`;
    });

    return `USER'S WAREHOUSES (${warehouses.length}):\n${list.join('\n')}`;
}

async function fetchAlerts(userId) {
    const warehouses = await Warehouse.find({ owner: userId }).select('_id');
    if (warehouses.length === 0) return 'No warehouses, so no alerts.';

    const warehouseIds = warehouses.map((w) => w._id);
    const alerts = await Alert.find({
        warehouse: { $in: warehouseIds },
        isResolved: false,
    })
        .populate('lot', 'cropName lotId')
        .populate('warehouse', 'name')
        .sort({ triggeredAt: -1 })
        .limit(15);

    if (alerts.length === 0) return 'No active alerts — everything looks good! 🌿';

    const list = alerts.map((a) => {
        const crop = a.lot?.cropName || 'Unknown';
        const lotId = a.lot?.lotId || '';
        const wh = a.warehouse?.name || '';
        return `• [${a.severity.toUpperCase()}] ${a.message} — ${crop} ${lotId} in "${wh}" | Recommendation: ${a.recommendation || 'N/A'}`;
    });

    return `ACTIVE ALERTS (${alerts.length}):\n${list.join('\n')}`;
}

async function fetchSummary(userId) {
    const warehouses = await Warehouse.find({ owner: userId });
    if (warehouses.length === 0) return 'User has no warehouses yet. Suggest creating one first.';

    const warehouseIds = warehouses.map((w) => w._id);

    const [lots, unresolvedAlerts] = await Promise.all([
        ProduceLot.find({ warehouse: { $in: warehouseIds } }),
        Alert.countDocuments({ warehouse: { $in: warehouseIds }, isResolved: false }),
    ]);

    const totalCapacity = warehouses.reduce((s, w) => s + w.capacityQuintals, 0);
    const totalUsed = warehouses.reduce((s, w) => s + w.usedCapacity, 0);
    const atRisk = lots.filter((l) => l.currentCondition === 'at_risk' || l.currentCondition === 'spoiled').length;
    const good = lots.filter((l) => l.currentCondition === 'good').length;

    return `STORAGE SUMMARY:
• Warehouses: ${warehouses.length}
• Total Capacity: ${totalCapacity} qtl (${totalUsed} used, ${totalCapacity - totalUsed} free)
• Produce Lots: ${lots.length} total (${good} good, ${atRisk} at risk/spoiled)
• Active Alerts: ${unresolvedAlerts}`;
}

module.exports = { buildDbContext };

async function fetchConditions(userId) {
    const warehouses = await Warehouse.find({ owner: userId });
    if (warehouses.length === 0) return 'User has no warehouses yet.';

    const lines = [];
    for (const wh of warehouses) {
        const weather = await getWeatherForCity(wh.location.city);
        const conditions = deriveStorageConditions(weather, wh.type);
        const usedPct = wh.capacityQuintals > 0 ? Math.round((wh.usedCapacity / wh.capacityQuintals) * 100) : 0;

        let whStatus = '✅ Safe';
        if (usedPct > 90) whStatus = '⚠️ Near full';

        lines.push(`\n📦 "${wh.name}" (${wh.type.replace('_', ' ')}) in ${wh.location.city}:`);
        lines.push(`  🌡️ Temp: ${conditions.temp.toFixed(1)}°C | 💧 Humidity: ${conditions.humidity.toFixed(0)}%`);
        lines.push(`  📊 Capacity: ${usedPct}% used (${wh.usedCapacity}/${wh.capacityQuintals} qtl) ${whStatus}`);

        // Lot risk scores
        const lots = await ProduceLot.find({
            warehouse: wh._id,
            status: { $in: ['stored', 'partially_dispatched'] },
        });

        for (const lot of lots) {
            const score = computeSpoilageRiskScore(lot, conditions);
            const thresholds = THRESHOLDS[lot.cropName] || THRESHOLDS.default;
            let flag = '';
            if (conditions.temp > thresholds.maxTemp) flag += ` ⚠️ Temp exceeds ${thresholds.maxTemp}°C limit!`;
            if (conditions.humidity > thresholds.maxHumidity) flag += ` ⚠️ Humidity exceeds ${thresholds.maxHumidity}% limit!`;
            const riskLabel = score >= 70 ? '🔴 HIGH' : score >= 40 ? '🟠 MEDIUM' : '🟢 LOW';
            lines.push(`  • ${lot.cropName} (${lot.lotId}): Risk ${riskLabel} (${score}/100)${flag}`);
        }
    }

    return `WAREHOUSE CONDITIONS:\n${lines.join('\n')}`;
}

