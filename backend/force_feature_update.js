require('dotenv').config();
const db = require('./src/models');

async function forceUpdateFeatures() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected to database');

        const vipPlan = await db.SubscriptionPlan.findOne({ where: { name: 'VIP' } });

        if (!vipPlan) {
            console.error('❌ VIP Plan not found');
            return;
        }

        const correctFeatures = [
            "All Premium Features",
            "Direct Analyst Access",
            "One-on-One Consultation",
            "Early Access to New Features",
            "VIP Events & Webinars",
            "Customized Insights",
            "Dedicated Account Manager",
            "Offline Access"
        ];

        // Force update features
        // Ensure we are saving as array (Sequelize handles JSON stringification)
        await vipPlan.update({
            features: correctFeatures
        });

        console.log('✅ VIP Plan features force updated.');
        console.log('Current Features in DB:', JSON.stringify(vipPlan.features, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating features:', error);
        process.exit(1);
    }
}

forceUpdateFeatures();
