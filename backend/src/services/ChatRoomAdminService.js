/**
 * Super Admin > Chat Room Management.
 *
 * The screen used to stitch its numbers together in the browser from capped
 * list endpoints (200 rows), wrote fields the models do not have (is_banned,
 * muted_until, allowed_user_ids, ...) and showed hard-coded moderator lists.
 * Everything it does now goes through here: validated fields only, one audit
 * row per admin action, and live effects over the WebSocket server (removed
 * and banned users are evicted, deleted/pinned messages update open rooms).
 *
 * Room-level moderation is stored on the room itself (see utils/roomAccess):
 * status 'archived' (read-only), settings.locked, settings.bans[].
 */
const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const db = require('../models');
const {
  roomSettings, isStaff, canReadRoom, hasPremiumAccess, isBannedFrom, isRoomClosed, isRoomLocked, ensureParticipant,
} = require('../utils/roomAccess');
const { effectiveRole } = require('../utils/roles');

class ChatAdminError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ROOM_TYPES = ['general', 'stock_specific', 'sector', 'admin', 'premium', 'premium_admin'];
const PREMIUM_TYPES = ['premium', 'premium_admin'];
const PLANS = ['free', 'premium', 'vip'];
const PARTICIPANT_ROLES = ['member', 'moderator', 'admin'];
const INVITE_ROLES = ['member', 'moderator'];
const ROOM_FIELDS = ['name', 'description', 'room_type', 'stock_symbol', 'is_public', 'admin_only_post', 'required_plan'];
const USER_ATTRS = ['id', 'name', 'display_name', 'email', 'profile_image_url', 'app_role', 'role', 'status', 'is_premium'];
const RESTRICTED_ACCOUNT = ['suspended', 'banned', 'inactive'];
const MAX_IDS = 200;

const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 64;
const plain = (r) => (r && typeof r.toJSON === 'function' ? r.toJSON() : r ? { ...r } : r);
const bool = (v) => v === true || v === 'true' || v === 1 || v === '1';

/** 'basic', 'none', '' and NULL are the Free tier. */
function normalizePlan(value) {
  const p = String(value ?? '').trim().toLowerCase();
  if (!p || p === 'basic' || p === 'none' || p === 'free') return 'free';
  return p;
}

/** Audit row for an admin action. Never throws: the action has already happened. */
function audit(req, action, entityType, entityId, { oldData = null, newData = null, description = action } = {}) {
  return db.AuditLog.create({
    user_id: req?.user?.id || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    old_data: oldData,
    new_data: newData,
    description: String(description).slice(0, 1000),
    ip_address: req?.ip ? String(req.ip).slice(0, 45) : null,
    user_agent: req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
  }).catch((e) => console.error('[ChatRoomAdminService] audit write failed:', e && e.message));
}

const wsOf = (req) => (req?.app?.get ? req.app.get('wsService') : null) || null;
const onlineIds = (ws, roomId) => (ws && typeof ws.getOnlineUsers === 'function' ? ws.getOnlineUsers(roomId) : []);

async function mustFindRoom(roomId, options = {}) {
  const room = isId(roomId) ? await db.ChatRoom.findByPk(roomId, options) : null;
  if (!room) throw new ChatAdminError(404, 'Room not found');
  return room;
}

async function mustFindUser(userId) {
  const user = isId(userId) ? await db.User.findByPk(userId, { attributes: { exclude: ['password'] } }) : null;
  if (!user) throw new ChatAdminError(404, 'User not found');
  return user;
}

// ---- rooms ---------------------------------------------------------------

/** The editable fields present in `body`, nothing else. */
function pickRoomFields(body = {}) {
  const out = {};
  for (const field of ROOM_FIELDS) {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) out[field] = body[field];
  }
  return out;
}

/** Validates a complete room (create, or the merged result of an edit). */
function validateRoom(input) {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });
  const name = String(input.name ?? '').trim();
  if (name.length < 2) err('name', 'Room name must be at least 2 characters');
  if (name.length > 100) err('name', 'Room name must be 100 characters or fewer');

  const description = String(input.description ?? '').trim();
  if (description.length > 1000) err('description', 'Description must be 1000 characters or fewer');

  const roomType = String(input.room_type || 'general');
  if (!ROOM_TYPES.includes(roomType)) err('room_type', 'Unknown room type');

  const symbol = String(input.stock_symbol ?? '').trim().toUpperCase();
  if (symbol && !/^[A-Z0-9&._-]{1,20}$/.test(symbol)) err('stock_symbol', 'Stock symbol may use letters, digits, &, ., _ and - (max 20)');
  if (roomType === 'stock_specific' && !symbol) err('stock_symbol', 'Stock symbol is required for stock-specific rooms');

  let plan = normalizePlan(input.required_plan);
  if (!PLANS.includes(plan)) err('required_plan', 'Plan must be free, premium or vip');
  // Premium room types are paid rooms by definition.
  if (PREMIUM_TYPES.includes(roomType) && plan === 'free') plan = 'premium';

  return {
    errors,
    data: {
      name,
      description: description || null,
      room_type: roomType,
      stock_symbol: symbol || null,
      is_public: input.is_public === undefined || input.is_public === null ? true : bool(input.is_public),
      admin_only_post: bool(input.admin_only_post),
      required_plan: plan,
      is_premium: plan !== 'free',
    },
  };
}

function assertValid({ errors }) {
  if (errors.length) throw new ChatAdminError(400, errors[0].message, 'VALIDATION');
}

async function assertSymbolFree(symbol, exceptId = null) {
  if (!symbol) return;
  const where = { stock_symbol: symbol };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  if (await db.ChatRoom.findOne({ where })) {
    throw new ChatAdminError(409, `A chat room for ${symbol} already exists`, 'DUPLICATE_SYMBOL');
  }
}

/** The room's editable state, normalised the same way validateRoom does. */
const roomSnapshot = (room) => validateRoom({ ...plain(room) }).data;

