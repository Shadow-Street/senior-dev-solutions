const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const ChatModerationService = require('../src/services/ChatModerationService');
const RoomAutomationService = require('../src/services/RoomAutomationService');
const { newInviteCode, validateRoom } = require('../src/services/ChatRoomAdminService');

// Super Admin > Chat Room Management: every action is admin-only, validated,
// audited, and actually enforced where chat happens (join, read, post, WS).

const ws = app.get('wsService');
const MOD = { id: '44444444-4444-4444-8444-444444444444', email: 'mod@example.test', app_role: 'user', role: 'user', status: 'active' };
const PREMIUM = { id: '55555555-5555-4555-8555-555555555555', email: 'p@example.test', app_role: 'user', role: 'user', status: 'active', is_premium: true };
const OTHER = { id: '66666666-6666-4666-8666-666666666666', email: 'o@example.test', app_role: 'user', role: 'user', status: 'active' };

let rooms; let participants; let messages; let invites; let rules; let automations; let subs; let audits; let evicted; let broadcasts;

beforeEach(() => {
  stubUserLookup({ [MOD.id]: MOD, [PREMIUM.id]: PREMIUM, [OTHER.id]: OTHER });
  rooms = fakeTable([
    { id: 'room-open', name: 'Open Room', room_type: 'general', is_public: true, is_premium: false, required_plan: 'free', status: 'active', owner_id: USERS.admin.id, settings: {} },
    { id: 'room-vip', name: 'VIP Room', room_type: 'premium', is_public: true, is_premium: true, required_plan: 'vip', status: 'active', owner_id: USERS.admin.id, settings: {} },
  ]).install(mock, db.ChatRoom);
  mock.method(db.ChatRoom, 'increment', async () => {});
  mock.method(db.ChatRoom, 'decrement', async () => {});
  participants = fakeTable([
    { id: 'p-user', chat_room_id: 'room-open', user_id: USERS.user.id, role: 'member', muted: false },
    { id: 'p-mod', chat_room_id: 'room-open', user_id: MOD.id, role: 'moderator', muted: false },
  ]).install(mock, db.ChatRoomParticipant);
  messages = fakeTable([
    { id: 'm-1', chat_room_id: 'room-open', user_id: USERS.user.id, content: 'hello', created_at: new Date(Date.now() - 3600e3) },
  ]).install(mock, db.Message);
  invites = fakeTable([]).install(mock, db.ChatInvite);
  rules = fakeTable([]).install(mock, db.ModerationRule);
  automations = fakeTable([]).install(mock, db.RoomAutomation);
  subs = fakeTable([]).install(mock, db.RoomSubscription);
  mock.method(db.Subscription, 'findAll', async () => []);
  mock.method(db.User, 'findAll', async () => []);
  mock.method(db.sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  audits = [];
  mock.method(db.AuditLog, 'create', async (row) => { audits.push(row); return row; });
  evicted = [];
  broadcasts = [];
  mock.method(ws, 'evictFromRoom', (userId, roomId) => { evicted.push([userId, roomId]); });
  mock.method(ws, 'broadcastToRoom', (roomId, data) => { broadcasts.push([roomId, data]); });
  mock.method(ws, 'sendToUser', () => {});
  ws.rooms.clear();
  ChatModerationService.invalidateRules();
});
afterEach(() => { mock.restoreAll(); ws.rooms.clear(); });

const as = (user) => ({ Authorization: bearer(user) });
const api = (method, path, user = USERS.admin) => request(app)[method](`/api/chat-management${path}`).set(as(user));
const room = (id) => rooms.rows.find((r) => r.id === id);

// --- authorization ---------------------------------------------------------------

test('every chat-management endpoint is admin-only', async () => {
  const calls = [
    ['get', '/overview'], ['get', '/live'], ['get', '/analytics'], ['post', '/rooms'], ['put', '/rooms/room-open'],
    ['post', '/rooms/room-open/archive'], ['post', '/rooms/room-open/lock'], ['delete', '/rooms/room-open'],
    ['get', '/rooms/room-open/participants'], ['post', '/rooms/room-open/bans'], ['patch', `/rooms/room-open/participants/${OTHER.id}`],
    ['get', '/rooms/room-open/messages'], ['delete', '/messages/m-1'], ['post', '/messages/m-1/pin'],
    ['get', '/invites'], ['post', '/invites'], ['get', '/rules'], ['post', '/rules'], ['get', '/automations'],
    ['post', '/automations'], ['post', '/rooms/bulk'], ['get', '/room-subscriptions'], ['get', '/users?search=ad'],
    ['post', '/rooms/room-open/subscriptions'], ['post', '/invites/x/revoke'], ['put', '/rules/x'], ['delete', '/automations/x'],
  ];
  for (const [method, path] of calls) {
    const res = await api(method, path, USERS.user).send({});
    assert.equal(res.status, 403, `${method.toUpperCase()} ${path} answered ${res.status}`);
    const anon = await request(app)[method](`/api/chat-management${path}`).send({});
    assert.equal(anon.status, 401, `${method.toUpperCase()} ${path} (anonymous) answered ${anon.status}`);
  }
  assert.equal(audits.length, 0);
  assert.equal(room('room-open').status, 'active');
});

// --- overview / stats -----------------------------------------------------------------

test('overview stats are real counts, with live presence from the socket server', async () => {
  mock.method(db.Message, 'findAll', async (opts) => {
    if (opts.where?.created_at) return [{ chat_room_id: 'room-open', count: 2 }];
    if (opts.group?.[0] === 'chat_room_id' && JSON.stringify(opts.attributes).includes('MAX')) return [{ chat_room_id: 'room-open', last: new Date() }];
    return [{ chat_room_id: 'room-open', count: 7 }, { chat_room_id: 'room-vip', count: 3 }];
  });
  mock.method(db.ChatRoomParticipant, 'findAll', async () => [{ chat_room_id: 'room-open', count: 4 }]);
  ws.rooms.set('room-vip', new Set([PREMIUM.id]));

  const res = await api('get', '/overview');
  assert.equal(res.status, 200);
  assert.deepEqual(
    { ...res.body.stats, online_users: undefined },
    { total: 2, active_now: 1, premium: 1, participants: 4, messages: 10, active_today: 1, online_users: undefined },
  );
  const vip = res.body.rooms.find((r) => r.id === 'room-vip');
  assert.equal(vip.online_count, 1);
  assert.equal(vip.message_count, 3);
  assert.equal(vip.settings, undefined, 'raw settings (ban list) are not sent');
});

// --- rooms -----------------------------------------------------------------------------

test('creating a room validates input, whitelists fields and is audited', async () => {
  assert.equal((await api('post', '/rooms').send({ name: '' })).status, 400);
  assert.equal((await api('post', '/rooms').send({ name: 'Stock', room_type: 'stock_specific' })).status, 400);
  assert.equal((await api('post', '/rooms').send({ name: 'X Room', room_type: 'bogus' })).status, 400);

  const res = await api('post', '/rooms').send({
    name: '  Premium Lounge ', room_type: 'premium_admin', required_plan: 'basic',
    owner_id: OTHER.id, participant_count: 999, settings: { bans: [] }, status: 'archived', created_by: 'x',
  });
  assert.equal(res.status, 201);
  const created = rooms.rows.at(-1);
  assert.equal(created.name, 'Premium Lounge');
  assert.equal(created.owner_id, USERS.admin.id);
  assert.equal(created.participant_count, 0);
  assert.equal(created.status, 'active');
  assert.equal(created.is_premium, true, 'premium room types are paid rooms');
  assert.equal(created.required_plan, 'premium');
  assert.equal(audits.at(-1).action, 'CHATROOM_CREATED');
  assert.equal(audits.at(-1).user_id, USERS.admin.id);
});

test('a duplicate stock room is refused', async () => {
  rooms.add({ id: 'room-tcs', name: 'TCS', room_type: 'stock_specific', stock_symbol: 'TCS', status: 'active', settings: {} });
  const res = await api('post', '/rooms').send({ name: 'TCS 2', room_type: 'stock_specific', stock_symbol: 'tcs' });
  assert.equal(res.status, 409);
});

test('editing a room records old and new values and tells the room', async () => {
  const res = await api('put', '/rooms/room-open').send({ name: 'Renamed', is_public: false, owner_id: OTHER.id });
  assert.equal(res.status, 200);
  assert.equal(room('room-open').name, 'Renamed');
  assert.equal(room('room-open').is_public, false);
  assert.equal(room('room-open').owner_id, USERS.admin.id);
  const entry = audits.find((a) => a.action === 'CHATROOM_UPDATED');
  assert.equal(entry.old_data.name, 'Open Room');
  assert.equal(entry.new_data.name, 'Renamed');
  assert.ok(broadcasts.some(([id, d]) => id === 'room-open' && d.type === 'room_updated'));
  assert.equal((await api('put', '/rooms/nope').send({ name: 'x y' })).status, 404);
});

test('making a room private evicts online users who can no longer read it', async () => {
  ws.rooms.set('room-open', new Set([OTHER.id, USERS.user.id]));
  await api('put', '/rooms/room-open').send({ is_public: false });
  assert.deepEqual(evicted, [[OTHER.id, 'room-open']], 'the participant stays, the outsider goes');
});

test('an archived room is read-only and cannot be joined', async () => {
  assert.equal((await api('post', '/rooms/room-open/archive')).status, 200);
  assert.equal(room('room-open').status, 'archived');
  assert.equal(audits.at(-1).action, 'CHATROOM_ARCHIVED');

  const post = await request(app).post('/api/messages').set(as(USERS.user)).send({ chat_room_id: 'room-open', content: 'hi' });
  assert.equal(post.status, 403);
  const join = await request(app).post('/api/chatrooms/room-open/join').set(as(OTHER));
  assert.equal(join.status, 403);

  assert.equal((await api('post', '/rooms/room-open/restore')).status, 200);
  assert.equal(room('room-open').status, 'active');
});

test('a locked room takes posts from its moderators only', async () => {
  const res = await api('post', '/rooms/room-open/lock').send({ reason: 'Market hours' });
  assert.equal(res.status, 200);
  assert.equal(res.body.locked, true);
  assert.equal(room('room-open').settings.locked, true);

  const member = await request(app).post('/api/messages').set(as(USERS.user)).send({ chat_room_id: 'room-open', content: 'hi' });
  assert.equal(member.status, 403);
  assert.match(member.body.error, /locked/);
  const moderator = await request(app).post('/api/messages').set(as(MOD)).send({ chat_room_id: 'room-open', content: 'hi' });
  assert.equal(moderator.status, 201);

  await api('post', '/rooms/room-open/unlock');
  assert.equal(room('room-open').settings.locked, undefined);
  assert.deepEqual(audits.map((a) => a.action).filter((a) => a.startsWith('CHATROOM_')), ['CHATROOM_LOCKED', 'CHATROOM_UNLOCKED']);
});

test('deleting a room needs its name and is refused while paid subscriptions are active', async () => {
  assert.equal((await api('delete', '/rooms/room-open').send({ confirm: 'wrong' })).status, 400);
  subs.add({ room_id: 'room-open', user_id: OTHER.id, status: 'active' });
  assert.equal((await api('delete', '/rooms/room-open').send({ confirm: 'Open Room' })).status, 409);
  subs.rows.length = 0;

  ws.rooms.set('room-open', new Set([USERS.user.id]));
  const res = await api('delete', '/rooms/room-open').send({ confirm: 'Open Room' });
  assert.equal(res.status, 200);
  assert.equal(room('room-open'), undefined);
  assert.equal(messages.rows.filter((m) => m.chat_room_id === 'room-open').length, 0);
  assert.equal(participants.rows.filter((p) => p.chat_room_id === 'room-open').length, 0);
  assert.deepEqual(evicted, [[USERS.user.id, 'room-open']]);
  assert.equal(audits.at(-1).action, 'CHATROOM_DELETED');
});

test('bulk delete needs DELETE typed; bulk archive reports per room', async () => {
  assert.equal((await api('post', '/rooms/bulk').send({ ids: ['room-open'], action: 'delete' })).status, 400);
  const res = await api('post', '/rooms/bulk').send({ ids: ['room-open', 'missing'], action: 'archive' });
  assert.equal(res.status, 200);
  assert.equal(res.body.succeeded, 1);
  assert.equal(res.body.failed, 1);
  assert.equal(room('room-open').status, 'archived');
});

// --- participants, mutes, bans ----------------------------------------------------------

test('admin adds, mutes, promotes and removes a participant, each audited', async () => {
  const add = await api('post', '/rooms/room-open/participants').send({ user_id: OTHER.id, role: 'member', muted: true, id: 'forced' });
  assert.equal(add.status, 201);
  const row = participants.rows.find((p) => p.user_id === OTHER.id);
  assert.equal(row.muted, false);
  assert.notEqual(row.id, 'forced');

  assert.equal((await api('patch', `/rooms/room-open/participants/${OTHER.id}`).send({ muted: true })).status, 200);
  assert.equal(row.muted, true);
  const muted = await request(app).post('/api/messages').set(as(OTHER)).send({ chat_room_id: 'room-open', content: 'x' });
  assert.equal(muted.status, 403);

  assert.equal((await api('patch', `/rooms/room-open/participants/${OTHER.id}`).send({ role: 'owner' })).status, 400);
  assert.equal((await api('patch', `/rooms/room-open/participants/${OTHER.id}`).send({ role: 'moderator' })).status, 200);
  assert.equal(row.role, 'moderator');

  assert.equal((await api('delete', `/rooms/room-open/participants/${OTHER.id}`)).status, 200);
  assert.deepEqual(evicted.at(-1), [OTHER.id, 'room-open']);
  assert.deepEqual(
    audits.map((a) => a.action),
    ['CHAT_PARTICIPANT_ADDED', 'CHAT_PARTICIPANT_MUTED', 'CHAT_PARTICIPANT_ROLE_CHANGED', 'CHAT_PARTICIPANT_REMOVED'],
  );
});

test('staff accounts and the acting admin cannot be muted or banned', async () => {
  participants.add({ chat_room_id: 'room-open', user_id: USERS.superAdmin.id, role: 'member' });
  assert.equal((await api('patch', `/rooms/room-open/participants/${USERS.superAdmin.id}`).send({ muted: true })).status, 403);
  assert.equal((await api('post', '/rooms/room-open/bans').send({ user_id: USERS.admin.id })).status, 403);
  assert.equal((await api('post', '/rooms/room-open/bans').send({ user_id: USERS.superAdmin.id })).status, 403);
});

test('a room ban removes, evicts and keeps the user out of join, read and post', async () => {
  ws.rooms.set('room-open', new Set([USERS.user.id]));
  const res = await api('post', '/rooms/room-open/bans').send({ user_id: USERS.user.id, reason: 'spam' });
  assert.equal(res.status, 200);
  assert.equal(participants.rows.some((p) => p.user_id === USERS.user.id), false);
  assert.deepEqual(evicted, [[USERS.user.id, 'room-open']]);
  assert.equal(room('room-open').settings.bans[0].reason, 'spam');
  assert.equal(audits.at(-1).action, 'CHAT_USER_BANNED');

  assert.equal((await request(app).post('/api/chatrooms/room-open/join').set(as(USERS.user))).status, 403);
  assert.equal((await request(app).get('/api/messages/room/room-open').set(as(USERS.user))).status, 404);
  assert.equal((await request(app).post('/api/messages').set(as(USERS.user)).send({ chat_room_id: 'room-open', content: 'x' })).status, 404);
  // A room moderator cannot quietly re-add them either.
  const readd = await request(app).post('/api/chatrooms/participants').set(as(MOD)).send({ chat_room_id: 'room-open', user_id: USERS.user.id });
  assert.equal(readd.status, 403);
  assert.equal((await api('post', '/rooms/room-open/participants').send({ user_id: USERS.user.id })).status, 409);

  assert.equal((await api('delete', `/rooms/room-open/bans/${USERS.user.id}`)).status, 200);
  assert.deepEqual(room('room-open').settings.bans, []);
  assert.equal((await request(app).post('/api/chatrooms/room-open/join').set(as(USERS.user))).status, 201);
});

test('the WebSocket path refuses a banned user and a locked room', async () => {
  const svc = ws;
  const sent = [];
  mock.method(svc, 'sendToUser', (uid, data) => sent.push([uid, data]));
  room('room-open').settings = { locked: true };
  await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type: 'chat_message', roomId: 'room-open', content: 'x' })));
  assert.match(sent.at(-1)[1].message, /locked/);
  room('room-open').settings = { bans: [{ user_id: USERS.user.id }] };
  await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type: 'join_room', roomId: 'room-open' })));
  assert.equal(sent.at(-1)[1].type, 'error');
  assert.equal(messages.rows.length, 1, 'nothing was posted');
});

