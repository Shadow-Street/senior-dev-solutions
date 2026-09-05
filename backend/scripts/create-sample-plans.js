// Quick script to create sample subscription plans
// Run with: node backend/scripts/create-sample-plans.js

require("dotenv").config();
const { sequelize, SubscriptionPlan } = require("../src/models");

async function createPlans() {
    try {
        await sequelize.authenticate();
        console.log("Database connected");

        // Create sample subscription plans
        const plans = [
            {
                name: "Free",
                price: 0,
                interval: "lifetime",
                features: JSON.stringify(["Basic polls", "Limited voting", "Community access"]),
                description: "Free tier with basic features",
                is_active: true,
                trial_days: 0
            },
            {
                name: "Premium",
                price: 499,
                interval: "month",
                features: JSON.stringify(["Unlimited polls", "Premium polls access", "Advanced analytics", "Priority support"]),
                description: "Premium monthly subscription",
                is_active: true,
                trial_days: 7
            },
            {
                name: "Pro",
                price: 4999,
                interval: "year",
                features: JSON.stringify(["All Premium features", "Exclusive advisor polls", "Portfolio insights", "1-on-1 consultations"]),
                description: "Professional annual subscription",
                is_active: true,
                trial_days: 14
            }
        ];

        for (const planData of plans) {
            const existing = await SubscriptionPlan.findOne({ where: { name: planData.name } });
            if (!existing) {
                await SubscriptionPlan.create(planData);
                console.log(`✅ Created plan: ${planData.name}`);
            } else {
                console.log(`⏭️  Plan already exists: ${planData.name}`);
            }
        }

        console.log("\n✅ All subscription plans created successfully!");

    } catch (error) {
        console.error("Error creating plans:", error);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

createPlans();