/** What members may see about a room in a live update (no ban list). */
function publicRoom(room) {
  const r = plain(room);
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    room_type: r.room_type,
    stock_symbol: r.stock_symbol,
    is_public: r.is_public,
    is_premium: r.is_premium,
    required_plan: r.required_plan,
    admin_only_post: r.admin_only_post,
    status: r.status || 'active',
    locked: isRoomLocked(r),
  };
}

/** The admin view of a room: real counts, live presence, moderation state. */
function presentRoom(room, { messages = 0, participants = 0, online = 0, lastActivity = null } = {}) {
  const r = plain(room);
  const settings = roomSettings(r);
  const { settings: _settings, ...rest } = r;
  return {
    ...rest,
    status: r.status || 'active',
    required_plan: normalizePlan(r.required_plan),
    locked: settings.locked === true,
    lock_reason: settings.lock_reason || null,
    ban_count: Array.isArray(settings.bans) ? settings.bans.length : 0,
    message_count: Number(messages) || 0,
    participant_count: Number(participants) || 0,
    online_count: online,
    last_activity_at: lastActivity || r.last_message_at || null,
  };
}

const countMap = (rows, key = 'chat_room_id', value = 'count') =>
  new Map(rows.map((row) => [String(row[key]), Number(row[value]) || 0]));

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Every room with real counts, plus the header stats. */
async function overview(req) {
  const ws = wsOf(req);
  const rooms = await db.ChatRoom.findAll({ order: [['created_at', 'DESC']], limit: 2000 });
  const [messageRows, participantRows, todayRows, lastRows] = await Promise.all([
    db.Message.findAll({ attributes: ['chat_room_id', [fn('COUNT', col('id')), 'count']], group: ['chat_room_id'], raw: true }),
    db.ChatRoomParticipant.findAll({ attributes: ['chat_room_id', [fn('COUNT', col('id')), 'count']], group: ['chat_room_id'], raw: true }),
    db.Message.findAll({
      attributes: ['chat_room_id', [fn('COUNT', col('id')), 'count']],
      where: { created_at: { [Op.gte]: startOfToday() } },
      group: ['chat_room_id'],
      raw: true,
    }),
    db.Message.findAll({ attributes: ['chat_room_id', [fn('MAX', col('created_at')), 'last']], group: ['chat_room_id'], raw: true }),
  ]);
  const messages = countMap(messageRows);
  const participants = countMap(participantRows);
  const today = countMap(todayRows);
  const last = new Map(lastRows.map((r) => [String(r.chat_room_id), r.last]));

  const presented = rooms.map((room) => presentRoom(room, {
    messages: messages.get(String(room.id)),
    participants: participants.get(String(room.id)),
    online: onlineIds(ws, room.id).length,
    lastActivity: last.get(String(room.id)),
  }));
  const roomIds = new Set(presented.map((r) => String(r.id)));

  return {
    rooms: presented,
    stats: {
      total: presented.length,
      active_now: presented.filter((r) => r.online_count > 0).length,
      premium: presented.filter((r) => r.is_premium === true || r.required_plan !== 'free').length,
      participants: presented.reduce((sum, r) => sum + r.participant_count, 0),
      messages: presented.reduce((sum, r) => sum + r.message_count, 0),
      active_today: [...today.keys()].filter((id) => roomIds.has(id)).length,
      online_users: ws?.clients?.size || 0,
    },
    generated_at: new Date().toISOString(),
  };
}

/**
 * After a change that can narrow access (visibility, plan, ban, archive):
 * tell the room, and evict anyone online who may no longer read it.
 */
async function afterRoomChange(req, room) {
  const ws = wsOf(req);
  if (!ws) return;
  ws.broadcastToRoom(room.id, { type: 'room_updated', room: publicRoom(room), timestamp: new Date().toISOString() });
  for (const userId of onlineIds(ws, room.id)) {
    const user = await db.User.findByPk(userId, { attributes: { exclude: ['password'] } });
    if (!user || !(await canReadRoom(user, room.id))) ws.evictFromRoom(userId, room.id);
  }
}

async function createRoom(req, body) {
  const result = validateRoom(pickRoomFields(body));
  assertValid(result);
  await assertSymbolFree(result.data.stock_symbol);
  const room = await db.ChatRoom.create({
    ...result.data,
    owner_id: req.user.id,
    status: 'active',
    participant_count: 0,
    settings: {},
  });
  await audit(req, 'CHATROOM_CREATED', 'ChatRoom', room.id, {
    newData: result.data,
    description: `Created ${result.data.room_type} chat room "${result.data.name}"`,
  });
  return presentRoom(room);
}

/**
 * Edits only the fields sent. Only those fields are validated, so an older
 * room whose stored values predate today's rules (a one-letter name, an odd
 * symbol) can still be edited; the plan follows the room type.
 */
async function updateRoom(req, roomId, body) {
  const room = await mustFindRoom(roomId);
  const picked = pickRoomFields(body);
  const keys = Object.keys(picked);
  if (!keys.length) return presentRoom(room);

  const result = validateRoom({ ...plain(room), ...picked });
  const touches = (field) => keys.includes(field) || (field === 'stock_symbol' && keys.includes('room_type'));
  const relevant = result.errors.filter((e) => touches(e.field));
  if (relevant.length) throw new ChatAdminError(400, relevant[0].message, 'VALIDATION');
  if ('required_plan' in picked && normalizePlan(picked.required_plan) === 'free' && PREMIUM_TYPES.includes(result.data.room_type)) {
    throw new ChatAdminError(400, 'Premium room types cannot be Free. Change the room type first.', 'PLAN_TYPE_MISMATCH');
  }

  const changed = new Set(keys);
  if (changed.has('room_type') || changed.has('required_plan')) { changed.add('required_plan'); changed.add('is_premium'); }
  const changes = {};
  for (const key of changed) {
    if (room[key] !== result.data[key]) changes[key] = result.data[key];
  }
  if (!Object.keys(changes).length) return presentRoom(room);
  if ('stock_symbol' in changes) await assertSymbolFree(changes.stock_symbol, room.id);

  const oldData = Object.fromEntries(Object.keys(changes).map((k) => [k, room[k] ?? null]));
  await room.update(changes);
  await audit(req, 'CHATROOM_UPDATED', 'ChatRoom', room.id, {
    oldData,
    newData: changes,
    description: `Updated chat room "${room.name}" (${Object.keys(changes).join(', ')})`,
  });
  await afterRoomChange(req, room);
  return presentRoom(room);
}