// --- messages --------------------------------------------------------------------------------

test('admin deletes and pins messages; open rooms are told', async () => {
  const pin = await api('post', '/messages/m-1/pin');
  assert.equal(pin.status, 200);
  assert.equal(messages.rows[0].is_pinned, true);
  assert.deepEqual(broadcasts.at(-1)[1].type, 'message_pinned');

  const del = await api('delete', '/messages/m-1');
  assert.equal(del.status, 200);
  assert.equal(messages.rows.length, 0);
  assert.deepEqual(broadcasts.at(-1), ['room-open', { type: 'message_deleted', messageId: 'm-1', roomId: 'room-open' }]);
  assert.equal(audits.at(-1).action, 'MESSAGE_DELETED');
  assert.equal(audits.at(-1).old_data.content, 'hello');
  assert.equal((await api('delete', '/messages/m-1')).status, 404);
});

test('message listing is paged and searchable', async () => {
  const findAll = mock.method(db.Message, 'findAll', async () => []);
  const res = await api('get', '/rooms/room-open/messages?limit=500&search=50%25');
  assert.equal(res.status, 200);
  const [opts] = findAll.mock.calls[0].arguments;
  assert.equal(opts.limit, 101, 'page size is capped at 100 (+1 to detect more)');
  const like = Object.getOwnPropertySymbols(opts.where.content).map((s) => opts.where.content[s])[0];
  assert.equal(like, '%50\\%%', 'LIKE wildcards in the search are escaped');
});

