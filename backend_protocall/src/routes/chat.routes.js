const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Chat Rooms CRUD
const chatRoomController = createCrudController(db.ChatRoom, {
  defaultOrderBy: 'updated_at',
  defaultOrder: 'DESC'
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
createCrudRoutes(router, chatRoomController);

// Participants sub-routes
const participantRouter = express.Router();
const participantController = createCrudController(db.ChatRoomParticipant);
createCrudRoutes(participantRouter, participantController);
router.use('/participants', participantRouter);

module.exports = router;