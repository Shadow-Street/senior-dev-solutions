require('dotenv').config();
const db = require('./src/models');

async function updatePlanPricing() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected to database');

        const plans = [
            {
                name: 'Free',
                price: 0,
                price_monthly: 0,
                price_annually: 0,
                features: ['market_news', 'my_portfolio', 'refund_management'],
                description: 'Basic access for all users.',
                is_active: true,
                is_system_plan: true
            },
            {
                name: 'Premium',
                price: 499,
                price_monthly: 499,
                price_annually: 4999,
                features: ['market_news', 'my_portfolio', 'refund_management', 'premium_chat_rooms', 'premium_polls', 'premium_events', 'priority_support', 'advanced_analytics', 'custom_alerts'],
                description: 'Access to premium features and content.',
                is_active: true,
                is_system_plan: true
            },
            {
                name: 'VIP',
                price: 999,
                price_monthly: 999,
                price_annually: 9999,
                features: ['market_news', 'my_portfolio', 'refund_management', 'premium_chat_rooms', 'premium_polls', 'premium_events', 'priority_support', 'advanced_analytics', 'custom_alerts', 'advisor_subscriptions', 'exclusive_finfluencer_content', 'admin_recommendations', 'one_on_one_consultation', 'vip_events_webinars', 'dedicated_account_manager'],
                description: 'All-access pass to the entire platform.',
                is_active: true,
                is_system_plan: true
            }
        ];

        let createdCount = 0;
        let updatedCount = 0;

        for (const planData of plans) {
            const [plan, created] = await db.SubscriptionPlan.findOrCreate({
                where: { name: planData.name },
                defaults: planData
            });

            if (!created) {
                await plan.update(planData);
                console.log(`✅ Updated plan: ${planData.name}`);
                console.log(`   Monthly: ₹${planData.price_monthly}, Annual: ₹${planData.price_annually}`);
                console.log(`   Features: ${planData.features.length} features`);
                updatedCount++;
            } else {
                console.log(`✅ Created plan: ${planData.name}`);
                console.log(`   Monthly: ₹${planData.price_monthly}, Annual: ₹${planData.price_annually}`);
                console.log(`   Features: ${planData.features.length} features`);
                createdCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Created: ${createdCount} plans`);
        console.log(`   Updated: ${updatedCount} plans`);
        console.log(`   Total: ${plans.length} plans`);
        console.log('\n✅ Plan pricing update complete');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating plans:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

updatePlanPricing();
