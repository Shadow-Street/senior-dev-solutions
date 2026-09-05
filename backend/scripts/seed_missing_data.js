const { sequelize } = require('../src/models');
const db = require('../src/models');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // Seed Platform Settings
        const [setting] = await db.PlatformSetting.findOrCreate({
            where: { key: 'tomorrows_pick_override' },
            defaults: {
                value: JSON.stringify({ symbol: 'AAPL', reason: 'Strong earnings' }),
                category: 'stock',
                description: 'Override for tomorrows pick'
            }
        });
        console.log('Platform Setting seeded:', setting.key);

        // Seed Subscription Plans
        const plans = [
            {
                name: 'Free',
                price: 0,
                interval: 'month',
                features: JSON.stringify(['Basic Access']),
                description: 'Free plan',
                is_active: true
            },
            {
                name: 'Premium',
                price: 29.99,
                interval: 'month',
                features: JSON.stringify(['Full Access', 'Premium Chat']),
                description: 'Premium plan',
                is_active: true
            }
        ];

        for (const plan of plans) {
            const [p] = await db.SubscriptionPlan.findOrCreate({
                where: { name: plan.name },
                defaults: plan
            });
            console.log('Plan seeded:', p.name);
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
