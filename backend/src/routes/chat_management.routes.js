const express = require('express');
const router = express.Router();
const db = require('../models'); // Adjust path as needed
const { createCrudController, createCrudRoutes } = require('../utils/crudController');
const { authMiddleware } = require('../middleware/auth');

// Middleware to ensure admin/super_admin access for sensitive operations
const adminMiddleware = (req, res, next) => {
    if (!req.user || !['admin', 'super_admin'].includes(req.user.app_role)) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
};

// --- Room Automation Routes ---
const automationRouter = express.Router();
const automationController = createCrudController(db.RoomAutomation, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC'
});
createCrudRoutes(automationRouter, automationController);
router.use('/automations', authMiddleware, adminMiddleware, automationRouter);


// --- Moderation Rules Routes ---
const ruleRouter = express.Router();
const ruleController = createCrudController(db.ModerationRule, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC'
});
createCrudRoutes(ruleRouter, ruleController);
router.use('/rules', authMiddleware, adminMiddleware, ruleRouter);


// --- Chat Invites Routes ---
const inviteRouter = express.Router();
const inviteController = createCrudController(db.ChatInvite, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC'
});

// Custom endpoint to generate unique invite code
inviteRouter.post('/generate', async (req, res) => {
    try {
        const { chat_room_id, max_uses, expires_in_hours, role_to_assign } = req.body;

        // Generate a random 8-char code
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (expires_in_hours || 24));

        const invite = await db.ChatInvite.create({
            chat_room_id,
            code,
            created_by: req.user.id,
            max_uses: max_uses || 100,
            expires_at: expiresAt,
            role_to_assign: role_to_assign || 'member',
            is_active: true
        });

        res.status(201).json(invite);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

createCrudRoutes(inviteRouter, inviteController);
router.use('/invites', authMiddleware, adminMiddleware, inviteRouter);


// --- VIP Features Routes ---
const vipRouter = express.Router();
const vipController = createCrudController(db.VIPFeature, {
    defaultOrderBy: 'id',
    defaultOrder: 'ASC'
});
createCrudRoutes(vipRouter, vipController);
router.use('/vip-features', authMiddleware, adminMiddleware, vipRouter);

module.exports = router;
