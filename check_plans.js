const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const db = require('./backend/src/models');

async function checkPlans() {
    try {
        // Force password if env not picked up, but dotenv should work with correct path
        if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = '123456';

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