/** Read-modify-write of chat_rooms.settings under a row lock. */
async function mutateSettings(roomId, mutator) {
  return db.sequelize.transaction(async (transaction) => {
    const room = await mustFindRoom(roomId, { transaction, lock: transaction.LOCK?.UPDATE });
    const next = mutator({ ...roomSettings(room) }, room);
    await room.update({ settings: next }, { transaction });
    return room;
  });
}

async function setRoomStatus(req, roomId, status) {
  if (!['active', 'archived'].includes(status)) throw new ChatAdminError(400, 'Status must be active or archived');
  const room = await mustFindRoom(roomId);
  const previous = room.status || 'active';
  if (previous === status) return presentRoom(room);
  await room.update({ status });
  const archived = status === 'archived';
  await audit(req, archived ? 'CHATROOM_ARCHIVED' : 'CHATROOM_RESTORED', 'ChatRoom', room.id, {
    oldData: { status: previous },
    newData: { status },
    description: `${archived ? 'Archived' : 'Restored'} chat room "${room.name}"`,
  });
  await afterRoomChange(req, room);
  return presentRoom(room);
}

async function setRoomLocked(req, roomId, locked, reason = '') {
  const lock = Boolean(locked);
  const room = await mutateSettings(roomId, (settings) => {
    if (lock) {
      return { ...settings, locked: true, lock_reason: String(reason || '').trim().slice(0, 300) || null, locked_by: req.user.id, locked_at: new Date().toISOString() };
    }
    const { locked: _l, lock_reason: _r, locked_by: _b, locked_at: _a, ...rest } = settings;
    return rest;
  });
  await audit(req, lock ? 'CHATROOM_LOCKED' : 'CHATROOM_UNLOCKED', 'ChatRoom', room.id, {
    newData: { locked: lock, reason: lock ? reason || null : null },
    description: `${lock ? 'Locked' : 'Unlocked'} chat room "${room.name}"`,
  });
  await afterRoomChange(req, room);
  return presentRoom(room);
}

/**
 * Permanently deletes a room and its messages, participants, invites, rules
 * and automations. Refused while paid room subscriptions are active (those
 * are payment records; archive the room instead). `confirm` must repeat the
 * room's name unless the caller already confirmed in bulk.
 */
async function deleteRoom(req, roomId, { confirm, confirmed = false } = {}) {
  const room = await mustFindRoom(roomId);
  if (!confirmed && String(confirm ?? '').trim() !== String(room.name).trim()) {
    throw new ChatAdminError(400, 'Type the room name exactly to confirm deletion', 'CONFIRM_REQUIRED');
  }
  const paid = await db.RoomSubscription.count({ where: { room_id: room.id, status: 'active' } });
  if (paid > 0) {
    throw new ChatAdminError(409, `This room has ${paid} active paid subscription(s). Archive it instead.`, 'HAS_SUBSCRIPTIONS');
  }
  const online = onlineIds(wsOf(req), room.id);
  const snapshot = roomSnapshot(room);

  await db.sequelize.transaction(async (transaction) => {
    const where = { chat_room_id: room.id };
    await db.Message.destroy({ where, transaction });
    await db.ChatRoomParticipant.destroy({ where, transaction });
    await db.ChatInvite.destroy({ where, transaction });
    await db.ModerationRule.destroy({ where, transaction });
    await db.RoomAutomation.destroy({ where, transaction });
    await room.destroy({ transaction });
  });

  const ws = wsOf(req);
  for (const userId of online) ws?.evictFromRoom(userId, room.id);
  await audit(req, 'CHATROOM_DELETED', 'ChatRoom', room.id, {
    oldData: snapshot,
    description: `Deleted chat room "${room.name}"`,
  });
  return { success: true, id: room.id };
}

const BULK_ACTIONS = ['archive', 'restore', 'lock', 'unlock', 'delete', 'set_plan', 'set_posting', 'set_visibility'];

