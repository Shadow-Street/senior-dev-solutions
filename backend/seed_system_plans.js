const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Sequelize } = require('sequelize');
const db = require('./src/models');

async function seedPlans() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected to database');

        const plans = [
            {
                name: 'Free',
                description: 'Basic platform access',
                price_monthly: 0,
                price_annually: 0,
                currency: 'INR',
                interval: 'month',
                duration: 1,
                features: [
                    'General Chat Access',
                    'Community Polls Participation',
                    'Webinar Access'
                ],
                is_active: true,
                is_system_plan: true
            },
            {
                name: 'Premium',
                description: 'Access to premium features',
                price_monthly: 199,
                price_annually: 1999,
                currency: 'INR',
                interval: 'month',
                duration: 1,
                features: [
                    'Included All Free Features',
                    'Market Insider Insights',
                    'Premium Chat Rooms',
                    'Premium Polls',
                    'Premium Events',
                    'Admin Recommendations',
                    'Advisor Subscriptions',
                    'Exclusive Finfluencer Content',
                    'Pledge Participation',
                    'Priority Support',
                    'Webinar Access'
                ],
                is_active: true,
                is_system_plan: true
            },
            {
                name: 'VIP',
                description: 'All features and exclusive content',
                price_monthly: 299,
                price_annually: 2999,
                currency: 'INR',
                interval: 'month',
                duration: 1,
                features: [
                    'Included All Premium Features',
                    'Premium Chat Rooms',
                    'Premium Events',
                    'Advisor Subscriptions',
                    'Pledge Participation',
                    'Priority Support',
                    'Whatsapp Support',
                    'Research Reports',
                    'Portfolio Tools',
                    'Advanced Analytics',
                    'Exclusive Finfluencer Content',
                    'Admin Recommendations',
                    'Premium Polls',
                    'One On One Consultation',
                    'Custom Alerts',
                    'Webinar Access'
                ],
                is_active: true,
                is_system_plan: true
            }
        ];

        for (const planData of plans) {
            const existing = await db.SubscriptionPlan.findOne({ where: { name: planData.name } });
            if (existing) {
                // Update existing system plans to match current specs
                await existing.update(planData);
                console.log(`🔄 Updated plan: ${planData.name}`);
            } else {
                await db.SubscriptionPlan.create(planData);
                console.log(`✅ Created plan: ${planData.name}`);
            }
        }

        console.log('🎉 Seed completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding plans:', error);
        process.exit(1);
    }
}

seedPlans();
