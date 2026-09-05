const db = require("../models");
const { Op } = require("sequelize");

class AdminController {
    // Dashboard Stats
    static async getDashboardStats(req, res) {
        try {
            const totalUsers = await db.User.count();
            const activeUsers = await db.User.count({ where: { status: 'active' } });
            const totalRevenue = await db.RevenueTransaction.sum('amount') || 0;

            // Get recent 5 users
            const recentUsers = await db.User.findAll({
                limit: 5,
                order: [['created_at', 'DESC']],
                attributes: { exclude: ['password'] }
            });

            res.json({
                users: { total: totalUsers, active: activeUsers },
                revenue: { total: totalRevenue },
                recentUsers
            });
        } catch (error) {
            console.error("Dashboard Stats Error:", error);
            res.status(500).json({ error: "Failed to fetch dashboard stats" });
        }
    }

    // Advanced Subscription Analytics
    static async getSubscriptionAnalytics(req, res) {
        try {
            // 1. Total & Active Subscribers
            const totalSubscribers = await db.Subscription.count();
            const activeSubscribers = await db.Subscription.count({ where: { status: 'active' } });
            const cancelledSubscribers = await db.Subscription.count({ where: { status: 'cancelled' } });

            // 2. Revenue Calculations (MRR/ARR)
            // MRR = Sum of monthly price of all active subscriptions
            const activeSubs = await db.Subscription.findAll({
                where: { status: 'active' },
                include: [{ model: db.SubscriptionPlan }]
            });

            let mrr = 0;
            activeSubs.forEach(sub => {
                if (sub.SubscriptionPlan) {
                    const price = sub.billing_cycle === 'annually'
                        ? (parseFloat(sub.SubscriptionPlan.price_annually) / 12)
                        : parseFloat(sub.SubscriptionPlan.price_monthly);
                    mrr += price;
                }
            });

            const arr = mrr * 12;

            // 3. Churn Rate
            // (Cancelled / Total) * 100
            const churnRate = totalSubscribers > 0 ? ((cancelledSubscribers / totalSubscribers) * 100).toFixed(2) : 0;

            // 4. Monthly Revenue Graph (Last 6 months) - Including Refunds
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const revenueTrends = await db.FundTransaction.findAll({
                attributes: [
                    [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('completed_at'), '%Y-%m'), 'month'],
                    [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'revenue']
                ],
                where: {
                    completed_at: { [Op.gte]: sixMonthsAgo },
                    status: 'completed',
                    transaction_type: { [Op.in]: ['payment', 'refund'] } // Include refunds (which are negative)
                },
                group: ['month'],
                order: [['month', 'ASC']]
            });

            // 5. Top Plans
            const topPlans = await db.Subscription.findAll({
                attributes: [
                    'plan_type',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                ],
                where: { status: 'active' },
                group: ['plan_type'],
                order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
                limit: 5
            });

            // 6. Failed Payments (Recent)
            const failedPayments = await db.FundTransaction.count({
                where: {
                    status: 'failed',
                    transaction_type: 'payment',
                    created_at: { [Op.gte]: sixMonthsAgo }
                }
            });

            // 7. Revenue per Coupon (NEW)
            const couponRevenue = await db.SubscriptionTransaction.findAll({
                attributes: [
                    'coupon_used',
                    [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total_revenue'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'usage_count']
                ],
                where: {
                    coupon_used: { [Op.ne]: null },
                    status: 'completed'
                },
                group: ['coupon_used'],
                order: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'DESC']],
                limit: 10
            });

            res.json({
                subscribers: {
                    total: totalSubscribers,
                    active: activeSubscribers,
                    cancelled: cancelledSubscribers,
                    churnRate: parseFloat(churnRate)
                },
                financials: {
                    mrr: Math.round(mrr),
                    arr: Math.round(arr)
                },
                charts: {
                    revenue: revenueTrends,
                    plans: topPlans,
                    coupons: couponRevenue
                },
                issues: {
                    failedPayments
                }
            });

        } catch (error) {
            console.error("Subscription Analytics Error:", error);
            res.status(500).json({ error: "Failed to fetch subscription analytics" });
        }
    }

    // User Management
    static async listUsers(req, res) {
        try {
            const { page = 1, limit = 10, search, role } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (search) {
                where[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ];
            }
            if (role) where.role = role;

            const users = await db.User.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['created_at', 'DESC']],
                attributes: { exclude: ['password'] }
            });

            res.json({
                total: users.count,
                pages: Math.ceil(users.count / limit),
                data: users.rows
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, role, ban_reason } = req.body;

            const user = await db.User.findByPk(id);
            if (!user) return res.status(404).json({ error: "User not found" });

            if (status) user.status = status;
            if (role) user.role = role;

            await user.save();

            // Log action if banned
            if (status === 'banned') {
                await db.ModerationLog.create({
                    moderator_id: req.user.id,
                    action: 'BAN_USER',
                    target_id: id,
                    target_type: 'USER',
                    reason: ban_reason || 'Admin action'
                });
            }

            res.json({ message: "User updated successfully", user });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = AdminController;