async function bulkRooms(req, { ids, action, value, confirm } = {}) {
  if (!BULK_ACTIONS.includes(action)) throw new ChatAdminError(400, 'Unknown bulk action');
  if (!Array.isArray(ids) || !ids.length || ids.length > MAX_IDS || !ids.every(isId)) {
    throw new ChatAdminError(400, `Select between 1 and ${MAX_IDS} rooms`);
  }
  if (action === 'delete' && confirm !== 'DELETE') {
    throw new ChatAdminError(400, 'Type DELETE to confirm bulk deletion', 'CONFIRM_REQUIRED');
  }
  if (action === 'set_plan' && !PLANS.includes(normalizePlan(value))) throw new ChatAdminError(400, 'Plan must be free, premium or vip');

  const results = [];
  for (const id of [...new Set(ids)]) {
    try {
      if (action === 'archive') await setRoomStatus(req, id, 'archived');
      else if (action === 'restore') await setRoomStatus(req, id, 'active');
      else if (action === 'lock') await setRoomLocked(req, id, true);
      else if (action === 'unlock') await setRoomLocked(req, id, false);
      else if (action === 'delete') await deleteRoom(req, id, { confirmed: true });
      else if (action === 'set_plan') await updateRoom(req, id, { required_plan: normalizePlan(value) });
      else if (action === 'set_posting') await updateRoom(req, id, { admin_only_post: bool(value) });
      else if (action === 'set_visibility') await updateRoom(req, id, { is_public: bool(value) });
      results.push({ id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: e instanceof ChatAdminError ? e.message : 'Failed' });
      if (!(e instanceof ChatAdminError)) console.error('[ChatRoomAdminService] bulk item failed:', e.message);
    }
  }
  return { action, succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
}

// ---- participants, mutes, bans --------------------------------------------

const userSummary = (u) => {
  const x = plain(u) || {};
  return {
    id: x.id,
    name: x.display_name || x.name || x.email || 'Unknown user',
    email: x.email || null,
    profile_image_url: x.profile_image_url || null,
    app_role: effectiveRole(x),
    status: x.status || null,
    is_premium: x.is_premium === true,
  };
};

async function listParticipants(req, roomId) {
  const room = await mustFindRoom(roomId);
  const ws = wsOf(req);
  const [rows, counts] = await Promise.all([
    db.ChatRoomParticipant.findAll({
      where: { chat_room_id: room.id },
      include: [{ model: db.User, attributes: USER_ATTRS }],
      order: [['joined_at', 'ASC']],
      limit: 5000,
    }),
    db.Message.findAll({
      attributes: ['user_id', [fn('COUNT', col('id')), 'count']],
      where: { chat_room_id: room.id },
      group: ['user_id'],
      raw: true,
    }),
  ]);
  const messageCounts = countMap(counts, 'user_id');
  const online = new Set(onlineIds(ws, room.id).map(String));

  const bans = roomSettings(room).bans || [];
  const bannedUsers = bans.length
    ? await db.User.findAll({ where: { id: { [Op.in]: bans.map((b) => b.user_id) } }, attributes: USER_ATTRS })
    : [];
  const bannedById = new Map(bannedUsers.map((u) => [String(u.id), u]));

  return {
    room: presentRoom(room),
    participants: rows.map((p) => {
      const row = plain(p);
      const isOwnerRow = room.owner_id && String(room.owner_id) === String(row.user_id);
      return {
        id: row.id,
        user_id: row.user_id,
        role: isOwnerRow ? 'owner' : row.role || 'member',
        muted: row.muted === true,
        joined_at: row.joined_at || row.created_at || null,
        last_read_at: row.last_read_at || null,
        message_count: messageCounts.get(String(row.user_id)) || 0,
        online: online.has(String(row.user_id)),
        user: userSummary(row.User || { id: row.user_id }),
      };
    }),
    bans: bans.map((b) => ({
      user_id: b.user_id,
      reason: b.reason || null,
      banned_at: b.banned_at || null,
      banned_by: b.banned_by || null,
      user: userSummary(bannedById.get(String(b.user_id)) || { id: b.user_id }),
    })),
  };
}

/** Staff accounts and the acting admin are never muted, banned or removed from here. */
function assertModeratable(req, target, verb) {
  if (String(target.id) === String(req.user.id)) throw new ChatAdminError(403, `You cannot ${verb} yourself`);
  if (isStaff(target)) throw new ChatAdminError(403, `Staff accounts cannot be ${verb === 'ban' ? 'banned' : `${verb}d`} from a room`);
}

async function addParticipant(req, roomId, { user_id: userId, role = 'member' } = {}) {
  if (!PARTICIPANT_ROLES.includes(role)) throw new ChatAdminError(400, 'Role must be member, moderator or admin');
  const room = await mustFindRoom(roomId);
  if (isRoomClosed(room)) throw new ChatAdminError(409, 'Restore this room before adding people to it');
  const user = await mustFindUser(userId);
  if (RESTRICTED_ACCOUNT.includes(user.status)) throw new ChatAdminError(409, 'This account is restricted and cannot be added');
  if (isBannedFrom(user, room)) throw new ChatAdminError(409, 'This user is banned from the room. Unban them first.');

  const existing = await db.ChatRoomParticipant.findOne({ where: { chat_room_id: room.id, user_id: user.id } });
  if (existing) {
    if ((existing.role || 'member') !== role) {
      const previous = existing.role || 'member';
      await existing.update({ role });
      await audit(req, 'CHAT_PARTICIPANT_ROLE_CHANGED', 'ChatRoom', room.id, {
        oldData: { user_id: user.id, role: previous }, newData: { user_id: user.id, role },
        description: `Changed ${userSummary(user).name}'s role in "${room.name}" to ${role}`,
      });
    }
    return { participant: plain(existing), created: false };
  }

  const { participant, created } = await ensureParticipant(room.id, user.id, role);
  if (!created) return { participant: plain(participant), created: false };
  await audit(req, 'CHAT_PARTICIPANT_ADDED', 'ChatRoom', room.id, {
    newData: { user_id: user.id, role },
    description: `Added ${userSummary(user).name} to "${room.name}" as ${role}`,
  });
  wsOf(req)?.sendToUser?.(user.id, { type: 'added_to_room', roomId: room.id });
  return { participant: plain(participant), created: true };
}

async function updateParticipant(req, roomId, userId, body = {}) {
  const room = await mustFindRoom(roomId);
  const participant = isId(userId)
    ? await db.ChatRoomParticipant.findOne({ where: { chat_room_id: room.id, user_id: userId } })
    : null;
  if (!participant) throw new ChatAdminError(404, 'This user is not in the room');
  const user = await mustFindUser(userId);

  const changes = {};
  if ('role' in body) {
    if (!PARTICIPANT_ROLES.includes(body.role)) throw new ChatAdminError(400, 'Role must be member, moderator or admin');
    if (room.owner_id && String(room.owner_id) === String(user.id)) throw new ChatAdminError(409, "The room owner's role cannot be changed");
    if ((participant.role || 'member') !== body.role) changes.role = body.role;
  }
  if ('muted' in body) {
    const muted = bool(body.muted);
    if (muted) assertModeratable(req, user, 'mute');
    if (Boolean(participant.muted) !== muted) changes.muted = muted;
  }
  if (!Object.keys(changes).length) return plain(participant);

  const oldData = { role: participant.role || 'member', muted: Boolean(participant.muted) };
  // Applied to every row for this user in the room, so a duplicate row left
  // by an old race cannot dodge a mute.
  await db.ChatRoomParticipant.update(changes, { where: { chat_room_id: room.id, user_id: user.id } });
  Object.assign(participant, changes);
  const name = userSummary(user).name;
  let action = 'CHAT_PARTICIPANT_ROLE_CHANGED';
  let description = `Changed ${name}'s role in "${room.name}" to ${changes.role}`;
  if ('muted' in changes) {
    action = changes.muted ? 'CHAT_PARTICIPANT_MUTED' : 'CHAT_PARTICIPANT_UNMUTED';
    description = `${changes.muted ? 'Muted' : 'Unmuted'} ${name} in "${room.name}"`;
  }
  await audit(req, action, 'ChatRoom', room.id, { oldData: { user_id: user.id, ...oldData }, newData: { user_id: user.id, ...changes }, description });
  if ('muted' in changes) wsOf(req)?.sendToUser?.(user.id, { type: changes.muted ? 'muted_in_room' : 'unmuted_in_room', roomId: room.id });
  return plain(participant);
}

/** Deletes the participant row (if any); returns true when one was removed. */
async function dropParticipant(room, userId) {
  const removed = await db.ChatRoomParticipant.destroy({ where: { chat_room_id: room.id, user_id: userId } });
  if (removed) await db.ChatRoom.decrement('participant_count', { where: { id: room.id } });
  return Boolean(removed);
}

async function removeParticipant(req, roomId, userId) {
  const room = await mustFindRoom(roomId);
  const user = await mustFindUser(userId);
  if (String(user.id) === String(req.user.id)) throw new ChatAdminError(403, 'You cannot remove yourself');
  const removed = await dropParticipant(room, user.id);
  if (!removed) throw new ChatAdminError(404, 'This user is not in the room');
  wsOf(req)?.evictFromRoom(user.id, room.id);
  await audit(req, 'CHAT_PARTICIPANT_REMOVED', 'ChatRoom', room.id, {
    oldData: { user_id: user.id },
    description: `Removed ${userSummary(user).name} from "${room.name}"`,
  });
  return { success: true };
}

async function banUser(req, roomId, { user_id: userId, reason } = {}) {
  const room = await mustFindRoom(roomId);
  const user = await mustFindUser(userId);
  assertModeratable(req, user, 'ban');
  if (room.owner_id && String(room.owner_id) === String(user.id)) {
    throw new ChatAdminError(409, 'The room owner cannot be banned from their own room');
  }
  const cleanReason = String(reason || '').trim().slice(0, 300) || null;
  await mutateSettings(room.id, (settings) => {
    const bans = (Array.isArray(settings.bans) ? settings.bans : []).filter((b) => String(b.user_id) !== String(user.id));
    bans.push({ user_id: user.id, reason: cleanReason, banned_by: req.user.id, banned_at: new Date().toISOString() });
    return { ...settings, bans };
  });
  await dropParticipant(room, user.id);
  wsOf(req)?.evictFromRoom(user.id, room.id);
  await audit(req, 'CHAT_USER_BANNED', 'ChatRoom', room.id, {
    newData: { user_id: user.id, reason: cleanReason },
    description: `Banned ${userSummary(user).name} from "${room.name}"${cleanReason ? `: ${cleanReason}` : ''}`,
  });
  return { success: true };
}

async function unbanUser(req, roomId, userId) {
  const room = await mustFindRoom(roomId);
  if (!isBannedFrom({ id: userId }, room)) throw new ChatAdminError(404, 'This user is not banned from the room');
  await mutateSettings(room.id, (settings) => ({
    ...settings,
    bans: (settings.bans || []).filter((b) => String(b.user_id) !== String(userId)),
  }));
  await audit(req, 'CHAT_USER_UNBANNED', 'ChatRoom', room.id, {
    oldData: { user_id: userId },
    description: `Lifted a room ban in "${room.name}"`,
  });
  return { success: true };
}

// ---- messages --------------------------------------------------------------

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

async function listMessages(roomId, { search, before, before_id: beforeId, limit, pinned } = {}) {
  const room = await mustFindRoom(roomId);
  const pageSize = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  const where = { chat_room_id: room.id };
  const term = typeof search === 'string' ? search.trim().slice(0, 100) : '';
  if (term) where.content = { [Op.like]: `%${escapeLike(term)}%` };
  if (before) {
    const d = new Date(before);
    if (Number.isNaN(d.getTime())) throw new ChatAdminError(400, 'Invalid before date');
    // Keyset cursor (created_at, id): messages sharing the boundary second
    // are not skipped between pages.
    where[Op.or] = isId(beforeId)
      ? [{ created_at: { [Op.lt]: d } }, { created_at: d, id: { [Op.lt]: beforeId } }]
      : [{ created_at: { [Op.lt]: d } }];
  }
  if (bool(pinned)) where.is_pinned = true;

  const rows = await db.Message.findAll({
    where,
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: pageSize + 1,
    include: [{ model: db.User, attributes: USER_ATTRS }],
  });
  const page = rows.slice(0, pageSize).map((m) => {
    const x = plain(m);
    const { User: author, ...rest } = x;
    return { ...rest, author: userSummary(author || { id: x.user_id }) };
  });
  return { messages: page, has_more: rows.length > pageSize };
}

async function mustFindMessage(messageId) {
  const message = isId(messageId) ? await db.Message.findByPk(messageId) : null;
  if (!message) throw new ChatAdminError(404, 'Message not found');
  return message;
}

async function deleteMessage(req, messageId) {
  const message = await mustFindMessage(messageId);
  const snapshot = {
    chat_room_id: message.chat_room_id,
    user_id: message.user_id,
    content: String(message.content || '').slice(0, 500),
    created_at: message.created_at,
  };
  await message.destroy();
  wsOf(req)?.broadcastToRoom(message.chat_room_id, { type: 'message_deleted', messageId: message.id, roomId: message.chat_room_id });
  await audit(req, 'MESSAGE_DELETED', 'Message', message.id, { oldData: snapshot, description: 'Deleted a chat message' });
  return { success: true };
}

async function setMessagePinned(req, messageId, pinned) {
  const message = await mustFindMessage(messageId);
  const pin = Boolean(pinned);
  await message.update({ is_pinned: pin });
  wsOf(req)?.broadcastToRoom(message.chat_room_id, {
    type: pin ? 'message_pinned' : 'message_unpinned',
    messageId: message.id,
    roomId: message.chat_room_id,
    pinnedAt: pin ? new Date().toISOString() : null,
  });
  await audit(req, pin ? 'MESSAGE_PINNED' : 'MESSAGE_UNPINNED', 'Message', message.id, {
    newData: { chat_room_id: message.chat_room_id, is_pinned: pin },
    description: `${pin ? 'Pinned' : 'Unpinned'} a chat message`,
  });
  return plain(message);
}

// ---- invites ---------------------------------------------------------------

// 32 symbols without look-alikes (no 0/O, 1/I): byte & 31 is unbiased, and
// MySQL's case-insensitive collation cannot merge two codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12; // 60 bits
const INVITE_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/;

function newInviteCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b & 31];
  return code;
}

