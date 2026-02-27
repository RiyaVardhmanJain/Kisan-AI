/**
 * Seed script: Realistic warehouse & produce data for Ramesh Patil (Pune, Maharashtra)
 *
 * Usage:  node scripts/seedWarehouseData.js
 *
 * This creates:
 *  - 2 warehouses in Pune (1 dry, 1 cold storage)
 *  - 6 realistic produce lots (onion, tomato, grapes, pomegranate, wheat, soybean)
 *  - 3 alerts (humidity, overdue, capacity)
 *  - Timeline events for each lot
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Warehouse = require('../models/Warehouse');
const ProduceLot = require('../models/ProduceLot');
const Alert = require('../models/Alert');
const StorageEvent = require('../models/StorageEvent');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ── Find Ramesh Patil user ──
    let user = await User.findOne({ name: /ramesh/i });
    if (!user) {
        // Try finding by phone pattern for common demo users
        user = await User.findOne({});
        if (!user) {
            console.error('❌ No users found in DB. Please register first.');
            process.exit(1);
        }
        console.log(`⚠️  Ramesh Patil not found, using existing user: ${user.name} (${user._id})`);
    } else {
        console.log(`👤 Found user: ${user.name} (${user._id})`);
    }

    const ownerId = user._id;

    // ── Clean existing warehouse data for this user ──
    const existingWarehouses = await Warehouse.find({ owner: ownerId });
    const whIds = existingWarehouses.map(w => w._id);
    if (whIds.length > 0) {
        const existingLots = await ProduceLot.find({ warehouse: { $in: whIds } });
        const lotIds = existingLots.map(l => l._id);
        await StorageEvent.deleteMany({ lot: { $in: lotIds } });
        await Alert.deleteMany({ warehouse: { $in: whIds } });
        await ProduceLot.deleteMany({ warehouse: { $in: whIds } });
        await Warehouse.deleteMany({ owner: ownerId });
        console.log(`🧹 Cleaned ${existingWarehouses.length} warehouses, ${existingLots.length} lots`);
    }

    // ── Create Warehouses ──
    const wh1 = await Warehouse.create({
        owner: ownerId,
        name: 'Patil Agri Warehouse',
        location: { city: 'Pune', address: 'Gat No. 42, Uruli Kanchan, Pune 412202' },
        type: 'dry',
        capacityQuintals: 500,
        usedCapacity: 312,
    });

    const wh2 = await Warehouse.create({
        owner: ownerId,
        name: 'Shivneri Cold Storage',
        location: { city: 'Pune', address: 'MIDC Bhosari, Pimpri-Chinchwad, Pune 411026' },
        type: 'cold_storage',
        capacityQuintals: 300,
        usedCapacity: 185,
    });

    console.log(`🏭 Created warehouses: ${wh1.name}, ${wh2.name}`);

    // ── Produce Lots (realistic Pune-area crops) ──
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const lotsData = [
        // Dry warehouse - Onion (Nashik/Pune belt staple)
        {
            owner: ownerId,
            warehouse: wh1._id,
            cropName: 'Onion',
            quantityQuintals: 120,
            entryDate: daysAgo(18),
            expectedShelfLifeDays: 45,
            recommendedSellByDate: daysFromNow(27),
            source: 'Baramati Farm',
            currentCondition: 'good',
            status: 'stored',
        },
        // Dry warehouse - Soybean (kharif season crop)
        {
            owner: ownerId,
            warehouse: wh1._id,
            cropName: 'Soybean',
            quantityQuintals: 80,
            entryDate: daysAgo(35),
            expectedShelfLifeDays: 120,
            recommendedSellByDate: daysFromNow(85),
            source: 'Indapur',
            currentCondition: 'good',
            status: 'stored',
        },
        // Dry warehouse - Wheat (stored long)
        {
            owner: ownerId,
            warehouse: wh1._id,
            cropName: 'Wheat',
            quantityQuintals: 112,
            entryDate: daysAgo(60),
            expectedShelfLifeDays: 180,
            recommendedSellByDate: daysFromNow(120),
            source: 'Shirur Taluka',
            currentCondition: 'good',
            status: 'stored',
        },
        // Cold storage - Tomato (perishable, needs care)
        {
            owner: ownerId,
            warehouse: wh2._id,
            cropName: 'Tomato',
            quantityQuintals: 45,
            entryDate: daysAgo(8),
            expectedShelfLifeDays: 18,
            recommendedSellByDate: daysFromNow(10),
            source: 'Junnar',
            currentCondition: 'watch',
            status: 'stored',
        },
        // Cold storage - Grapes (export quality, Table grapes)
        {
            owner: ownerId,
            warehouse: wh2._id,
            cropName: 'Grapes',
            quantityQuintals: 90,
            entryDate: daysAgo(5),
            expectedShelfLifeDays: 25,
            recommendedSellByDate: daysFromNow(20),
            source: 'Nashik Road',
            currentCondition: 'good',
            status: 'stored',
        },
        // Cold storage - Pomegranate (Pune/Solapur belt specialty)
        {
            owner: ownerId,
            warehouse: wh2._id,
            cropName: 'Pomegranate',
            quantityQuintals: 50,
            entryDate: daysAgo(12),
            expectedShelfLifeDays: 40,
            recommendedSellByDate: daysFromNow(28),
            source: 'Sangola',
            currentCondition: 'good',
            status: 'partially_dispatched',
        },
    ];

    const lots = [];
    for (const data of lotsData) {
        const lot = await ProduceLot.create(data);
        lots.push(lot);
    }
    console.log(`📦 Created ${lots.length} produce lots`);

    // ── Alerts (realistic scenarios) ──
    const alerts = await Alert.insertMany([
        {
            owner: ownerId,
            lot: lots[3]._id, // Tomato
            warehouse: wh2._id,
            alertType: 'humidity_breach',
            severity: 'high',
            message: 'Humidity at 82% in Cold Unit B — tomatoes at risk of fungal growth',
            recommendation: 'Activate dehumidifier immediately. Consider moving 15 quintals to ventilated section.',
            isRead: false,
            isResolved: false,
            triggeredAt: daysAgo(1),
        },
        {
            owner: ownerId,
            lot: lots[0]._id, // Onion
            warehouse: wh1._id,
            alertType: 'overdue',
            severity: 'medium',
            message: 'Onion lot stored for 18 days — market prices trending down',
            recommendation: 'Consider dispatching to Pune APMC or Vashi Market while prices are ₹2,100/quintal.',
            isRead: false,
            isResolved: false,
            triggeredAt: daysAgo(0),
        },
        {
            owner: ownerId,
            warehouse: wh1._id,
            alertType: 'capacity_warning',
            severity: 'medium',
            message: 'Patil Agri Warehouse at 62% capacity — limited space for new harvest',
            recommendation: 'Plan dispatch of wheat or soybean to free up 100+ quintals before next onion harvest.',
            isRead: false,
            isResolved: false,
            triggeredAt: daysAgo(2),
        },
    ]);
    console.log(`🔔 Created ${alerts.length} alerts`);

    // ── Storage Events (timeline entries) ──
    const events = [];
    for (const lot of lots) {
        // Every lot gets a "lot_created" event
        events.push({
            lot: lot._id,
            owner: ownerId,
            eventType: 'lot_created',
            description: `${lot.cropName} — ${lot.quantityQuintals} quintals received from ${lot.source}`,
            performedAt: lot.entryDate,
        });

        // Add inspection event a day after entry
        events.push({
            lot: lot._id,
            owner: ownerId,
            eventType: 'inspection_done',
            description: `Initial quality inspection: ${lot.currentCondition === 'good' ? 'Grade A' : 'Grade B'} — moisture, size, color checked`,
            performedAt: new Date(lot.entryDate.getTime() + 24 * 60 * 60 * 1000),
        });
    }

    // Pomegranate partial dispatch
    events.push({
        lot: lots[5]._id,
        owner: ownerId,
        eventType: 'partially_dispatched',
        description: '20 quintals dispatched to Pune APMC Market — buyer: Deshmukh Traders',
        performedAt: daysAgo(3),
    });

    // Tomato condition update
    events.push({
        lot: lots[3]._id,
        owner: ownerId,
        eventType: 'condition_updated',
        description: 'Condition changed from good → watch due to rising humidity in storage unit',
        performedAt: daysAgo(2),
    });

    // Tomato alert fired
    events.push({
        lot: lots[3]._id,
        owner: ownerId,
        eventType: 'alert_fired',
        description: 'Humidity breach alert — 82% humidity detected in cold storage unit B',
        performedAt: daysAgo(1),
    });

    await StorageEvent.insertMany(events);
    console.log(`📋 Created ${events.length} timeline events`);

    console.log('\n🌾 Seed complete! Summary:');
    console.log(`   Warehouses: ${wh1.name} (dry, 500 qtl) + ${wh2.name} (cold, 300 qtl)`);
    console.log(`   Lots: Onion (120), Soybean (80), Wheat (112), Tomato (45), Grapes (90), Pomegranate (50)`);
    console.log(`   Alerts: Humidity breach (tomato), Overdue (onion), Capacity warning`);
    console.log(`   Events: ${events.length} timeline entries`);

    await mongoose.disconnect();
    console.log('✅ Done');
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
