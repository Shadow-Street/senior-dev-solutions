const db = require("../models");
const { Op } = require("sequelize");
const AdminUserService = require("../services/AdminUserService");
const Access = require("../services/AccessControlService");
const Sanctions = require("../services/UserSanctionService");

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

    // ------------------------------------------------------------------
    // User Management (Super Admin › User Management). The rules live in
    // services/AdminUserService.js; these handlers only translate HTTP.
    // ------------------------------------------------------------------

    static async listUsers(req, res) {
        return respond(res, () => AdminUserService.list(req.user, req.query));
    }

    static async editUser(req, res) {
        return respond(res, () => AdminUserService.editDetails(req.user, req.params.id, req.body, AdminUserService.contextOf(req)));
    }

    static async setUserRole(req, res) {
        return respond(res, () => AdminUserService.setRole(req.user, req.params.id, req.body, AdminUserService.contextOf(req)));
    }

    static async adjustTrustScore(req, res) {
        return respond(res, () => AdminUserService.adjustTrust(req.user, req.params.id, req.body, AdminUserService.contextOf(req)));
    }

    static async setUserStatus(req, res) {
        return respond(res, () => AdminUserService.changeStatus(req.user, req.params.id, req.body, {
            context: AdminUserService.contextOf(req),
            wsService: req.app.get('wsService'),
        }));
    }

    static async deleteUser(req, res) {
        return respond(res, () => AdminUserService.deleteUser(req.user, req.params.id, req.body, {
            context: AdminUserService.contextOf(req),
            wsService: req.app.get('wsService'),
        }));
    }

    /**
     * Legacy PUT /admin/users/:id { status?, role?, ban_reason? } used by the
     * old admin dashboard. It used to write `status` straight to the row, so a
     * "ban" left every session alive and no history behind. It now goes
     * through the same rules as the dedicated endpoints.
     */
    static async updateUserStatus(req, res) {
        return respond(res, async () => {
            const { status, role, ban_reason } = req.body || {};
            const context = AdminUserService.contextOf(req);
            const wsService = req.app.get('wsService');
            if (role === undefined && status === undefined) throw new Access.AccessError(400, 'Nothing to update');
            const permissions = await Access.permissionsFor(req.user);
            const result = {};
            if (role !== undefined) {
                if (!permissions.has('users.roles')) throw new Access.AccessError(403, 'You do not have permission to perform this action');
                result.role = await AdminUserService.setRole(req.user, req.params.id, { role }, context);
            }
            if (status !== undefined) {
                const action = { active: 'reactivate', inactive: 'deactivate', banned: 'ban' }[status];
                if (!action) throw new Access.AccessError(400, 'Status must be active, inactive or banned');
                if (!permissions.has('users.status')) throw new Access.AccessError(403, 'You do not have permission to perform this action');
                // users.status covers deactivate/reactivate. A permanent block is
                // a moderation decision (Content Moderation is admin-only).
                if (action === 'ban' && !['admin', 'super_admin'].includes(req.user.app_role || req.user.role)) {
                    throw new Access.AccessError(403, 'Only an admin can block an account.');
                }
                if (action === 'reactivate') {
                    const target = await db.User.findByPk(req.params.id, { attributes: ['id', 'status'] });
                    if (target) AdminUserService.assertMayReactivate(req.user, target);
                }
                result.status = await Sanctions.apply(req.params.id, action, req.user, {
                    reason: action === 'ban' ? (ban_reason || 'Blocked by an administrator') : ban_reason,
                    source: 'user_management',
                    context,
                    wsService,
                });
            }
            return { message: 'User updated successfully', ...result };
        });
    }

    // ------------------------------------------------------------------
    // Roles & Permissions
    // ------------------------------------------------------------------

    static async myAccess(req, res) {
        return respond(res, () => Access.describeAccess(req.user));
    }

    static async assignableRoles(req, res) {
        return respond(res, () => Access.assignableRoles(req.user));
    }

    static async permissionMatrix(req, res) {
        return respond(res, () => Access.matrix(req.user));
    }

    static async setRolePermission(req, res) {
        return respond(res, () => {
            if (typeof req.body?.granted !== 'boolean') throw new Access.AccessError(400, 'granted must be true or false');
            return Access.setPermission(req.user, req.params.roleId, req.params.key, req.body.granted, AdminUserService.contextOf(req));
        });
    }

    static async createRole(req, res) {
        return respond(res, () => Access.createRole(req.user, req.body || {}, AdminUserService.contextOf(req)), 201);
    }

    static async updateRole(req, res) {
        return respond(res, () => Access.updateRole(req.user, req.params.roleId, req.body || {}, AdminUserService.contextOf(req)));
    }

    static async deleteRole(req, res) {
        return respond(res, () => Access.deleteRole(req.user, req.params.roleId, AdminUserService.contextOf(req)));
    }

    static async listRoleTemplates(req, res) {
        return respond(res, () => Access.listTemplates());
    }

    static async createRoleTemplate(req, res) {
        return respond(res, () => Access.saveTemplate(req.user, null, req.body || {}, AdminUserService.contextOf(req)), 201);
    }

    static async updateRoleTemplate(req, res) {
        return respond(res, () => Access.saveTemplate(req.user, req.params.templateId, req.body || {}, AdminUserService.contextOf(req)));
    }

    static async deleteRoleTemplate(req, res) {
        return respond(res, () => Access.deleteTemplate(req.user, req.params.templateId, AdminUserService.contextOf(req)));
    }

    static async accessAuditLog(req, res) {
        return respond(res, () => Access.auditTrail({ page: req.query.page, limit: req.query.limit, entityType: req.query.entity_type }));
    }
}

/**
 * Runs `work` and sends its result. Errors that carry an HTTP status
 * (AccessError, SanctionError, MigrationPendingError) are sent as
 * { error, code }; anything else is logged and answered with a generic 500.
 */
async function respond(res, work, okStatus = 200) {
    try {
        const body = await work();
        return res.status(okStatus).json(body);
    } catch (error) {
        if (error && Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
            return res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
        }
        console.error('[AdminController.js] request failed:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = AdminController;