function inviteStatus(invite, now = new Date()) {
  if (!invite.is_active) return 'revoked';
  if (invite.expires_at && new Date(invite.expires_at) <= now) return 'expired';
  if (invite.max_uses && (invite.uses_count || 0) >= invite.max_uses) return 'exhausted';
  return 'active';
}

const clampInt = (value, min, max, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
};

async function createInvite(req, body = {}) {
  const room = await mustFindRoom(body.chat_room_id);
  if (isRoomClosed(room)) throw new ChatAdminError(409, 'Restore this room before inviting people to it');
  const maxUses = clampInt(body.max_uses, 1, 10000, 25);
  if (maxUses === null) throw new ChatAdminError(400, 'Max uses must be between 1 and 10000');
  const hours = clampInt(body.expires_in_hours, 1, 720, 72);
  if (hours === null) throw new ChatAdminError(400, 'Expiry must be between 1 hour and 30 days');
  const role = body.role_to_assign || 'member';
  if (!INVITE_ROLES.includes(role)) throw new ChatAdminError(400, 'Invites can make people members or moderators');
  // A moderator link that leaks hands out moderator rights: single use, a week at most.
  const effectiveMaxUses = role === 'moderator' ? 1 : maxUses;
  const effectiveHours = role === 'moderator' ? Math.min(hours, 168) : hours;

  let code = newInviteCode();
  for (let i = 0; i < 3 && (await db.ChatInvite.findOne({ where: { code } })); i += 1) code = newInviteCode();

  const invite = await db.ChatInvite.create({
    chat_room_id: room.id,
    code,
    created_by: req.user.id,
    max_uses: effectiveMaxUses,
    uses_count: 0,
    expires_at: new Date(Date.now() + effectiveHours * 3600 * 1000),
    is_active: true,
    role_to_assign: role,
  });
  await audit(req, 'CHAT_INVITE_CREATED', 'ChatRoom', room.id, {
    newData: { invite_id: invite.id, max_uses: effectiveMaxUses, expires_in_hours: effectiveHours, role },
    description: `Created an invite link for "${room.name}"`,
  });
  return { ...plain(invite), status: 'active', room: { id: room.id, name: room.name } };
}