// --- invites ---------------------------------------------------------------------------------

test('invite codes are random, unambiguous and validated on creation', async () => {
  const codes = new Set(Array.from({ length: 200 }, newInviteCode));
  assert.equal(codes.size, 200);
  for (const c of codes) assert.match(c, /^[A-HJ-NP-Z2-9]{12}$/);

  assert.equal((await api('post', '/invites').send({ chat_room_id: 'room-open', max_uses: 0 })).status, 400);
  assert.equal((await api('post', '/invites').send({ chat_room_id: 'room-open', role_to_assign: 'admin' })).status, 400);
  const res = await api('post', '/invites').send({ chat_room_id: 'room-open', max_uses: 2, expires_in_hours: 24, code: 'CHOSEN', created_by: OTHER.id });
  assert.equal(res.status, 201);
  assert.notEqual(res.body.code, 'CHOSEN');
  assert.equal(invites.rows[0].created_by, USERS.admin.id);
  assert.equal(audits.at(-1).action, 'CHAT_INVITE_CREATED');
});

test('an invite link joins the room; revoked, expired and used-up links do not', async () => {
  const { body } = await api('post', '/invites').send({ chat_room_id: 'room-open', max_uses: 1 });
  const redeem = (user, code = body.code) => request(app).post(`/api/chatrooms/invites/${code}/redeem`).set(as(user));
  mock.method(db.ChatInvite, 'update', async (_patch, { where }) => {
    const row = invites.rows.find((i) => i.id === where.id && i.is_active);
    if (!row || row.uses_count >= row.max_uses) return [0];
    row.uses_count += 1;
    return [1];
  });

  const ok = await redeem(OTHER);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.room_id, 'room-open');
  assert.ok(participants.rows.some((p) => p.user_id === OTHER.id && p.role === 'member'));
  assert.equal((await redeem(OTHER)).body.already_member, true, 'a member re-using the link does not consume it');
  assert.equal((await redeem(PREMIUM)).status, 410, 'used up');

  invites.rows[0].uses_count = 0;
  invites.rows[0].expires_at = new Date(Date.now() - 1000);
  assert.equal((await redeem(PREMIUM)).status, 410, 'expired');

  invites.rows[0].expires_at = new Date(Date.now() + 3600e3);
  assert.equal((await api('post', `/invites/${invites.rows[0].id}/revoke`)).status, 200);
  assert.equal((await redeem(PREMIUM)).status, 404, 'revoked');
  assert.equal((await redeem(PREMIUM, 'nope')).status, 404);
  assert.equal((await request(app).post(`/api/chatrooms/invites/${body.code}/redeem`)).status, 401);
});

