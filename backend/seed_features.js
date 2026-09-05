require('dotenv').config();
const db = require('./src/models');

const defaultFeatures = [
    // Basic Tier Features
    { feature_key: 'market_news', feature_name: 'Market News', description: 'Latest market news and stock updates', tier: 'basic', is_enabled: true },
    { feature_key: 'my_portfolio', feature_name: 'My Portfolio', description: 'Track your investments and portfolio performance', tier: 'basic', is_enabled: true },
    { feature_key: 'refund_management', feature_name: 'Refund Management', description: 'Manage refunds across all platform services', tier: 'basic', is_enabled: true },
    { feature_key: 'ai_stock_predictions', feature_name: 'AI Stock Predictions', description: 'Purchase "AI Stock Predictions"', tier: 'basic', is_enabled: true },
    { feature_key: 'vendor_dashboard', feature_name: 'Vendor Dashboard', description: 'Dashboard for all vendors', tier: 'basic', is_enabled: true },
    { feature_key: 'entity_dashboard', feature_name: 'Entity Dashboard', description: 'Dashboard for platform entities', tier: 'basic', is_enabled: true },

    // Premium Tier Features
    { feature_key: 'premium_chat_rooms', feature_name: 'Premium Chat Rooms', description: 'Access to exclusive premium chat rooms', tier: 'premium', is_enabled: true },
    { feature_key: 'premium_polls', feature_name: 'Premium Polls', description: 'Participate in premium polls', tier: 'premium', is_enabled: true },
    { feature_key: 'premium_events', feature_name: 'Premium Events', description: 'Access to premium events', tier: 'premium', is_enabled: true },
    { feature_key: 'priority_support', feature_name: 'Priority Support', description: 'Get priority customer support', tier: 'premium', is_enabled: true },
    { feature_key: 'advanced_analytics', feature_name: 'Advanced Analytics', description: 'Advanced portfolio analytics', tier: 'premium', is_enabled: true },
    { feature_key: 'custom_alerts', feature_name: 'Custom Alerts & Notifications', description: 'Set custom price and volume alerts', tier: 'premium', is_enabled: true },

    // VIP Tier Features
    { feature_key: 'advisor_subscriptions', feature_name: 'Advisor Subscriptions', description: 'Subscribe to expert advisors', tier: 'vip', is_enabled: true },
    { feature_key: 'exclusive_finfluencer_content', feature_name: 'Exclusive Finfluencer Content', description: 'Access exclusive content from finfluencers', tier: 'vip', is_enabled: true },
    { feature_key: 'admin_recommendations', feature_name: 'Admin Recommendations', description: 'Get personalized admin recommendations', tier: 'vip', is_enabled: true },
    { feature_key: 'one_on_one_consultation', feature_name: 'One-on-One Consultation', description: 'Direct analyst access and consultation', tier: 'vip', is_enabled: true },
    { feature_key: 'vip_events_webinars', feature_name: 'VIP Events & Webinars', description: 'Exclusive VIP events and webinars', tier: 'vip', is_enabled: true },
    { feature_key: 'dedicated_account_manager', feature_name: 'Dedicated Account Manager', description: 'Personal account manager', tier: 'vip', is_enabled: true },
];

async function seedFeatures() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected to database');

        let createdCount = 0;
        let existingCount = 0;

        for (const feature of defaultFeatures) {
            const [created, wasCreated] = await db.FeatureConfig.findOrCreate({
                where: { feature_key: feature.feature_key },
                defaults: feature
            });

            if (wasCreated) {
                console.log(`✅ Created feature: ${feature.feature_name}`);
                createdCount++;
            } else {
                console.log(`ℹ️  Feature already exists: ${feature.feature_name}`);
                existingCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Created: ${createdCount} features`);
        console.log(`   Already existed: ${existingCount} features`);
        console.log(`   Total: ${defaultFeatures.length} features`);
        console.log('\n✅ Feature seeding complete');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding features:', error);
        process.exit(1);
    }
}

seedFeatures();
