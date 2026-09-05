const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Typing Indicators CRUD
const typingController = createCrudController(db.TypingIndicator, {
  defaultOrderBy: 'updated_at',
  defaultOrder: 'DESC'
});

// Get typing users in room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    
    const typing = await db.TypingIndicator.findAll({
      where: { 
        chat_room_id: roomId,
        is_typing: true,
        updated_at: { [db.Sequelize.Op.gte]: fiveSecondsAgo }
      },
      include: [{ model: db.User, attributes: ['id', 'full_name'] }]
    });
    
    res.json(typing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set typing status
router.post('/set', authMiddleware, async (req, res) => {
  try {
    const { chat_room_id, is_typing } = req.body;
    
    const [indicator] = await db.TypingIndicator.upsert({
      user_id: req.user.id,
      chat_room_id,
      is_typing,
      updated_at: new Date()
    });
    
    res.json(indicator);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, typingController);

module.exports = router;