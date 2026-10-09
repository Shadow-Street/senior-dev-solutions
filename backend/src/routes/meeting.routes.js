const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Meetings CRUD
const meetingController = createCrudController(db.Meeting, {
  defaultOrderBy: 'start_time',
  defaultOrder: 'DESC'
});

// Get active meeting for room
router.get('/room/:roomId/active', async (req, res) => {
  try {
    const { roomId } = req.params;
    const meeting = await db.Meeting.findOne({
      where: {
        chat_room_id: roomId,
        status: 'active'
      },
      order: [['start_time', 'DESC']]
    });
    res.json(meeting || null);
  } catch (error) {
    console.error('[meeting.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End meeting
router.put('/:id/end', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await db.Meeting.findByPk(id);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    await meeting.update({
      status: 'ended',
      end_time: new Date()
    });

    res.json(meeting);
  } catch (error) {
    console.error('[meeting.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD routes
createCrudRoutes(router, meetingController, [authMiddleware]);

module.exports = router;