async function listInvites({ room_id: roomId } = {}) {
  const where = {};
  if (isId(roomId)) where.chat_room_id = roomId;
  const invites = await db.ChatInvite.findAll({ where, order: [['created_at', 'DESC']], limit: 500 });
  const roomIds = [...new Set(invites.map((i) => i.chat_room_id).filter(Boolean))];
  const rooms = roomIds.length ? await db.ChatRoom.findAll({ where: { id: { [Op.in]: roomIds } }, attributes: ['id', 'name'] }) : [];
  const names = new Map(rooms.map((r) => [String(r.id), r.name]));
  const now = new Date();
  return invites.map((i) => ({
    ...plain(i),
    status: inviteStatus(i, now),
    room: { id: i.chat_room_id, name: names.get(String(i.chat_room_id)) || 'Deleted room' },
  }));
}

async function mustFindInvite(inviteId) {
  const invite = isId(inviteId) ? await db.ChatInvite.findByPk(inviteId) : null;
  if (!invite) throw new ChatAdminError(404, 'Invite not found');
  return invite;
}

async function revokeInvite(req, inviteId) {
  const invite = await mustFindInvite(inviteId);
  if (invite.is_active) {
    await invite.update({ is_active: false });
    await audit(req, 'CHAT_INVITE_REVOKED', 'ChatRoom', invite.chat_room_id, {
      newData: { invite_id: invite.id }, description: 'Revoked an invite link',
    });
  }
  return { ...plain(invite), status: 'revoked' };
}

async function deleteInvite(req, inviteId) {
  const invite = await mustFindInvite(inviteId);
  await invite.destroy();
  await audit(req, 'CHAT_INVITE_DELETED', 'ChatRoom', invite.chat_room_id, {
    oldData: { invite_id: invite.id, uses_count: invite.uses_count }, description: 'Deleted an invite link',
  });
  return { success: true };
}

/**
 * A signed-in user follows an invite link. Membership is created with the
 * invite's role; a paid room still needs a plan (an invite is not a free
 * pass), and a room ban or an archived room still wins.
 */
