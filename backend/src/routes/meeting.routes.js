const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");
const { effectiveRole, ADMIN_ROLES } = require("../utils/roles");

/**
 * A meeting is a link posted into a chat room and opened by every member, so
 * two rules matter: the link must be a real https meeting URL (javascript: or
 * data: here runs in members' browsers, and an arbitrary host is a phishing
 * page with the room's endorsement), and only the person who started it, a
 * room moderator or staff may change or end it.
 */

const STAFF_ROLES = [...ADMIN_ROLES, 'sub_admin'];
const isStaff = (user) => STAFF_ROLES.includes(effectiveRole(user));

/** chat_room_participants.role values that may run a room's meetings. */
const ROOM_MANAGER_ROLES = ['owner', 'admin', 'moderator'];

/** Meeting providers we link to. A leading dot also allows subdomains. */
const MEETING_HOSTS = ['meet.google.com', 'zoom.us', '.zoom.us', 'teams.microsoft.com', 'teams.live.com'];
const MEETING_STATUSES = ['scheduled', 'active', 'ended', 'cancelled'];

/** Returns the normalised URL when it is an https link to a known provider, else null. */
function safeMeetingUrl(value) {
  if (typeof value !== 'string') return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const known = MEETING_HOSTS.some((h) => (h.startsWith('.') ? host.endsWith(h) : host === h));
  // Measured after normalisation (percent-encoding grows it) to fit the column.
  return known && url.href.length <= 255 ? url.href : null;
}

/** Open rooms are readable by anyone signed in; private or premium ones by participants. */
async function canReadRoom(req, roomId) {
  if (isStaff(req.user)) return true;
  if (typeof roomId !== 'string' || !roomId) return false;
  const room = await db.ChatRoom.findByPk(roomId);
  if (!room) return false;
  if (room.is_public !== false && room.is_premium !== true) return true;
  const membership = await db.ChatRoomParticipant.findOne({
    where: { chat_room_id: roomId, user_id: req.user.id },
  });
  return Boolean(membership);
}

/** The meeting's host, the room owner, a room moderator/admin, or staff. */
async function canManageMeeting(req, meeting) {
  if (isStaff(req.user)) return true;
  const userId = String(req.user.id);
  if (meeting.host_id && String(meeting.host_id) === userId) return true;
  if (!meeting.chat_room_id) return false;

  const room = await db.ChatRoom.findByPk(meeting.chat_room_id);
  if (room && room.owner_id && String(room.owner_id) === userId) return true;
  const membership = await db.ChatRoomParticipant.findOne({
    where: { chat_room_id: meeting.chat_room_id, user_id: req.user.id },
  });
  return Boolean(membership && ROOM_MANAGER_ROLES.includes(membership.role));
}

/**
 * Loads the meeting named by :id and refuses unless the caller may manage it.
 * Routes without an id (the staff-only /bulk ones) pass through untouched.
 * Unknown and not-permitted both answer 404, so ids cannot be probed.
 */
