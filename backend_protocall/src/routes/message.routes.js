const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Messages CRUD
const messageController = createCrudController(db.Message, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get messages by room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    const where = { chat_room_id: roomId };
    if (before) {
      where.created_at = { [db.Sequelize.Op.lt]: new Date(before) };
    }
    
    const messages = await db.Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      include: [{ model: db.User, attributes: ['id', 'full_name', 'avatar_url'] }]
    });
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pin/Unpin message
router.put('/:id/pin', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await db.Message.findByPk(id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    await message.update({ is_pinned: !message.is_pinned });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, messageController);

// Message Reactions sub-routes
const reactionRouter = express.Router();
const reactionController = createCrudController(db.MessageReaction);
createCrudRoutes(reactionRouter, reactionController);
router.use('/reactions', reactionRouter);

module.exports = router;