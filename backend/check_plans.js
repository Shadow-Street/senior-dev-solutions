require('dotenv').config();
const db = require('./src/models');

async function checkPlans() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected.');
        const plans = await db.SubscriptionPlan.findAll();
        console.log(JSON.stringify(plans, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkPlans();
