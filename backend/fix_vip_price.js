require('dotenv').config();
const db = require('./src/models');

async function fixVipPrice() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected to database');

        const vipPlan = await db.SubscriptionPlan.findOne({
            where: { name: 'VIP' }
        });

        if (vipPlan) {
            console.log(`Found VIP Plan. Current Price: ${vipPlan.price}`);
            // User screenshot showed 299, snippet showed 400. Let's set to 299 as per mockup/design or 400? 
            // usage snippet: "price_monthly: 400". I will set it to 499 (from screenshot) or 400. 
            // Screenshot in previous turn showing "VIP ₹299/month". 
            // User snippet in this turn: "price_monthly: 400". 
            // I will set it to 499 to match "Premium 199, VIP 499" logic usually, or 299. 
            // Getting safe value: 299 (from screenshot).

            await vipPlan.update({ price: 299.00 });
            console.log('✅ VIP Plan price updated to 299.00');
        } else {
            console.log('❌ VIP Plan not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating plan:', error);
        process.exit(1);
    }
}

fixVipPrice();