test('an invite does not bypass a room ban or a paid plan', async () => {
  const banned = await api('post', '/invites').send({ chat_room_id: 'room-open' });
  room('room-open').settings = { bans: [{ user_id: OTHER.id }] };
  assert.equal((await request(app).post(`/api/chatrooms/invites/${banned.body.code}/redeem`).set(as(OTHER))).status, 403);

  const vip = await api('post', '/invites').send({ chat_room_id: 'room-vip' });
  const res = await request(app).post(`/api/chatrooms/invites/${vip.body.code}/redeem`).set(as(PREMIUM));
  assert.equal(res.status, 403, 'a Premium plan does not open a VIP room');
  assert.equal(res.body.code, 'PLAN_REQUIRED');
});

// --- VIP plan gating ------------------------------------------------------------------------------

test('a VIP room needs a VIP plan or a room subscription; Premium is not enough', async () => {
  assert.equal((await request(app).post('/api/chatrooms/room-vip/join').set(as(PREMIUM))).status, 403);

  mock.method(db.Subscription, 'findAll', async () => [{ plan_type: 'VIP', end_date: new Date(Date.now() + 864e5), SubscriptionPlan: { name: 'VIP' } }]);
  assert.equal((await request(app).post('/api/chatrooms/room-vip/join').set(as(PREMIUM))).status, 201);
});

