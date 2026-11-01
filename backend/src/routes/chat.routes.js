const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");
const {
  isStaff, canJoinRoom, roomRole, findRoom, roomScope, ROOM_MANAGER_ROLES, ASSIGNABLE_BY_MODERATOR, ASSIGNABLE_BY_ADMIN,
} = require("../utils/roomAccess");

// Chat Rooms CRUD. Rooms are browsable by any signed-in user; only the owner
// or staff may change or delete one, owner_id cannot be reassigned by the
// owner, and the counters are server-maintained.
const chatRoomController = createCrudController(db.ChatRoom, {
  defaultOrderBy: 'updated_at',
  defaultOrder: 'DESC',
  ownership: { field: 'owner_id', publicRead: true },
  protectedFields: ['participant_count', 'last_message_at'],
  // Access tier is decided at creation (premium needs a premium creator) or
  // by staff; an owner flipping it later would skip that check.
  beforeUpdate: async (data, _record, req) => {
    if (isStaff(req.user)) return data;
    const { is_premium: _p, room_type: _t, required_plan: _r, vip_features_enabled: _v, ...rest } = data;
    return rest;
  },
  beforeCreate: async (data, req) => {
    // Set metadata
    data.owner_id = req.user.id;
    data.created_by = req.user.email;
    // Server-maintained; the client's value is stripped as a protected field,
    // and a NULL count would never move under increment().
    if (data.participant_count == null) data.participant_count = 0;

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
    console.error('[chat.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('[chat.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join room. Private rooms are invite-only and premium rooms need a premium
// account or an active room subscription (utils/roomAccess.canJoinRoom).
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await findRoom(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const existing = await db.ChatRoomParticipant.findOne({
      where: { chat_room_id: id, user_id: req.user.id }
    });

    if (existing) {
      return res.json(existing);
    }
    if (!(await canJoinRoom(req.user, room))) {
      return res.status(403).json({ error: 'You cannot join this room' });
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
    console.error('[chat.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave room
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Leaving would erase the mute (rejoining starts a fresh row).
    const membership = await db.ChatRoomParticipant.findOne({ where: { chat_room_id: id, user_id: req.user.id } });
    if (membership?.muted) return res.status(403).json({ error: 'You cannot leave while muted' });

    const removed = await db.ChatRoomParticipant.destroy({
      where: { chat_room_id: id, user_id: req.user.id }
    });

    // Only a real departure moves the counter; repeated calls used to drive
    // it negative.
    if (removed) await db.ChatRoom.decrement('participant_count', { where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[chat.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Participants sub-routes.
//
// This table decides who can read a private room and who moderates it, and
// it used to be plain CRUD: anyone could insert themselves as moderator.
// Now reads follow room visibility, and writes follow rank — a manager may
// only act on participants ranked below them, and only the owner or staff
// may make someone a room admin. Joining yourself goes through /:id/join.
const RANK = { member: 0, moderator: 1, admin: 2, owner: 3, staff: 4 };
const OWNER_ASSIGNABLE = ['member', 'moderator', 'admin'];
const rankOf = (role) => RANK[role] ?? 0;

/** The target participant's rank; the room's owner_id outranks any row role. */
const targetRank = (room, participant) =>
  (room && room.owner_id && String(room.owner_id) === String(participant.user_id) ? RANK.owner : rankOf(participant.role));

/** Returns an error message when `caller` (with `callerRole`) may not assign `role`. */
const roleError = (callerRole, role) => {
  if (role === undefined) return null;
  const rank = rankOf(callerRole);
  const allowed = rank >= RANK.owner ? OWNER_ASSIGNABLE : rank >= RANK.admin ? ASSIGNABLE_BY_ADMIN : ASSIGNABLE_BY_MODERATOR;
  return allowed.includes(role) ? null : 'You cannot assign that role';
};

async function prepareParticipantCreate(req, res, next) {
  try {
    const { chat_room_id: roomId, user_id: userId, role } = req.body || {};
    if (typeof roomId !== 'string' || typeof userId !== 'string' || !roomId || !userId) {
      return res.status(400).json({ error: 'chat_room_id and user_id are required' });
    }
    const room = await findRoom(roomId);
    const callerRole = await roomRole(req.user, room);
    if (!room || !(callerRole === 'staff' || ROOM_MANAGER_ROLES.includes(callerRole))) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const invalid = roleError(callerRole, role);
    if (invalid) return res.status(403).json({ error: invalid });

    // Adding someone twice must not create a second row or count them twice.
    const existing = await db.ChatRoomParticipant.findOne({ where: { chat_room_id: roomId, user_id: userId } });
    if (existing) return res.json(existing);

    req.body = { chat_room_id: roomId, user_id: userId, role: role || 'member', joined_at: new Date() };
    return next();
  } catch (error) {
    console.error('[chat.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function guardParticipantWrite(req, res, next) {
  if (!req.params.id) return next(); // staff-only /bulk routes
  try {
    const participant = await db.ChatRoomParticipant.findByPk(req.params.id);
    if (!participant) return res.status(404).json({ error: 'Record not found' });
    const room = await findRoom(participant.chat_room_id);
    const callerRole = await roomRole(req.user, room);
    const self = String(participant.user_id) === String(req.user.id);
    const outranks = rankOf(callerRole) > targetRank(room, participant);

    if (req.method === 'DELETE') {
      // Leaving is allowed unless muted (rejoining would clear the mute);
      // removing someone else needs a higher rank.
      if (outranks) return next();
      if (self) return participant.muted ? res.status(403).json({ error: 'You cannot leave while muted' }) : next();
      return res.status(404).json({ error: 'Record not found' });
    }

    if (self && !outranks) {
      req.body = 'last_read_at' in (req.body || {}) ? { last_read_at: req.body.last_read_at } : {};
      return next();
    }
    if (!outranks) return res.status(404).json({ error: 'Record not found' });

    const data = {};
    if ('muted' in (req.body || {})) data.muted = Boolean(req.body.muted);
    if ('role' in (req.body || {})) {
      const invalid = roleError(callerRole, req.body.role);
      if (invalid) return res.status(403).json({ error: invalid });
      data.role = req.body.role;
    }
    req.body = data;
    return next();
  } catch (error) {
    console.error('[chat.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const participantRouter = express.Router();
const participantController = createCrudController(db.ChatRoomParticipant, {
  scope: roomScope,
  afterCreate: async (record) => {
    await db.ChatRoom.increment('participant_count', { where: { id: record.chat_room_id } });
  },
  beforeDelete: async (record, req) => {
    req.__removedParticipant = record;
  },
  // A removed participant must also stop receiving the room's live traffic:
  // the WebSocket server only re-checks membership on join.
  afterDelete: async (_id, req) => {
    const removed = req.__removedParticipant;
    await db.ChatRoom.decrement('participant_count', { where: { id: removed.chat_room_id } });
    req.app.get('wsService')?.evictFromRoom(removed.user_id, removed.chat_room_id);
  },
});
createCrudRoutes(participantRouter, participantController, {
  read: [authMiddleware],
  create: [authMiddleware, prepareParticipantCreate],
  write: [authMiddleware, guardParticipantWrite],
});
router.use('/participants', participantRouter);


// Paid per-room subscriptions. Mounted before the CRUD block below for the
// same reason as /participants: a generated '/:id' would otherwise match
// '/subscriptions' as an id. A member sees their own; staff see all, which is
// what the Premium and Access panels in Chat Room Management list.
const roomSubRouter = express.Router();
createCrudRoutes(
  roomSubRouter,
  createCrudController(db.RoomSubscription, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC',
    ownership: 'user_id',
    // Whether a subscription is active, and what was paid, is settled by the
    // payment flow and staff — not asserted by the subscriber.
    protectedFields: ['status', 'amount_paid', 'payment_reference', 'expires_at'],
    // The column defaults to 'active', so stripping `status` alone still
    // produced an active subscription — a free pass into any premium room
    // now that joining checks for one. A subscriber's own row starts pending.
    beforeCreate: async (data, req) => (isStaff(req.user) ? data : { ...data, status: 'pending' }),
    // Moving an active subscription to another room would unlock that room.
    beforeUpdate: async (data, _record, req) => {
      if (isStaff(req.user)) return data;
      const { room_id: _roomId, start_date: _start, ...rest } = data;
      return rest;
    },
  }),
  { read: [authMiddleware], write: [authMiddleware] }
);
router.use('/subscriptions', roomSubRouter);


// CRUD LAST — the generated '/:id' route must not shadow the sub-routers
// mounted above. Registered earlier, '/clients', '/participants' and the
// like were matched as an id and answered 404 'Record not found'.
createCrudRoutes(router, chatRoomController, [authMiddleware]);

module.exports = router;
