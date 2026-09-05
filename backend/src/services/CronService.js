const cron = require('node-cron');
const db = require('../models');
const { Op } = require('sequelize');
const EmailService = require('./EmailService');

class CronService {
    constructor() {
        // Run every day at 00:00 (Midnight)
        this.dailyJob = cron.schedule('0 0 * * *', this.handleDailyTasks.bind(this));
    }

    start() {
        console.log('⏰ Cron Service Started');
        this.dailyJob.start();
    }

    async handleDailyTasks() {
        console.log('🔄 Running Daily Subscription Tasks...');
        await this.checkExpiringSubscriptions();
        await this.checkExpiredSubscriptions();
    }

    /**
     * Check subscriptions expiring in 3 days and send reminder
     */
    async checkExpiringSubscriptions() {
        try {
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
            const startOfDay = new Date(threeDaysFromNow.setHours(0, 0, 0, 0));
            const endOfDay = new Date(threeDaysFromNow.setHours(23, 59, 59, 999));

            const expiringSubs = await db.Subscription.findAll({
                where: {
                    status: 'active',
                    auto_renew: true,
                    end_date: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                },
                include: [{ model: db.User }, { model: db.SubscriptionPlan }]
            });

            console.log(`Found ${expiringSubs.length} subscriptions expiring in 3 days.`);

            for (const sub of expiringSubs) {
                if (sub.User && sub.User.email) {
                    const amount = sub.SubscriptionPlan ? (sub.billing_cycle === 'annually' ? sub.SubscriptionPlan.price_annually : sub.SubscriptionPlan.price_monthly) : 0;

                    await EmailService.sendEmail(
                        sub.User.email,
                        'Upcoming Subscription Renewal',
                        EmailService.getRenewalReminderTemplate(sub.User.name, 3, amount)
                    );
                }
            }

        } catch (error) {
            console.error('Error in checkExpiringSubscriptions:', error);
        }
    }

    /**
     * Check subscriptions that expired yesterday and mark as inactive if not renewed
     */
    async checkExpiredSubscriptions() {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const expiredSubs = await db.Subscription.findAll({
                where: {
                    status: 'active',
                    end_date: {
                        [Op.lt]: new Date()
                    }
                },
                include: [{ model: db.User }]
            });

            console.log(`Found ${expiredSubs.length} expired subscriptions.`);

            for (const sub of expiredSubs) {
                // Check if there is a newer active subscription for this user?
                // Or just mark this one as expired. 
                // If auto_renew is on, Razorpay should have charged and webhook should have extended.
                // If we are here, it means webhook didn't fire or payment failed.

                // Mark as expired/past_due
                await sub.update({ status: 'expired' });

                // Downgrade user permissions
                await db.User.update(
                    { is_premium: false },
                    { where: { id: sub.user_id } }
                );

                // Send notification
                if (sub.User && sub.User.email) {
                    // Can send "Subscription Ended" email
                }
            }

        } catch (error) {
            console.error('Error in checkExpiredSubscriptions:', error);
        }
    }
}

module.exports = new CronService();