test('admin grants and revokes paid room access, audited', async () => {
  const grant = await api('post', '/rooms/room-vip/subscriptions').send({ user_id: OTHER.id, days: 7, status: 'x', amount_paid: 5 });
  assert.equal(grant.status, 201);
  assert.equal(subs.rows[0].status, 'active');
  assert.equal(Number(subs.rows[0].amount_paid), 0);
  assert.equal((await api('post', '/rooms/room-open/subscriptions').send({ user_id: OTHER.id })).status, 409, 'free rooms take no subscriptions');

  ws.rooms.set('room-vip', new Set([OTHER.id]));
  assert.equal((await api('post', `/room-subscriptions/${subs.rows[0].id}/revoke`)).status, 200);
  assert.equal(subs.rows[0].status, 'cancelled');
  assert.deepEqual(evicted, [[OTHER.id, 'room-vip']]);
  assert.deepEqual(audits.map((a) => a.action), ['CHAT_ROOM_ACCESS_GRANTED', 'CHAT_ROOM_ACCESS_REVOKED']);
});

// --- moderation rules -------------------------------------------------------------------------------

test('rules are validated and the stored shape is whitelisted', async () => {
  assert.equal((await api('post', '/rules').send({ name: 'x', rule_type: 'unknown' })).status, 400);
  assert.equal((await api('post', '/rules').send({ name: 'Words', rule_type: 'word_filter', conditions: { words: [] } })).status, 400);
  const res = await api('post', '/rules').send({
    name: 'Words', rule_type: 'word_filter', action: 'block', conditions: { words: 'Scam, PUMP ', junk: 1 }, created_by: OTHER.id,
  });
  assert.equal(res.status, 201);
  assert.deepEqual(rules.rows[0].conditions, { words: ['scam', 'pump'] });
  assert.equal(rules.rows[0].created_by, USERS.admin.id);
  assert.equal(audits.at(-1).action, 'CHAT_RULE_CREATED');
});

test('an active rule blocks matching posts, and a mute rule mutes the sender', async () => {
  rules.add({ name: 'No scams', rule_type: 'word_filter', action: 'mute', is_active: true, conditions: { words: ['scam'] }, chat_room_id: null });
  ChatModerationService.invalidateRules();

  const clean = await request(app).post('/api/messages').set(as(USERS.user)).send({ chat_room_id: 'room-open', content: 'scampi recipe' });
  assert.equal(clean.status, 201, 'whole words only');
  const bad = await request(app).post('/api/messages').set(as(USERS.user)).send({ chat_room_id: 'room-open', content: 'This is a SCAM!' });
  assert.equal(bad.status, 403);
  assert.equal(bad.body.code, 'MODERATION_RULE');
  assert.equal(participants.rows.find((p) => p.id === 'p-user').muted, true);
  assert.equal(audits.at(-1).action, 'CHAT_RULE_AUTO_MUTE');

  const mod = await request(app).post('/api/messages').set(as(MOD)).send({ chat_room_id: 'room-open', content: 'scam warning' });
  assert.equal(mod.status, 201, 'room moderators are exempt');
});

test('link, caps and mention rules', () => {
  const v = (rule_type, conditions, text) => ChatModerationService.violatesContentRule({ rule_type, conditions }, text);
  assert.equal(v('link_filter', { allowed_domains: ['nseindia.com'] }, 'see https://www.nseindia.com/x'), false);
  assert.equal(v('link_filter', { allowed_domains: ['nseindia.com'] }, 'join t.me/pump or evil.xyz'), true);
  assert.equal(v('caps_lock', { max_caps_percentage: 70 }, 'BUY THIS STOCK NOW'), true);
  assert.equal(v('caps_lock', { max_caps_percentage: 70 }, 'Buy TCS today, maybe'), false);
  assert.equal(v('mention_limit', { max_mentions: 2 }, '@a @b @c'), true);
});

// --- automations ------------------------------------------------------------------------------------

