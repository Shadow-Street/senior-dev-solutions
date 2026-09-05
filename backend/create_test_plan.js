require('dotenv').config();
const db = require('./src/models');

async function createTestPlan() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Connected to database');

        const newPlan = {
            name: 'Ultimate Dev Plan',
            description: 'The ultimate plan for senior developers with all access.',
            price: 999.00, // Correct field name
            interval: 'month',
            features: JSON.stringify([
                'All VIP Features',
                'Direct CTO Mentorship',
                'Source Code Review',
                'Unlimited API Access',
                'Beta Features Access'
            ]),
            is_active: true,
            trial_days: 0
        };

        // Check if exists
        const existing = await db.SubscriptionPlan.findOne({ where: { name: newPlan.name } });
        if (existing) {
            await existing.update(newPlan);
            console.log(`✅ Updated plan: ${existing.name}`);
        } else {
            const created = await db.SubscriptionPlan.create(newPlan);
            console.log(`✅ Created plan: ${created.name}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating plan:', error);
        process.exit(1);
    }
}

createTestPlan();
