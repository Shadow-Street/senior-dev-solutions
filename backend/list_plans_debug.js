require('dotenv').config();
const db = require('./src/models');

async function listPlans() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected to database');

        const plans = await db.SubscriptionPlan.findAll();
        console.log(`Found ${plans.length} plans:`);
        plans.forEach(p => {
            console.log(`- [${p.id}] ${p.name}: price=${p.price}, active=${p.is_active}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error listing plans:', error);
        process.exit(1);
    }
}

listPlans();
