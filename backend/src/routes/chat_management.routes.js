const express = require('express');
const router = express.Router();
const db = require('../models'); // Adjust path as needed
const { createCrudController, createCrudRoutes } = require('../utils/crudController');
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Admin gating uses the shared middleware (checks app_role, role and is_admin).

// --- Room Automation Routes ---
const automationRouter = express.Router();
const automationController = createCrudController(db.RoomAutomation, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC'
});
createCrudRoutes(automationRouter, automationController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/automations', authMiddleware, adminMiddleware, automationRouter);


// --- Moderation Rules Routes ---
const ruleRouter = express.Router();
const ruleController = createCrudController(db.ModerationRule, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC'
});
createCrudRoutes(ruleRouter, ruleController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });
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
        console.error('[chat_management.routes.js] request failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

createCrudRoutes(inviteRouter, inviteController, [authMiddleware]);
router.use('/invites', authMiddleware, adminMiddleware, inviteRouter);


// --- VIP Features Routes ---
const vipRouter = express.Router();
const vipController = createCrudController(db.VIPFeature, {
    defaultOrderBy: 'id',
    defaultOrder: 'ASC'
});
createCrudRoutes(vipRouter, vipController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/vip-features', authMiddleware, adminMiddleware, vipRouter);

module.exports = router;
