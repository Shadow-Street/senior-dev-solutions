const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Chat Rooms CRUD
const chatRoomController = createCrudController(db.ChatRoom, {
  defaultOrderBy: 'updated_at',
  defaultOrder: 'DESC',
  beforeCreate: async (data, req) => {
    // Set metadata
    data.owner_id = req.user.id;
    data.created_by = req.user.email;

    // Premium validation
    if (data.is_premium) {
      const isPremiumUser = req.user.is_premium || ['admin', 'super_admin'].includes(req.user.app_role);
      if (!isPremiumUser) {
        throw new Error('Only premium users or admins can create premium chat rooms');
      }
    }

    if (data.stock_symbol) {
      // Check for existing room with same stock symbol
      const existing = await db.ChatRoom.findOne({
        where: {
          stock_symbol: data.stock_symbol,
          // Optional: You might want to allow creating if the previous one is 'archived' or 'deleted' status
          // status: ['active', 'inactive'] 
        }
      });

      if (existing) {
        throw new Error(`Chat room for ${data.stock_symbol} already exists`);
      }
    }
    return data;
  }
});

// Custom routes for chat rooms
router.get('/my-rooms', authMiddleware, async (req, res) => {
  try {
    const participations = await db.ChatRoomParticipant.findAll({
      where: { user_id: req.user.id },
      include: [{ model: db.ChatRoom }]
    });
    const rooms = participations.map(p => p.ChatRoom);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/public', async (req, res) => {
  try {
    const rooms = await db.ChatRoom.findAll({
      where: { is_public: true, status: 'active' },
      order: [['participant_count', 'DESC']],
      limit: 50
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join room
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.ChatRoomParticipant.findOne({
      where: { chat_room_id: id, user_id: req.user.id }
    });

    if (existing) {
      return res.json(existing);
    }

    const participant = await db.ChatRoomParticipant.create({
      chat_room_id: id,
      user_id: req.user.id,
      role: 'member',
      joined_at: new Date()
    });

    // Update participant count
    await db.ChatRoom.increment('participant_count', { where: { id } });

    res.status(201).json(participant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave room
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.ChatRoomParticipant.destroy({
      where: { chat_room_id: id, user_id: req.user.id }
    });

    await db.ChatRoom.decrement('participant_count', { where: { id } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, chatRoomController, [authMiddleware]);

// Participants sub-routes
const participantRouter = express.Router();
const participantController = createCrudController(db.ChatRoomParticipant);
createCrudRoutes(participantRouter, participantController);
router.use('/participants', participantRouter);

module.exports = router;