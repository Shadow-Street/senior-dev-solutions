const cron = require('node-cron');
const db = require('../models');
const { Op } = require('sequelize');
const EmailService = require('./EmailService');
const PlatformSettings = require('./PlatformSettingsService');

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
        await this.pruneResolvedAlerts();
    }

    /**
     * Platform Settings > Alert Settings > retention. Deletes alerts that were
     * resolved or dismissed more than the configured number of days ago
     * (resolved_at; updated_at for rows that never recorded it).
     * 0 (the default) keeps everything; open and acknowledged alerts are
     * never deleted, whatever their age.
     */
    async pruneResolvedAlerts(now = new Date()) {
        try {
            const days = await PlatformSettings.getValue('alert_retention_days');
            if (!Number.isInteger(days) || days <= 0) return 0;
            const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            const removed = await db.AlertLog.destroy({
                where: {
                    status: { [Op.in]: ['resolved', 'dismissed'] },
                    [Op.or]: [
                        { resolved_at: { [Op.lt]: cutoff } },
                        { resolved_at: null, updated_at: { [Op.lt]: cutoff } },
                    ],
                }
            });
            if (removed) console.log(`Pruned ${removed} resolved alert(s) older than ${days} days.`);
            return removed;
        } catch (error) {
            console.error('Error in pruneResolvedAlerts:', error.message);
            return 0;
        }
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

            // Platform Settings > Notifications: renewal reminder emails can be
            // switched off platform-wide (receipts and security emails cannot).
            let remindersOn = true;
            try { remindersOn = (await PlatformSettings.getValue('notification_reminder_emails_enabled')) !== false; } catch { remindersOn = true; }
            if (!remindersOn) return;

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

                // Downgrade user permissions. Only a lapsed platform plan does
                // this: an expired advisor subscription says nothing about the
                // user's Premium/VIP membership, and if they hold another live
                // platform plan they stay premium.
                if (!sub.advisor_id && !sub.finfluencer_id) {
                    const stillPaid = await db.Subscription.findOne({
                        where: {
                            user_id: sub.user_id,
                            advisor_id: null,
                            finfluencer_id: null,
                            status: 'active',
                            end_date: { [Op.gt]: new Date() },
                        },
                    });
                    if (!stillPaid) {
                        await db.User.update(
                            { is_premium: false },
                            { where: { id: sub.user_id } }
                        );
                    }
                }

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