test('automations are validated and a due announcement is posted once', async () => {
  const past = new Date(Date.now() - 3600e3).toISOString();
  assert.equal((await api('post', '/automations').send({ chat_room_id: 'room-open', action_type: 'send_message', config: { run_at: past, message: 'hi' } })).status, 400);
  assert.equal((await api('post', '/automations').send({ chat_room_id: 'room-open', action_type: 'send_message', config: { run_at: new Date(Date.now() + 6e4).toISOString() } })).status, 400);

  const runAt = new Date(Date.now() + 60e3).toISOString();
  const res = await api('post', '/automations').send({ chat_room_id: 'room-open', action_type: 'send_message', config: { run_at: runAt, message: 'Market opens in 5', recurrence: 'once' } });
  assert.equal(res.status, 201);
  const row = automations.rows[0];
  assert.equal(row.created_by, USERS.admin.id);

  const later = new Date(Date.now() + 120e3);
  const ran = await RoomAutomationService.runDue(ws, later);
  assert.deepEqual(ran.map((r) => r.outcome), ['sent']);
  assert.equal(messages.rows.at(-1).content, 'Market opens in 5');
  assert.equal(messages.rows.at(-1).message_type, 'system');
  assert.equal(broadcasts.at(-1)[1].type, 'new_message');
  assert.equal(row.is_active, false, 'a one-off schedule turns itself off');
  assert.deepEqual(await RoomAutomationService.runDue(ws, new Date(Date.now() + 240e3)), []);
});

test('a recurring lock schedule locks the room and moves to the next day', async () => {
  const runAt = new Date(Date.now() + 60e3).toISOString();
  await api('post', '/automations').send({ chat_room_id: 'room-open', action_type: 'lock_room', config: { run_at: runAt, recurrence: 'daily' } });
  await RoomAutomationService.runDue(ws, new Date(Date.now() + 120e3));
  assert.equal(room('room-open').settings.locked, true);
  const row = automations.rows[0];
  assert.equal(row.is_active, true);
  assert.equal(new Date(row.config.next_run_at).getTime(), new Date(runAt).getTime() + 864e5);
});

// --- validation unit ---------------------------------------------------------------------------------

test('validateRoom normalises plans and symbols', () => {
  assert.equal(validateRoom({ name: 'Ab', required_plan: 'basic' }).data.required_plan, 'free');
  assert.equal(validateRoom({ name: 'Ab', required_plan: 'vip' }).data.is_premium, true);
  assert.equal(validateRoom({ name: 'Ab', stock_symbol: 'tcs;drop' }).errors.length, 1);
  assert.equal(validateRoom({ name: 'Ab', room_type: 'stock_specific', stock_symbol: 'm&m' }).data.stock_symbol, 'M&M');
});

test('a room owner cannot lift an archive, lock or ban by editing their room', async () => {
  rooms.add({ id: 'room-owned', name: 'Owned', owner_id: OTHER.id, status: 'archived', settings: { locked: true, bans: [{ user_id: USERS.user.id }] } });
  const res = await request(app).put('/api/chatrooms/room-owned').set(as(OTHER)).send({ status: 'active', settings: {}, description: 'mine' });
  assert.equal(res.status, 200);
  const owned = room('room-owned');
  assert.equal(owned.status, 'archived');
  assert.equal(owned.settings.locked, true);
  assert.equal(owned.settings.bans.length, 1);
  assert.equal(owned.description, 'mine');
});

// --- review round: security and correctness fixes ------------------------------------------

test('H-1: link detection is linear on adversarial input', () => {
  const rule = { rule_type: 'link_filter', conditions: { allowed_domains: ['nseindia.com'] } };
  for (const input of ['a-'.repeat(5000), 'a.'.repeat(5000), `${'a-'.repeat(100)}. `.repeat(50), 'x'.repeat(10000)]) {
    const started = process.hrtime.bigint();
    ChatModerationService.violatesContentRule(rule, input);
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(ms < 50, `took ${ms.toFixed(1)} ms`);
  }
  assert.deepEqual(ChatModerationService.linkHosts('see (https://www.NSEindia.com/x), t.me/pump, evil.xyz. e.g. file.txt'), ['nseindia.com', 't.me', 'evil.xyz']);
});

test('M-1: an author edit follows the posting rules', async () => {
  const edit = (user, id, content = 'edited') => request(app).put(`/api/messages/${id}`).set(as(user)).send({ content });
  messages.add({ id: 'm-gone', chat_room_id: 'room-open', user_id: USERS.user.id, content: 'x', is_deleted: true });
  assert.equal((await edit(USERS.user, 'm-gone')).status, 409, 'a removed message stays removed');

  participants.rows.find((p) => p.id === 'p-user').muted = true;
  assert.equal((await edit(USERS.user, 'm-1')).status, 403, 'muted');
  participants.rows.find((p) => p.id === 'p-user').muted = false;

  room('room-open').settings = { locked: true };
  assert.equal((await edit(USERS.user, 'm-1')).status, 403, 'locked');
  room('room-open').settings = { bans: [{ user_id: USERS.user.id }] };
  assert.equal((await edit(USERS.user, 'm-1')).status, 404, 'banned');
  room('room-open').settings = {};

  rules.add({ name: 'No scams', rule_type: 'word_filter', action: 'block', is_active: true, conditions: { words: ['scam'] }, chat_room_id: null });
  ChatModerationService.invalidateRules();
  const hit = await edit(USERS.user, 'm-1', 'actually a scam');
  assert.equal(hit.status, 403);
  assert.equal(hit.body.code, 'MODERATION_RULE');
  assert.equal(messages.rows.find((m) => m.id === 'm-1').content, 'hello');
  assert.equal((await edit(USERS.user, 'm-1', 'fine now')).status, 200);
});

