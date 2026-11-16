/**
 * Who may read, join and run a chat room.
 *
 * Shared by the chat, message and meeting routes and the WebSocket server so
 * the rules cannot drift apart. They were separate copies before, and the
 * participant table they all trusted was writable by anyone — a user could
 * add themselves to a private room as moderator, then read it and run its
 * meetings.
 *
 *   open room     is_public is not false and is_premium is not true
 *                 (is_public is NULL on most existing rooms, so testing for
 *                 `true` would make every room members-only)
 *   private room  is_public === false: invite only, by the owner/a manager/staff
 *   premium room  is_premium === true: joinable with a premium account or an
 *                 active subscription to that room; required_plan 'vip' needs
 *                 a live VIP platform plan (or that room subscription)
 *
 * Room-level moderation set from Super Admin > Chat Room Management lives in
 * chat_rooms.status and chat_rooms.settings (no extra tables, no extra query):
 *   status 'archived'/'suspended'  read-only; nobody but staff joins or posts
 *   settings.locked                only the room's managers and staff post
 *   settings.bans[]                banned users cannot join, read or post
 */
const { Op } = require('sequelize');
const db = require('../models');
const { effectiveRole, ADMIN_ROLES } = require('./roles');

// Room staff are admins and super admins. sub_admin used to count, which let a
// sub-admin read every private/premium room and skip bans and locks although
// they have no access to Chat Room Management.
const STAFF_ROLES = [...ADMIN_ROLES];
const isStaff = (user) => STAFF_ROLES.includes(effectiveRole(user));

/** chat_room_participants.role values that may moderate a room. */
const ROOM_MANAGER_ROLES = ['owner', 'admin', 'moderator'];
/**
 * Values a moderator may hand out. Not 'moderator': managers skip the premium
 * re-check, so moderators minting moderators would give away premium rooms.
 * Room admins may appoint moderators; owner/admin is the owner's call.
 */
const ASSIGNABLE_BY_MODERATOR = ['member'];
const ASSIGNABLE_BY_ADMIN = ['member', 'moderator'];

const isOpenRoom = (room) => room.is_public !== false && room.is_premium !== true;

