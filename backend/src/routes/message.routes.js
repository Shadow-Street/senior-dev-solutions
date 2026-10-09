const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, optionalAuthenticate } = require("../middleware/auth");
const { Op } = require("sequelize");

/**
 * Which rooms may this caller read?
 *
 * A message belongs to a room, not to a person, so scoping by user_id would
 * hide everyone else's messages and break chat. The real rule is: a public
 * room is readable by anyone, a non-public room only by its participants.
 *
 * Returns the set of room ids as a WHERE fragment. Cached per request, since
 * both the list scope and the per-record check need it.
 */
const readableRoomIds = async (req) => {
  if (req.__readableRooms) return req.__readableRooms;

  // A room counts as open unless it says otherwise. `is_public` is NULL on
  // every existing room, so testing for `true` would have made the whole
  // product members-only and broken browsing the public trading rooms. Only an
  // explicit is_public=false, or a premium room, is restricted to participants.
  const openRooms = await db.ChatRoom.findAll({
    where: {
      [Op.and]: [
        { [Op.or]: [{ is_public: { [Op.ne]: false } }, { is_public: null }] },
        { [Op.or]: [{ is_premium: { [Op.ne]: true } }, { is_premium: null }] },
      ],
    },
    attributes: ["id"],
  });
  const ids = new Set(openRooms.map((r) => r.id));

  if (req.user?.id) {
    const memberships = await db.ChatRoomParticipant.findAll({
      where: { user_id: req.user.id },
      attributes: ["chat_room_id"],
    });
    memberships.forEach((m) => ids.add(m.chat_room_id));
  }

  req.__readableRooms = ids;
  return ids;
};

/** Scope shared by messages, reactions and read receipts. */
const roomScope = {
  listWhere: async (req) => {
    const ids = await readableRoomIds(req);
    // An empty set must match nothing, not everything.
    return { chat_room_id: { [Op.in]: ids.size ? [...ids] : ["__none__"] } };
  },
  allows: async (req, record) => {
    if (!record) return false;
    const ids = await readableRoomIds(req);
    return ids.has(record.chat_room_id);
  },
};

// Messages CRUD
const messageController = createCrudController(db.Message, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  scope: roomScope,
});

// Get messages by room
// Reading a room's history previously required nothing at all: any caller
// could name a room id and read it, private and premium rooms included.
router.get('/room/:roomId', optionalAuthenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    const allowed = await readableRoomIds(req);
    const isStaff = ['admin', 'super_admin', 'sub_admin']
      .includes(req.user?.app_role || req.user?.role);
    if (!isStaff && !allowed.has(roomId)) {
      // 404, not 403: a 403 would confirm the room exists.
      return res.status(404).json({ error: 'Room not found' });
    }

    const where = { chat_room_id: roomId };
    if (before) {
      where.created_at = { [db.Sequelize.Op.lt]: new Date(before) };
    }

    const messages = await db.Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      include: [{ model: db.User, attributes: ['id', 'name', 'profile_image_url'] }]
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('[message.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('[message.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Message Reactions sub-routes
const reactionRouter = express.Router();
const reactionController = createCrudController(db.MessageReaction);
createCrudRoutes(reactionRouter, reactionController, [authMiddleware]);
router.use('/reactions', reactionRouter);

// Message Read Receipts sub-routes
const readReceiptRouter = express.Router();
const readReceiptController = createCrudController(db.MessageReadReceipt);
createCrudRoutes(readReceiptRouter, readReceiptController, [authMiddleware]);
router.use('/read-receipts', readReceiptRouter);

// CRUD routes for Messages (Must be last to avoid capturing sub-routes as IDs)
createCrudRoutes(router, messageController, [authMiddleware]);

module.exports = router;