test('M-4: members and the public never see room settings (bans, who locked)', async () => {
  room('room-open').settings = { locked: true, lock_reason: 'Hours', locked_by: USERS.admin.id, bans: [{ user_id: OTHER.id, reason: 'spam' }] };
  const pub = await request(app).get('/api/chatrooms/public');
  assert.equal(pub.status, 200);
  const listed = pub.body.find((r) => r.id === 'room-open');
  assert.equal(listed.settings, undefined);
  assert.equal(listed.locked, true);

  for (const path of ['/api/chatrooms', '/api/chatrooms/room-open']) {
    const res = await request(app).get(path).set(as(USERS.user));
    const body = Array.isArray(res.body) ? res.body.find((r) => r.id === 'room-open') : res.body;
    assert.equal(body.settings, undefined, path);
    assert.equal(JSON.stringify(res.body).includes('spam'), false, path);
  }
  const staff = await request(app).get('/api/chatrooms/room-open').set(as(USERS.admin));
  assert.equal(staff.body.settings.bans.length, 1, 'staff still see the raw row');

  const sent = [];
  mock.method(ws, 'sendToUser', (uid, data) => sent.push(data));
  db.User.findByPk.mock.mockImplementation(async (id) => {
    const u = { ...USERS.user, id };
    return { ...u, toJSON: () => u };
  });
  await ws.handleJoinRoom(USERS.user.id, 'room-open');
  const joined = sent.find((d) => d.type === 'room_joined');
  assert.equal(joined.room.settings, undefined);
  assert.equal(joined.room.locked, true);
});

test('S-3: a finished one-off cannot be re-armed without a new future time; resume never fires at once', async () => {
  const past = new Date(Date.now() - 3600e3).toISOString();
  const done = automations.add({ chat_room_id: 'room-open', trigger_type: 'schedule', action_type: 'send_message', is_active: false, last_triggered_at: new Date(past), config: { run_at: past, recurrence: 'once', message: 'hi', next_run_at: null } });
  const res = await api('put', `/automations/${done.id}`).send({ is_active: true });
  assert.equal(res.status, 400);
  assert.equal(done.is_active, false);
  assert.equal((await api('put', `/automations/${done.id}`).send({ is_active: true, config: { run_at: past } })).status, 400);

  const daily = automations.add({ chat_room_id: 'room-open', trigger_type: 'schedule', action_type: 'lock_room', is_active: false, last_triggered_at: null, config: { run_at: past, recurrence: 'daily', next_run_at: past } });
  assert.equal((await api('put', `/automations/${daily.id}`).send({ is_active: true })).status, 200);
  assert.ok(new Date(daily.config.next_run_at) > new Date(), 'moved to the next future slot');
  assert.deepEqual(await RoomAutomationService.runDue(ws, new Date()), []);
});

test('L-4: a run is claimed and advanced in one conditional update', async () => {
  const runAt = new Date(Date.now() - 1000).toISOString();
  const row = automations.add({ chat_room_id: 'room-open', trigger_type: 'schedule', action_type: 'send_message', is_active: true, last_triggered_at: null, config: { run_at: runAt, recurrence: 'daily', message: 'gm', next_run_at: runAt } });
  // A second process holding the same stale view of the row:
  const stale = { ...row, config: { ...row.config } };
  await RoomAutomationService.runDue(ws, new Date());
  assert.ok(new Date(row.config.next_run_at) > new Date());
  mock.method(db.RoomAutomation, 'findAll', async () => [stale]);
  assert.deepEqual(await RoomAutomationService.runDue(ws, new Date()), [], 'the stale claim fails');
  assert.equal(messages.rows.filter((m) => m.content === 'gm').length, 1);
});

test('S-7: bulk "Free" on a premium-type room is reported as failed, not silently ignored', async () => {
  const res = await api('post', '/rooms/bulk').send({ ids: ['room-vip', 'room-open'], action: 'set_plan', value: 'free' });
  assert.equal(res.status, 200);
  const vip = res.body.results.find((r) => r.id === 'room-vip');
  assert.equal(vip.ok, false);
  assert.match(vip.error, /cannot be Free/);
  assert.equal(room('room-vip').required_plan, 'vip');
});

test('L-1: a join that loses a unique-key race resolves to the existing row; mutes cover every row', async () => {
  let first = true;
  mock.method(db.ChatRoomParticipant, 'create', async (d) => {
    if (first) { first = false; participants.add(d); throw Object.assign(new Error('dup'), { name: 'SequelizeUniqueConstraintError' }); }
    return participants.add(d);
  });
  const res = await request(app).post('/api/chatrooms/room-open/join').set(as(OTHER));
  assert.equal(res.status, 200);
  assert.equal(participants.rows.filter((p) => p.user_id === OTHER.id).length, 1);

  participants.add({ chat_room_id: 'room-open', user_id: OTHER.id, role: 'member', muted: false }); // legacy duplicate
  assert.equal((await api('patch', `/rooms/room-open/participants/${OTHER.id}`).send({ muted: true })).status, 200);
  assert.ok(participants.rows.filter((p) => p.user_id === OTHER.id).every((p) => p.muted === true));
});