async function redeemInvite(req, rawCode) {
  const user = req.user;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!INVITE_CODE_RE.test(code)) throw new ChatAdminError(404, 'This invite link is invalid or has been revoked');
  const invite = await db.ChatInvite.findOne({ where: { code } });
  if (!invite || !invite.is_active) throw new ChatAdminError(404, 'This invite link is invalid or has been revoked');

  const room = await db.ChatRoom.findByPk(invite.chat_room_id);
  if (!room) throw new ChatAdminError(404, 'This invite link is invalid or has been revoked');
  if (isBannedFrom(user, room)) throw new ChatAdminError(403, 'You cannot join this room');
  if (isRoomClosed(room)) throw new ChatAdminError(403, 'This room is archived');

  // Someone already in the room just gets taken there; no use is consumed.
  const existing = await db.ChatRoomParticipant.findOne({ where: { chat_room_id: room.id, user_id: user.id } });
  if (existing) return { room_id: room.id, already_member: true };

  const status = inviteStatus(invite);
  if (status === 'expired') throw new ChatAdminError(410, 'This invite link has expired');
  if (status === 'exhausted') throw new ChatAdminError(410, 'This invite link has reached its usage limit');

  const role = INVITE_ROLES.includes(invite.role_to_assign) ? invite.role_to_assign : 'member';
  if (room.is_premium === true && role === 'member' && !isStaff(user) && !(await hasPremiumAccess(user, room))) {
    throw new ChatAdminError(403, `This room needs a ${normalizePlan(room.required_plan) === 'vip' ? 'VIP' : 'Premium'} plan`, 'PLAN_REQUIRED');
  }

  // Claim a use atomically so two people cannot both take the last one.
  const [claimed] = await db.ChatInvite.update(
    { uses_count: db.sequelize.literal('COALESCE(uses_count, 0) + 1') },
    {
      where: invite.max_uses
        ? { id: invite.id, is_active: true, [Op.or]: [{ uses_count: null }, { uses_count: { [Op.lt]: invite.max_uses } }] }
        : { id: invite.id, is_active: true }, // legacy rows without a limit are unlimited
    },
  );
  if (!claimed) throw new ChatAdminError(410, 'This invite link has reached its usage limit');

  const { created } = await ensureParticipant(room.id, user.id, role);
  if (!created) return { room_id: room.id, already_member: true };
  await audit(req, 'CHAT_INVITE_REDEEMED', 'ChatRoom', room.id, {
    newData: { invite_id: invite.id, user_id: user.id, role },
    description: `Joined "${room.name}" with an invite link`,
  });
  return { room_id: room.id, role, already_member: false };
}

// ---- paid room access (Premium tab) ---------------------------------------

async function listRoomSubscriptions({ room_id: roomId } = {}) {
  const where = {};
  if (isId(roomId)) where.room_id = roomId;
  const subs = await db.RoomSubscription.findAll({ where, order: [['created_at', 'DESC']], limit: 1000 });
  const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
  const users = userIds.length ? await db.User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: USER_ATTRS }) : [];
  const byId = new Map(users.map((u) => [String(u.id), u]));
  const now = new Date();
  return subs.map((s) => {
    const x = plain(s);
    const live = x.status === 'active' && (!x.expires_at || new Date(x.expires_at) > now);
    return { ...x, is_live: live, user: userSummary(byId.get(String(x.user_id)) || { id: x.user_id }) };
  });
}

async function grantRoomAccess(req, roomId, { user_id: userId, days } = {}) {
  const room = await mustFindRoom(roomId);
  if (!room.is_premium) throw new ChatAdminError(409, 'Only premium or VIP rooms take room subscriptions');
  const user = await mustFindUser(userId);
  const length = clampInt(days, 1, 365, 30);
  if (length === null) throw new ChatAdminError(400, 'Access length must be between 1 and 365 days');

  const now = new Date();
  const existing = await db.RoomSubscription.findOne({ where: { user_id: user.id, room_id: room.id, status: 'active' } });
  const base = existing?.expires_at && new Date(existing.expires_at) > now ? new Date(existing.expires_at) : now;
  const expiresAt = new Date(base.getTime() + length * 86400000);

  let sub;
  if (existing) {
    await existing.update({ expires_at: expiresAt });
    sub = existing;
  } else {
    sub = await db.RoomSubscription.create({
      user_id: user.id, room_id: room.id, status: 'active', start_date: now, expires_at: expiresAt,
      amount_paid: 0, payment_reference: `admin_grant:${req.user.id}`,
    });
  }
  await audit(req, 'CHAT_ROOM_ACCESS_GRANTED', 'ChatRoom', room.id, {
    newData: { user_id: user.id, days: length, expires_at: expiresAt.toISOString(), subscription_id: sub.id },
    description: `Granted ${userSummary(user).name} ${length} day(s) of access to "${room.name}"`,
  });
  return plain(sub);
}

async function revokeRoomSubscription(req, subscriptionId) {
  const sub = isId(subscriptionId) ? await db.RoomSubscription.findByPk(subscriptionId) : null;
  if (!sub) throw new ChatAdminError(404, 'Subscription not found');
  if (sub.status !== 'cancelled') {
    const previous = sub.status;
    await sub.update({ status: 'cancelled' });
    await audit(req, 'CHAT_ROOM_ACCESS_REVOKED', 'ChatRoom', sub.room_id, {
      oldData: { subscription_id: sub.id, status: previous }, newData: { status: 'cancelled' },
      description: 'Revoked a room subscription',
    });
  }
  const ws = wsOf(req);
  if (ws && onlineIds(ws, sub.room_id).map(String).includes(String(sub.user_id))) {
    const user = await db.User.findByPk(sub.user_id, { attributes: { exclude: ['password'] } });
    if (!user || !(await canReadRoom(user, sub.room_id))) ws.evictFromRoom(sub.user_id, sub.room_id);
  }
  return plain(sub);
}

// ---- live activity and analytics -------------------------------------------

