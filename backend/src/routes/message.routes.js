const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, optionalAuthenticate } = require("../middleware/auth");
const {
  isStaff, isOwner, canReadRoom, canManageRoom, findRoom, findMembership, readableRoomIds, roomScope,
} = require("../utils/roomAccess");

const MAX_CONTENT_LENGTH = 10000;
const MAX_PAGE = 100;

// Writable fields. user_id is always the caller, so nobody posts as someone
// else; only the author edits content, and pinning is a room manager's call.
const CREATE_FIELDS = ['chat_room_id', 'content', 'reply_to_id', 'message_type', 'media_urls'];

const pick = (body, fields) => {
  const out = {};
  for (const field of fields) {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) out[field] = body[field];
  }
  return out;
};

const isAuthor = (req, message) => message.user_id && String(message.user_id) === String(req.user.id);

/**
 * Posting needs read access and membership (as over the WebSocket); an
 * admin-only room takes posts from its managers only, and a muted participant
 * cannot post.
 */
async function preparePost(req, res, next) {
  try {
    const data = pick(req.body, CREATE_FIELDS);
    if (typeof data.chat_room_id !== 'string' || !data.chat_room_id) {
      return res.status(400).json({ error: 'chat_room_id is required' });
    }
    if (typeof data.content !== 'string' || data.content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({ error: 'Invalid message content' });
    }
    const room = await findRoom(data.chat_room_id);
    if (!room || !(await canReadRoom(req.user, room.id))) {
      return res.status(404).json({ error: 'Room not found' });
    }
    // A reply may only point at a message in the same room.
    if (data.reply_to_id != null) {
      const parent = typeof data.reply_to_id === 'string' ? await db.Message.findByPk(data.reply_to_id) : null;
      if (!parent || parent.chat_room_id !== room.id) data.reply_to_id = null;
    }
    if (!isStaff(req.user)) {
      const membership = await findMembership(req.user, room.id);
      // Without this a muted user could leave the room and post from outside.
      if (!membership && !isOwner(req.user, room)) return res.status(403).json({ error: 'Join the room to post' });
      if (membership?.muted) return res.status(403).json({ error: 'You are muted in this room' });
      if (room.admin_only_post && !(await canManageRoom(req.user, room))) {
        return res.status(403).json({ error: 'Only moderators can post in this room' });
      }
    }
    req.body = { ...data, user_id: req.user.id };
    return next();
  } catch (error) {
    console.error('[message.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Content edits are the author's (or staff's); pinning and deleting others'
 * messages are a room manager's. Anyone else gets 404 so message ids cannot
 * be probed. Routes without :id (the staff-only /bulk ones) pass through.
 */
async function guardMessageWrite(req, res, next) {
  if (!req.params.id) return next();
  try {
    const message = await db.Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: 'Record not found' });

    const mayEdit = isAuthor(req, message) || isStaff(req.user);
    const mayModerate = await canManageRoom(req.user, await findRoom(message.chat_room_id));

    if (req.method === 'PUT') {
      const data = {};
      if (mayEdit && 'content' in (req.body || {})) {
        if (typeof req.body.content !== 'string' || req.body.content.length > MAX_CONTENT_LENGTH) {
          return res.status(400).json({ error: 'Invalid message content' });
        }
        Object.assign(data, { content: req.body.content, is_edited: true, edited_at: new Date() });
      }
      if (mayModerate && 'is_pinned' in (req.body || {})) data.is_pinned = Boolean(req.body.is_pinned);
      if (!mayEdit && !mayModerate) return res.status(404).json({ error: 'Record not found' });
      // Say so rather than answer 200 for a change that was silently dropped.
      if (!Object.keys(data).length) return res.status(403).json({ error: 'Not permitted' });
      req.body = data;
      return next();
    }

    if (!isAuthor(req, message) && !mayModerate) {
      return res.status(404).json({ error: 'Record not found' });
    }
    return next();
  } catch (error) {
    console.error('[message.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Reactions and read receipts are per-user rows on a message: the caller may
 * only create them on a message they can read, and only as themselves (the
 * CRUD ownership rule stamps user_id and limits edits to their own rows).
 * Listing reactions needs ?message_id= for a readable message, so a private
 * room's activity cannot be paged through.
 */
async function guardMessageChild(req, res, next) {
  try {
    const messageId = req.method === 'GET' ? req.query.message_id : req.body?.message_id;
    const message = typeof messageId === 'string' ? await db.Message.findByPk(messageId) : null;
    if (!message || !(await canReadRoom(req.user, message.chat_room_id))) {
      return res.status(404).json({ error: 'Message not found' });
    }
    return next();
  } catch (error) {
    console.error('[message.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

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
    const { limit, before } = req.query;

    const allowed = await readableRoomIds(req);
    if (!isStaff(req.user) && !allowed.has(roomId)) {
      // 404, not 403: a 403 would confirm the room exists.
      return res.status(404).json({ error: 'Room not found' });
    }

    const where = { chat_room_id: roomId };
    if (before) {
      const beforeDate = new Date(before);
      if (Number.isNaN(beforeDate.getTime())) return res.status(400).json({ error: 'Invalid before date' });
      where.created_at = { [db.Sequelize.Op.lt]: beforeDate };
    }

    const messages = await db.Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), MAX_PAGE),
      include: [{ model: db.User, attributes: ['id', 'name', 'profile_image_url'] }]
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('[message.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pin/Unpin message: a room manager's action.
router.put('/:id/pin', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await db.Message.findByPk(id);

    if (!message || !(await canManageRoom(req.user, await findRoom(message.chat_room_id)))) {
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
// A row stays on the message it was created for.
const keepMessage = async ({ message_id: _messageId, ...rest }) => rest;

const reactionController = createCrudController(db.MessageReaction, {
  ownership: { field: 'user_id', publicRead: true },
  beforeUpdate: keepMessage,
});
reactionRouter.get('/', authMiddleware, guardMessageChild);
createCrudRoutes(reactionRouter, reactionController, {
  read: [authMiddleware],
  create: [authMiddleware, guardMessageChild],
  write: [authMiddleware],
});
router.use('/reactions', reactionRouter);

// Message Read Receipts sub-routes
const readReceiptRouter = express.Router();
// Read receipts are listed only to their owner (nothing lists others').
const readReceiptController = createCrudController(db.MessageReadReceipt, {
  ownership: 'user_id',
  beforeUpdate: keepMessage,
});
createCrudRoutes(readReceiptRouter, readReceiptController, {
  read: [authMiddleware],
  create: [authMiddleware, guardMessageChild],
  write: [authMiddleware],
});
router.use('/read-receipts', readReceiptRouter);

// CRUD routes for Messages (Must be last to avoid capturing sub-routes as IDs)
createCrudRoutes(router, messageController, {
  read: [authMiddleware],
  create: [authMiddleware, preparePost],
  write: [authMiddleware, guardMessageWrite],
});

module.exports = router;