test('L-2/L-3: moderator invites are single-use and short-lived; only well-formed codes redeem', async () => {
  const res = await api('post', '/invites').send({ chat_room_id: 'room-open', role_to_assign: 'moderator', max_uses: 500, expires_in_hours: 720 });
  assert.equal(res.status, 201);
  assert.equal(invites.rows[0].max_uses, 1);
  assert.ok(new Date(invites.rows[0].expires_at) <= new Date(Date.now() + 168 * 3600e3 + 1000));

  invites.add({ chat_room_id: 'room-open', code: 'ABC123XY', is_active: true, max_uses: 10, uses_count: 0 });
  assert.equal((await request(app).post('/api/chatrooms/invites/ABC123XY/redeem').set(as(OTHER))).status, 404);
});

test('legacy invites without a limit stay unlimited', async () => {
  invites.add({ chat_room_id: 'room-open', code: 'ABCDEFGHJKLM', is_active: true, max_uses: null, uses_count: 7 });
  const update = mock.method(db.ChatInvite, 'update', async () => [1]);
  const res = await request(app).post('/api/chatrooms/invites/ABCDEFGHJKLM/redeem').set(as(OTHER));
  assert.equal(res.status, 200);
  assert.deepEqual(update.mock.calls[0].arguments[1].where, { id: invites.rows.at(-1).id, is_active: true });
});

test('message pages use a (created_at, id) cursor so the boundary second is not dropped', async () => {
  const findAll = mock.method(db.Message, 'findAll', async () => []);
  const before = '2026-01-01T00:00:00.000Z';
  await api('get', `/rooms/room-open/messages?before=${before}&before_id=m-5`);
  const [opts] = findAll.mock.calls[0].arguments;
  const { Op } = require('sequelize');
  assert.equal(opts.where[Op.or].length, 2);
  assert.equal(opts.where[Op.or][1].id[Op.lt], 'm-5');
  assert.deepEqual(opts.order, [['created_at', 'DESC'], ['id', 'DESC']]);
});

test('a legacy room with values that predate validation can still be edited', async () => {
  rooms.add({ id: 'room-legacy', name: 'X', stock_symbol: 'odd symbol!', room_type: 'general', status: 'active', settings: {} });
  const res = await api('put', '/rooms/room-legacy').send({ description: 'now described' });
  assert.equal(res.status, 200);
  assert.equal(room('room-legacy').description, 'now described');
  assert.equal(room('room-legacy').name, 'X', 'untouched fields are left alone');
  assert.equal((await api('put', '/rooms/room-legacy').send({ name: 'Y' })).status, 400, 'fields that are sent are validated');
});

test('sub_admin is not room staff', async () => {
  const SUB = { id: '77777777-7777-4777-8777-777777777777', app_role: 'sub_admin', role: 'user', status: 'active' };
  stubUserLookup({ [SUB.id]: SUB });
  rooms.add({ id: 'room-private', name: 'Private', is_public: false, owner_id: USERS.admin.id, status: 'active', settings: {} });
  assert.equal((await request(app).get('/api/messages/room/room-private').set(as(SUB))).status, 404);
  assert.equal((await request(app).post('/api/chatrooms/room-private/join').set(as(SUB))).status, 403);
});

// --- WebSocket account re-checks ----------------------------------------------------------------

const fakeSocket = () => ({
  readyState: 1, sent: [], handlers: {},
  send(m) { this.sent.push(JSON.parse(m)); },
  on(event, fn) { this.handlers[event] = fn; },
  close(code) { this.closedWith = code; },
});

test('WS: a sanction landing during the handshake still closes the socket', async () => {
  const statuses = ['active', 'banned'];
  db.User.findByPk.mock.mockImplementation(async (id) => ({ id, status: statuses.shift() ?? 'banned' }));
  const sock = fakeSocket();
  const token = bearer(USERS.user).slice('Bearer '.length);
  await ws.handleConnection(sock, { url: `/?token=${token}` });
  assert.equal(sock.closedWith, 4003);
  assert.equal(sock.sent.some((m) => m.type === 'connected'), false);
  ws.clients.delete(USERS.user.id);
});

test('WS: join and post re-check the account (cached briefly)', async () => {
  let status = 'active';
  const lookups = mock.fn(async (id) => ({ id, status }));
  db.User.findByPk.mock.mockImplementation(async (id, opts) => (opts?.attributes?.length === 2 ? lookups(id) : { ...USERS.user, id }));
  const sock = { ...fakeSocket(), userId: USERS.user.id };
  const frame = (type) => Buffer.from(JSON.stringify({ type, roomId: 'room-open', content: 'x' }));

  await ws.handleMessage(sock, frame('chat_message'));
  await ws.handleMessage(sock, frame('chat_message'));
  assert.equal(lookups.mock.callCount(), 1, 'cached for the second frame');

  status = 'suspended';
  sock.accountCheckedAt = Date.now() - 31000;
  mock.method(db.UserSanction, 'findAll', async () => [{ id: 's', ends_at: null }]);
  const before = messages.rows.length;
  await ws.handleMessage(sock, frame('chat_message'));
  assert.equal(sock.closedWith, 4003);
  assert.equal(messages.rows.length, before, 'nothing posted after the suspension');
});
