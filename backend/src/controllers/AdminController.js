const db = require("../models");
const { isSuperAdmin, checkRoleChange } = require("../utils/roles");
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
            // Paying-customer figures only. Every account has a Free row (and
            // upgrading cancels it), and advisor subscriptions are a separate
            // product, so neither belongs in subscribers, churn or MRR.
            const platformRows = await db.Subscription.findAll({
                where: { advisor_id: null, finfluencer_id: null },
                attributes: ['id', 'status', 'billing_cycle', 'plan_id', 'plan_type', 'end_date'],
                include: [{ model: db.SubscriptionPlan, attributes: ['id', 'name', 'price', 'price_monthly', 'price_annually'] }]
            });
            const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; }; // NULL/garbage price counts as 0
            const monthlyPrice = (plan) => num(plan && plan.price_monthly) || num(plan && plan.price);
            const isFreeRow = (sub) => {
                const plan = sub.SubscriptionPlan;
                if (plan) return monthlyPrice(plan) === 0 && num(plan.price_annually) === 0;
                return !sub.end_date && /^(free|basic)$/i.test(String(sub.plan_type || '').trim());
            };
            const paidRows = platformRows.filter((sub) => !isFreeRow(sub));

            // 1. Total & Active Subscribers
            const totalSubscribers = paidRows.length;
            const activeSubs = paidRows.filter((sub) => sub.status === 'active');
            const activeSubscribers = activeSubs.length;
            const cancelledSubscribers = paidRows.filter((sub) => sub.status === 'cancelled').length;

            // 2. Revenue Calculations (MRR/ARR)
            // MRR = Sum of monthly price of all active paid subscriptions
            let mrr = 0;
            activeSubs.forEach(sub => {
                const plan = sub.SubscriptionPlan;
                if (!plan) return;
                mrr += sub.billing_cycle === 'annually'
                    ? (num(plan.price_annually) || monthlyPrice(plan) * 12) / 12
                    : monthlyPrice(plan);
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
                where: {
                    status: 'active',
                    advisor_id: null,
                    finfluencer_id: null,
                    plan_type: { [Op.notIn]: ['Free', 'Basic'] } // the free tier is everyone; it is not a "top plan"
                },
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
            console.error('[AdminController.js] request failed:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, role, ban_reason } = req.body;

            const user = await db.User.findByPk(id);
            if (!user) return res.status(404).json({ error: "User not found" });

            // Same super-admin rules as PUT /users/:id: an admin may not ban
            // or re-role a super admin, nor make anyone one.
            if (isSuperAdmin(user) && !isSuperAdmin(req.user)) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (role !== undefined) {
                const refused = checkRoleChange(req.user, user, { role });
                if (refused) return res.status(refused.status).json({ error: refused.error });
            }

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
            console.error('[AdminController.js] request failed:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = AdminController;