async function liveActivity(req) {
  const ws = wsOf(req);
  const roomIds = ws?.rooms ? [...ws.rooms.keys()].filter((id) => ws.rooms.get(id)?.size) : [];
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [rooms, recent] = await Promise.all([
    roomIds.length ? db.ChatRoom.findAll({ where: { id: { [Op.in]: roomIds } }, attributes: ['id', 'name', 'room_type', 'status'] }) : [],
    db.Message.findAll({
      where: { created_at: { [Op.gte]: since } },
      order: [['created_at', 'DESC']],
      limit: 50,
      include: [{ model: db.User, attributes: USER_ATTRS }],
    }),
  ]);
  const onlineUserIds = [...new Set(roomIds.flatMap((id) => onlineIds(ws, id).map(String)))];
  const users = onlineUserIds.length ? await db.User.findAll({ where: { id: { [Op.in]: onlineUserIds } }, attributes: USER_ATTRS }) : [];
  const userById = new Map(users.map((u) => [String(u.id), userSummary(u)]));
  const nameById = new Map(rooms.map((r) => [String(r.id), r.name]));

  const recentRoomIds = [...new Set(recent.map((m) => m.chat_room_id).filter((id) => !nameById.has(String(id))))];
  if (recentRoomIds.length) {
    const more = await db.ChatRoom.findAll({ where: { id: { [Op.in]: recentRoomIds } }, attributes: ['id', 'name'] });
    more.forEach((r) => nameById.set(String(r.id), r.name));
  }

  return {
    connected_users: ws?.clients?.size || 0,
    active_rooms: rooms
      .map((r) => ({
        id: r.id,
        name: r.name,
        room_type: r.room_type,
        online: onlineIds(ws, r.id).map((id) => userById.get(String(id)) || { id, name: 'Unknown user' }),
      }))
      .sort((a, b) => b.online.length - a.online.length),
    recent_messages: recent.map((m) => {
      const x = plain(m);
      return {
        id: x.id,
        chat_room_id: x.chat_room_id,
        room_name: nameById.get(String(x.chat_room_id)) || 'Unknown room',
        content: String(x.content || '').slice(0, 300),
        message_type: x.message_type || 'text',
        created_at: x.created_at,
        author: userSummary(x.User || { id: x.user_id }),
      };
    }),
    messages_last_hour: recent.length,
    generated_at: new Date().toISOString(),
  };
}

const dayKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

async function analytics({ days } = {}) {
  const span = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  // UTC days: Sequelize runs MySQL sessions at +00:00, so DATE(created_at)
  // buckets are UTC dates too.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (span - 1));
  const inWindow = { created_at: { [Op.gte]: since } };
  const day = fn('DATE', col('created_at'));

  const [dailyMessages, dailyJoins, topRoomRows, topPosterRows, byType, activePosters, roomsCreated] = await Promise.all([
    db.Message.findAll({
      attributes: [[day, 'day'], [fn('COUNT', col('id')), 'messages'], [fn('COUNT', fn('DISTINCT', col('user_id'))), 'active_users']],
      where: inWindow, group: [day], raw: true,
    }),
    db.ChatRoomParticipant.findAll({
      attributes: [[day, 'day'], [fn('COUNT', col('id')), 'joins']],
      where: inWindow, group: [day], raw: true,
    }),
    db.Message.findAll({
      attributes: ['chat_room_id', [fn('COUNT', col('id')), 'messages']],
      where: inWindow, group: ['chat_room_id'], order: [[fn('COUNT', col('id')), 'DESC']], limit: 10, raw: true,
    }),
    db.Message.findAll({
      attributes: ['user_id', [fn('COUNT', col('id')), 'messages']],
      where: { ...inWindow, user_id: { [Op.ne]: null } }, group: ['user_id'], order: [[fn('COUNT', col('id')), 'DESC']], limit: 10, raw: true,
    }),
    db.ChatRoom.findAll({ attributes: ['room_type', [fn('COUNT', col('id')), 'count']], group: ['room_type'], raw: true }),
    db.Message.count({ where: inWindow, distinct: true, col: 'user_id' }),
    db.ChatRoom.count({ where: inWindow }),
  ]);

  const messagesByDay = new Map(dailyMessages.map((r) => [dayKey(r.day), r]));
  const joinsByDay = new Map(dailyJoins.map((r) => [dayKey(r.day), Number(r.joins) || 0]));
  const daily = [];
  for (let i = 0; i < span; i += 1) {
    const key = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
    const m = messagesByDay.get(key);
    daily.push({ date: key, messages: Number(m?.messages) || 0, active_users: Number(m?.active_users) || 0, joins: joinsByDay.get(key) || 0 });
  }

  const roomIds = topRoomRows.map((r) => r.chat_room_id).filter(Boolean);
  const posterIds = topPosterRows.map((r) => r.user_id).filter(Boolean);
  const [rooms, posters] = await Promise.all([
    roomIds.length ? db.ChatRoom.findAll({ where: { id: { [Op.in]: roomIds } }, attributes: ['id', 'name', 'room_type'] }) : [],
    posterIds.length ? db.User.findAll({ where: { id: { [Op.in]: posterIds } }, attributes: USER_ATTRS }) : [],
  ]);
  const roomById = new Map(rooms.map((r) => [String(r.id), r]));
  const posterById = new Map(posters.map((u) => [String(u.id), u]));

  return {
    days: span,
    since: since.toISOString(),
    totals: {
      messages: daily.reduce((s, d) => s + d.messages, 0),
      active_posters: Number(activePosters) || 0,
      new_participants: daily.reduce((s, d) => s + d.joins, 0),
      rooms_created: Number(roomsCreated) || 0,
    },
    daily,
    top_rooms: topRoomRows.map((r) => ({
      id: r.chat_room_id,
      name: roomById.get(String(r.chat_room_id))?.name || 'Deleted room',
      room_type: roomById.get(String(r.chat_room_id))?.room_type || null,
      messages: Number(r.messages) || 0,
    })),
    top_posters: topPosterRows.map((r) => ({
      user: userSummary(posterById.get(String(r.user_id)) || { id: r.user_id }),
      messages: Number(r.messages) || 0,
    })),
    rooms_by_type: byType.map((r) => ({ room_type: r.room_type || 'general', count: Number(r.count) || 0 })),
  };
}

module.exports = {
  ChatAdminError,
  ROOM_TYPES,
  PLANS,
  BULK_ACTIONS,
  normalizePlan,
  validateRoom,
  pickRoomFields,
  publicRoom,
  audit,
  mutateSettings,
  overview,
  createRoom,
  updateRoom,
  setRoomStatus,
  setRoomLocked,
  deleteRoom,
  bulkRooms,
  listParticipants,
  addParticipant,
  updateParticipant,
  removeParticipant,
  banUser,
  unbanUser,
  listMessages,
  deleteMessage,
  setMessagePinned,
  newInviteCode,
  inviteStatus,
  createInvite,
  listInvites,
  revokeInvite,
  deleteInvite,
  redeemInvite,
  listRoomSubscriptions,
  grantRoomAccess,
  revokeRoomSubscription,
  liveActivity,
  analytics,
};
