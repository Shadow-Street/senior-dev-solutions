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
 *                 active subscription to that room
 */
const { Op } = require('sequelize');
const db = require('../models');
const { effectiveRole, ADMIN_ROLES } = require('./roles');

// Same staff set as the CRUD factory's per-record checks (sub_admin: see BE-7).
const STAFF_ROLES = [...ADMIN_ROLES, 'sub_admin'];
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

/** Premium rooms need a premium account or an active subscription, every time. */
const hasPremiumAccess = (user, room) => user.is_premium === true || hasRoomSubscription(user, room.id);

/** May `user` add themselves to `room`? */
async function canJoinRoom(user, room) {
  if (!room || !user?.id) return false;
  if (isStaff(user) || isOwner(user, room)) return true;
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
    attributes: ['id'],
  });
  const ids = new Set(openRooms.map((r) => r.id));

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
  roomRole,
  readableRoomIds,
  roomScope,
};