async function requireMeetingManager(req, res, next) {
  if (!req.params.id) return next();
  try {
    const meeting = await db.Meeting.findByPk(req.params.id);
    if (!meeting || !(await canManageMeeting(req, meeting))) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    req.meeting = meeting;
    return next();
  } catch (error) {
    console.error('[meeting.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Writable fields. host_id is the caller; chat_room_id is fixed at creation so
// a meeting cannot be moved into another room. recording_url is any https
// host, so only staff may set it.
const CREATE_FIELDS = ['chat_room_id', 'stock_symbol', 'meeting_url', 'status', 'start_time', 'max_participants', 'title', 'description'];
const UPDATE_FIELDS = ['stock_symbol', 'meeting_url', 'status', 'start_time', 'end_time', 'max_participants', 'title', 'description'];
const STAFF_UPDATE_FIELDS = [...UPDATE_FIELDS, 'recording_url'];

const pick = (body, fields) => {
  const out = {};
  for (const field of fields) {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) out[field] = body[field];
  }
  return out;
};

/** Validates shared fields in place; returns an error message or null. */
function validateMeetingFields(data) {
  if ('meeting_url' in data) {
    const url = safeMeetingUrl(data.meeting_url);
    if (!url) return 'meeting_url must be an https link to Google Meet, Zoom or Microsoft Teams';
    data.meeting_url = url;
  }
  if ('recording_url' in data && data.recording_url != null) {
    try {
      if (new URL(String(data.recording_url)).protocol !== 'https:') return 'recording_url must be an https link';
    } catch {
      return 'recording_url must be an https link';
    }
  }
  if ('status' in data && !MEETING_STATUSES.includes(data.status)) return 'Invalid status';
  return null;
}

/** Whitelists and validates a create payload; the caller becomes the host. */
async function prepareCreate(req, res, next) {
  try {
    const data = pick(req.body, CREATE_FIELDS);
    if (typeof data.chat_room_id !== 'string' || !data.chat_room_id) {
      return res.status(400).json({ error: 'chat_room_id is required' });
    }
    if (!data.meeting_url) return res.status(400).json({ error: 'meeting_url is required' });
    const invalid = validateMeetingFields(data);
    if (invalid) return res.status(400).json({ error: invalid });
    if (!(await canReadRoom(req, data.chat_room_id))) {
      return res.status(403).json({ error: 'Not permitted in this room' });
    }
    req.body = { ...data, host_id: req.user.id };
    return next();
  } catch (error) {
    console.error('[meeting.routes.js] request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/** Whitelists and validates an update payload. */
function prepareUpdate(req, res, next) {
  if (!req.params.id || req.method !== 'PUT') return next();
  const data = pick(req.body, isStaff(req.user) ? STAFF_UPDATE_FIELDS : UPDATE_FIELDS);
  const invalid = validateMeetingFields(data);
  if (invalid) return res.status(400).json({ error: invalid });
  req.body = data;
  return next();
}

/**
 * Reads follow room visibility. With ?chat_room_id the caller must be able to
 * read that room; without it, only rooms they take part in (narrower than
 * messages, which also list open rooms; the UI always passes chat_room_id). Wrapped in Op.and
 * so it narrows the client's own chat_room_id filter instead of replacing it.
 */
const meetingScope = {
  listWhere: async (req) => {
    const roomId = req.query.chat_room_id;
    if (roomId !== undefined) {
      return (await canReadRoom(req, roomId)) ? {} : { id: '__none__' };
    }
    const memberships = await db.ChatRoomParticipant.findAll({
      where: { user_id: req.user.id },
      attributes: ['chat_room_id'],
    });
    const ids = memberships.map((m) => m.chat_room_id);
    return { [Op.and]: [{ chat_room_id: { [Op.in]: ids.length ? ids : ['__none__'] } }] };
  },
  // A host or room owner without a participant row in a private room may
  // still manage (and so read back) their meeting.
  allows: async (req, record) =>
    Boolean(record) && ((await canReadRoom(req, record.chat_room_id)) || canManageMeeting(req, record)),
};

// Meetings CRUD
const meetingController = createCrudController(db.Meeting, {
  defaultOrderBy: 'start_time',
  defaultOrder: 'DESC',
  scope: meetingScope,
});

// Get active meeting for room. Chat rooms are behind login, and a private
// room's meeting link must not be readable by outsiders.
router.get('/room/:roomId/active', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!(await canReadRoom(req, roomId))) {
      return res.status(404).json({ error: 'Room not found' });
    }
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
router.put('/:id/end', authMiddleware, requireMeetingManager, async (req, res) => {
  try {
    await req.meeting.update({
      status: 'ended',
      end_time: new Date()
    });

    res.json(req.meeting);
  } catch (error) {
    console.error('[meeting.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD routes. Reads follow room visibility (scope above); create needs room
// access; update and delete need the host, a room moderator or staff. The
// write chain also guards the /bulk routes, which have no :id and stay
// staff-only inside the CRUD factory.
createCrudRoutes(router, meetingController, {
  read: [authMiddleware],
  create: [authMiddleware, prepareCreate],
  write: [authMiddleware, requireMeetingManager, prepareUpdate],
});

module.exports = router;
module.exports.safeMeetingUrl = safeMeetingUrl;