/** chat_rooms.settings as an object (mysql2 parses JSON; other drivers return text). */
function roomSettings(room) {
  const raw = room?.settings;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** True when an admin has banned `user` from `room`. */
const isBannedFrom = (user, room) => {
  const bans = roomSettings(room).bans;
  return Boolean(user?.id && Array.isArray(bans) && bans.some((b) => String(b?.user_id) === String(user.id)));
};

/** Archived and suspended rooms are read-only. NULL (older rows) means active. */
const isRoomClosed = (room) => Boolean(room?.status && room.status !== 'active');
const isRoomLocked = (room) => roomSettings(room).locked === true;

/**
 * A room as members and the public see it: chat_rooms.settings holds the ban
 * list (user ids, reasons) and who locked the room, so it is replaced by the
 * derived flags the chat UI needs.
 */
function memberRoomView(room) {
  if (!room) return room;
  const plain = typeof room.toJSON === 'function' ? room.toJSON() : { ...room };
  const settings = roomSettings(plain);
  const { settings: _settings, ...rest } = plain;
  return {
    ...rest,
    locked: settings.locked === true,
    lock_reason: settings.locked === true ? settings.lock_reason || null : null,
    archived: isRoomClosed(plain),
  };
}
const isOwner = (user, room) => Boolean(room?.owner_id && user?.id && String(room.owner_id) === String(user.id));

const findRoom = (roomId) =>
  (typeof roomId === 'string' && roomId ? db.ChatRoom.findByPk(roomId) : Promise.resolve(null));

const findMembership = (user, roomId) =>
  db.ChatRoomParticipant.findOne({ where: { chat_room_id: roomId, user_id: user.id } });

/** True when the user holds an active, unexpired subscription to this room. */
async function hasRoomSubscription(user, roomId) {
  const sub = await db.RoomSubscription.findOne({
    where: { user_id: user.id, room_id: roomId, status: 'active' },
  });
  return Boolean(sub && (!sub.expires_at || new Date(sub.expires_at) > new Date()));
}

/** True when the user's live platform plan (not an advisor plan) is a VIP plan. */
async function hasVipPlan(user) {
  const rows = await db.Subscription.findAll({
    where: { user_id: user.id, advisor_id: null, finfluencer_id: null, status: 'active' },
    include: [{ model: db.SubscriptionPlan, required: false }],
  });
  const now = new Date();
  return rows.some((s) => {
    if (s.end_date && new Date(s.end_date) <= now) return false;
    const name = String((s.SubscriptionPlan && s.SubscriptionPlan.name) || s.plan_type || '').toLowerCase();
    return name.includes('vip');
  });
}

/**
 * Premium rooms need a premium account or an active subscription, every time.
 * A room gated to the VIP tier needs a VIP plan: a Premium plan is not enough.
 */
async function hasPremiumAccess(user, room) {
  const vipOnly = String(room.required_plan || '').toLowerCase() === 'vip';
  if (!vipOnly && user.is_premium === true) return true;
  if (await hasRoomSubscription(user, room.id)) return true;
  return vipOnly ? hasVipPlan(user) : false;
}

/** May `user` add themselves to `room`? */
async function canJoinRoom(user, room) {
  if (!room || !user?.id) return false;
  if (isStaff(user)) return true;
  if (isBannedFrom(user, room) || isRoomClosed(room)) return false;
  if (isOwner(user, room)) return true;
  if (room.is_public === false) return false;
  if (room.is_premium === true) return hasPremiumAccess(user, room);
  return true;
}

/** May `user` read `roomId`'s content? */
async function canReadRoom(user, roomId) {
  if (!user?.id) return false;
  if (isStaff(user)) return true;
  const room = await findRoom(roomId);
  if (!room) return false;
  if (isBannedFrom(user, room)) return false;
  if (isOpenRoom(room) || isOwner(user, room)) return true;
  const membership = await findMembership(user, room.id);
  if (!membership) return false;
  // Joining a premium room once must not grant it forever: a lapsed
  // subscription loses access, though the room's moderators keep theirs.
  if (room.is_premium === true && !ROOM_MANAGER_ROLES.includes(membership.role)) {
    return hasPremiumAccess(user, room);
  }
  return true;
}

/** The room's role for `user`: 'staff', 'owner', a participant role, or null. */
async function roomRole(user, room) {
  if (!user?.id) return null;
  if (isStaff(user)) return 'staff';
  if (!room) return null;
  if (isOwner(user, room)) return 'owner';
  const membership = await findMembership(user, room.id);
  return membership ? membership.role || 'member' : null;
}

/** Staff, the owner, or a participant whose role is owner/admin/moderator. */
async function canManageRoom(user, room) {
  const role = await roomRole(user, room);
  return role === 'staff' || ROOM_MANAGER_ROLES.includes(role);
}

/**
 * Adds `userId` to a room once. chat_room_participants is meant to be unique
 * on (chat_room_id, user_id) (migration 002, re-asserted by 023); a duplicate
 * row could dodge a mute, so a concurrent insert that hits the unique key is
 * resolved to the existing row instead of failing. Moves the counter only
 * for a real insert.
 */
async function ensureParticipant(roomId, userId, role = 'member') {
  const where = { chat_room_id: roomId, user_id: userId };
  const existing = await db.ChatRoomParticipant.findOne({ where });
  if (existing) return { participant: existing, created: false };
  try {
    const participant = await db.ChatRoomParticipant.create({ ...where, role, joined_at: new Date(), muted: false });
    await db.ChatRoom.increment('participant_count', { where: { id: roomId } });
    return { participant, created: true };
  } catch (e) {
    if (e?.name !== 'SequelizeUniqueConstraintError') throw e;
    return { participant: await db.ChatRoomParticipant.findOne({ where }), created: false };
  }
}

/**
 * Why `user` may not post in `room` right now, or null when they may.
 * Covers the room-wide rules (closed, banned, locked, admin-only posting);
 * membership and mutes are checked by the callers, which already hold the
 * participant row. Messages keep their existing wording.
 */
async function postingBlockReason(user, room) {
  if (!room) return 'Room not found';
  if (isStaff(user)) return null;
  if (isBannedFrom(user, room)) return 'You cannot post in this room';
  if (isRoomClosed(room)) return 'This room is archived and read-only';
  if ((isRoomLocked(room) || room.admin_only_post) && !(await canManageRoom(user, room))) {
    return isRoomLocked(room) ? 'This room is locked by an administrator' : 'Only moderators can post in this room';
  }
  return null;
}

/**
 * Room ids `user` may read: open rooms, rooms they own, rooms they are in.
 * Cached on the request, since list scopes and per-record checks both need it.
 */
async function readableRoomIds(req) {
  if (req.__readableRooms) return req.__readableRooms;

  const openRooms = await db.ChatRoom.findAll({
    where: {
      [Op.and]: [
        { [Op.or]: [{ is_public: { [Op.ne]: false } }, { is_public: null }] },
        { [Op.or]: [{ is_premium: { [Op.ne]: true } }, { is_premium: null }] },
      ],
    },
    attributes: ['id', 'settings'],
  });
  const ids = new Set(openRooms.filter((r) => !isBannedFrom(req.user, r)).map((r) => r.id));

  if (req.user?.id) {
    const owned = await db.ChatRoom.findAll({ where: { owner_id: req.user.id }, attributes: ['id'] });
    owned.forEach((r) => ids.add(r.id));
    const memberships = await db.ChatRoomParticipant.findAll({
      where: { user_id: req.user.id },
      attributes: ['chat_room_id', 'role'],
    });
    // Same premium rule as canReadRoom, checked per membership.
    for (const m of memberships) {
      if (ids.has(m.chat_room_id)) continue;
      if (await canReadRoom(req.user, m.chat_room_id)) ids.add(m.chat_room_id);
    }
  }

  req.__readableRooms = ids;
  return ids;
}

/**
 * crudController `scope` for rows that carry a chat_room_id. Wrapped in Op.and
 * so it narrows a client's own chat_room_id filter instead of replacing it,
 * and an empty set matches nothing rather than everything.
 */
const roomScope = {
  listWhere: async (req) => {
    const ids = await readableRoomIds(req);
    return { [Op.and]: [{ chat_room_id: { [Op.in]: ids.size ? [...ids] : ['__none__'] } }] };
  },
  allows: async (req, record) => Boolean(record) && canReadRoom(req.user, record.chat_room_id),
};

module.exports = {
  ROOM_MANAGER_ROLES,
  ASSIGNABLE_BY_MODERATOR,
  ASSIGNABLE_BY_ADMIN,
  isStaff,
  isOwner,
  findRoom,
  findMembership,
  canJoinRoom,
  canReadRoom,
  canManageRoom,
  postingBlockReason,
  roomSettings,
  isBannedFrom,
  isRoomClosed,
  isRoomLocked,
  memberRoomView,
  ensureParticipant,
  hasVipPlan,
  hasPremiumAccess,
  roomRole,
  readableRoomIds,
  roomScope,
};
