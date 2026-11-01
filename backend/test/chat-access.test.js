const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const WebSocketService = require('../src/services/WebSocketService');

// SEC-11: chat authorization. The participant table decides who reads a
// private room and who moderates it, and it was writable by anyone.

const id = (n) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const OWNER = { id: id(6), app_role: 'user', role: 'user', status: 'active' };
const MODERATOR = { id: id(7), app_role: 'user', role: 'user', status: 'active' };
const PREMIUM = { id: id(8), app_role: 'user', role: 'user', status: 'active', is_premium: true };
const ROOM_ADMIN = { id: id(9), app_role: 'user', role: 'user', status: 'active' };

const ROOMS = {
  'room-open': { id: 'room-open', owner_id: OWNER.id, is_public: null, is_premium: null },
  'room-private': { id: 'room-private', owner_id: OWNER.id, is_public: false },
  'room-premium': { id: 'room-premium', owner_id: OWNER.id, is_premium: true },
  'room-announce': { id: 'room-announce', owner_id: OWNER.id, admin_only_post: true },
};

/** A stubbed row that records what was written to it. */
const row = (fields) => ({
  ...fields,
  async update(data) { Object.assign(this, data); this.updatedWith = data; return this; },
  async destroy() { this.destroyed = true; },
});

let participants;
let messages;
beforeEach(() => {
  stubUserLookup({ [OWNER.id]: OWNER, [MODERATOR.id]: MODERATOR, [PREMIUM.id]: PREMIUM, [ROOM_ADMIN.id]: ROOM_ADMIN });
  participants = {
    'p-mod': row({ id: 'p-mod', chat_room_id: 'room-open', user_id: MODERATOR.id, role: 'moderator' }),
    'p-user': row({ id: 'p-user', chat_room_id: 'room-open', user_id: USERS.user.id, role: 'member' }),
    'p-admin': row({ id: 'p-admin', chat_room_id: 'room-open', user_id: ROOM_ADMIN.id, role: 'admin' }),
    'p-mod-announce': row({ id: 'p-mod-announce', chat_room_id: 'room-announce', user_id: MODERATOR.id, role: 'moderator' }),
    'p-user-announce': row({ id: 'p-user-announce', chat_room_id: 'room-announce', user_id: USERS.user.id, role: 'member' }),
  };
  messages = {
    'msg-mod': row({ id: 'msg-mod', chat_room_id: 'room-open', user_id: MODERATOR.id, content: 'hi' }),
    'msg-user': row({ id: 'msg-user', chat_room_id: 'room-open', user_id: USERS.user.id, content: 'mine' }),
    'msg-private': row({ id: 'msg-private', chat_room_id: 'room-private', user_id: OWNER.id, content: 'secret' }),
  };
  mock.method(db.ChatRoom, 'findByPk', async (rid) => (ROOMS[rid] ? row(ROOMS[rid]) : null));
  mock.method(db.ChatRoom, 'findAll', async ({ where }) =>
    Object.values(ROOMS).filter((r) => (where.owner_id ? r.owner_id === where.owner_id : r.is_public !== false && r.is_premium !== true)));
  mock.method(db.ChatRoom, 'increment', async () => {});
  mock.method(db.ChatRoom, 'decrement', async () => {});
  mock.method(db.ChatRoomParticipant, 'findOne', async ({ where }) =>
    Object.values(participants).find((p) => p.chat_room_id === where.chat_room_id && p.user_id === where.user_id) || null);
  mock.method(db.ChatRoomParticipant, 'findAll', async ({ where }) =>
    Object.values(participants).filter((p) => p.user_id === where.user_id));
  mock.method(db.ChatRoomParticipant, 'findByPk', async (pid) => participants[pid] || null);
  mock.method(db.Message, 'findByPk', async (mid) => messages[mid] || null);
  mock.method(db.RoomSubscription, 'findOne', async () => null);
});
afterEach(() => mock.restoreAll());

// --- participants -------------------------------------------------------------

test('a user cannot add themselves to a private room as moderator', async () => {
  const create = mock.method(db.ChatRoomParticipant, 'create', async (d) => row(d));
  const res = await request(app).post('/api/chatrooms/participants').set('Authorization', bearer(USERS.user))
    .send({ chat_room_id: 'room-private', user_id: USERS.user.id, role: 'moderator' });
  assert.equal(res.status, 404);
  assert.equal(create.mock.callCount(), 0);
});

test('a moderator may add members but not admins', async () => {
  const create = mock.method(db.ChatRoomParticipant, 'create', async (d) => row({ id: 'new', ...d }));
  const admin = await request(app).post('/api/chatrooms/participants').set('Authorization', bearer(MODERATOR))
    .send({ chat_room_id: 'room-open', user_id: PREMIUM.id, role: 'admin' });
  assert.equal(admin.status, 403);

  const member = await request(app).post('/api/chatrooms/participants').set('Authorization', bearer(MODERATOR))
    .send({ chat_room_id: 'room-open', user_id: PREMIUM.id, muted: false, id: 'forced' });
  assert.equal(member.status, 201);
  const [written] = create.mock.calls[0].arguments;
  assert.equal(written.role, 'member');
  assert.equal(written.user_id, PREMIUM.id);
  assert.equal(written.id, undefined);
});

test('a member cannot promote themselves', async () => {
  const res = await request(app).put('/api/chatrooms/participants/p-user').set('Authorization', bearer(USERS.user))
    .send({ role: 'moderator', muted: false, last_read_at: '2026-10-29T00:00:00Z' });
  assert.equal(res.status, 200);
  assert.deepEqual(participants['p-user'].updatedWith, { last_read_at: '2026-10-29T00:00:00Z' });
  assert.equal(participants['p-user'].role, 'member');
});

test('a moderator can mute a member but not touch a room admin', async () => {
  const mute = await request(app).put('/api/chatrooms/participants/p-user').set('Authorization', bearer(MODERATOR)).send({ muted: true, user_id: MODERATOR.id });
  assert.equal(mute.status, 200);
  assert.deepEqual(participants['p-user'].updatedWith, { muted: true });

  const up = await request(app).put('/api/chatrooms/participants/p-admin').set('Authorization', bearer(MODERATOR)).send({ muted: true });
  assert.equal(up.status, 404);
  assert.equal(participants['p-admin'].updatedWith, undefined);
});

test('only the owner may make someone a room admin', async () => {
  const byMod = await request(app).put('/api/chatrooms/participants/p-user').set('Authorization', bearer(MODERATOR)).send({ role: 'admin' });
  assert.equal(byMod.status, 403);
  const byOwner = await request(app).put('/api/chatrooms/participants/p-user').set('Authorization', bearer(OWNER)).send({ role: 'admin' });
  assert.equal(byOwner.status, 200);
  assert.equal(participants['p-user'].role, 'admin');
});

test('members can leave but cannot remove each other', async () => {
  const other = await request(app).delete('/api/chatrooms/participants/p-mod').set('Authorization', bearer(USERS.user));
  assert.equal(other.status, 404);
  assert.notEqual(participants['p-mod'].destroyed, true);
  const self = await request(app).delete('/api/chatrooms/participants/p-user').set('Authorization', bearer(USERS.user));
  assert.equal(self.status, 200);
  assert.equal(participants['p-user'].destroyed, true);
});

// --- rooms, join, subscriptions ---------------------------------------------------

test('a non-owner cannot take over or edit a room', async () => {
  const res = await request(app).put('/api/chatrooms/room-open').set('Authorization', bearer(MODERATOR)).send({ owner_id: MODERATOR.id });
  assert.equal(res.status, 404);
});

test('the owner cannot reassign ownership or set counters', async () => {
  const room = row(ROOMS['room-open']);
  db.ChatRoom.findByPk.mock.mockImplementation(async () => room);
  const res = await request(app).put('/api/chatrooms/room-open').set('Authorization', bearer(OWNER))
    .send({ name: 'Renamed', owner_id: USERS.user.id, participant_count: 9999 });
  assert.equal(res.status, 200);
  assert.deepEqual(room.updatedWith, { name: 'Renamed' });
});

test('joining: private rooms are invite-only, premium rooms need premium', async () => {
  const create = mock.method(db.ChatRoomParticipant, 'create', async (d) => row(d));
  const join = (rid, user) => request(app).post(`/api/chatrooms/${rid}/join`).set('Authorization', bearer(user));

  assert.equal((await join('room-private', PREMIUM)).status, 403);
  assert.equal((await join('room-premium', USERS.user)).status, 403);
  assert.equal(create.mock.callCount(), 0);

  assert.equal((await join('room-premium', PREMIUM)).status, 201);
  assert.equal((await join('room-open', PREMIUM)).status, 201);
  assert.equal((await join('room-missing', PREMIUM)).status, 404);
  assert.equal(create.mock.calls[0].arguments[0].role, 'member');
});

test('an active room subscription opens a premium room', async () => {
  db.RoomSubscription.findOne.mock.mockImplementation(async () => ({ status: 'active', expires_at: null }));
  mock.method(db.ChatRoomParticipant, 'create', async (d) => row(d));
  const res = await request(app).post('/api/chatrooms/room-premium/join').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 201);
});

test('leaving a room you are not in does not move the counter', async () => {
  mock.method(db.ChatRoomParticipant, 'destroy', async () => 0);
  await request(app).post('/api/chatrooms/room-open/leave').set('Authorization', bearer(PREMIUM));
  assert.equal(db.ChatRoom.decrement.mock.callCount(), 0);
});

test('a self-created room subscription starts pending, not active', async () => {
  const create = mock.method(db.RoomSubscription, 'create', async (d) => d);
  const res = await request(app).post('/api/chatrooms/subscriptions').set('Authorization', bearer(USERS.user))
    .send({ room_id: 'room-premium', status: 'active' });
  assert.equal(res.status, 201);
  assert.equal(create.mock.calls[0].arguments[0].status, 'pending');
});

// --- messages ---------------------------------------------------------------------

test('a message is always posted as the caller', async () => {
  const create = mock.method(db.Message, 'create', async (d) => d);
  const res = await request(app).post('/api/messages').set('Authorization', bearer(USERS.user))
    .send({ chat_room_id: 'room-open', content: 'hello', user_id: OWNER.id, is_pinned: true });
  assert.equal(res.status, 201);
  const [written] = create.mock.calls[0].arguments;
  assert.equal(written.user_id, USERS.user.id);
  assert.equal(written.is_pinned, undefined);
});

test('posting is refused in unreadable, admin-only and muted cases', async () => {
  const create = mock.method(db.Message, 'create', async (d) => d);
  const post = (user, rid) => request(app).post('/api/messages').set('Authorization', bearer(user)).send({ chat_room_id: rid, content: 'x' });

  assert.equal((await post(USERS.user, 'room-private')).status, 404);
  assert.equal((await post(USERS.user, 'room-announce')).status, 403);
  participants['p-user'].muted = true;
  assert.equal((await post(USERS.user, 'room-open')).status, 403);
  assert.equal(create.mock.callCount(), 0);

  assert.equal((await post(MODERATOR, 'room-announce')).status, 201);
});

test('only the author edits a message; edits are marked', async () => {
  const other = await request(app).put('/api/messages/msg-mod').set('Authorization', bearer(USERS.user)).send({ content: 'hijacked' });
  assert.equal(other.status, 404);
  assert.equal(messages['msg-mod'].content, 'hi');

  const own = await request(app).put('/api/messages/msg-user').set('Authorization', bearer(USERS.user))
    .send({ content: 'edited', is_pinned: true, user_id: OWNER.id });
  assert.equal(own.status, 200);
  assert.equal(messages['msg-user'].content, 'edited');
  assert.equal(messages['msg-user'].is_edited, true);
  assert.equal(messages['msg-user'].is_pinned, undefined);
  assert.equal(messages['msg-user'].user_id, USERS.user.id);
});

test('a moderator pins and deletes others\' messages; a member cannot', async () => {
  const pin = await request(app).put('/api/messages/msg-user').set('Authorization', bearer(MODERATOR)).send({ is_pinned: true, content: 'x' });
  assert.equal(pin.status, 200);
  assert.deepEqual(messages['msg-user'].updatedWith, { is_pinned: true });

  assert.equal((await request(app).put('/api/messages/msg-mod/pin').set('Authorization', bearer(USERS.user))).status, 404);
  assert.equal((await request(app).delete('/api/messages/msg-mod').set('Authorization', bearer(USERS.user))).status, 404);
  assert.notEqual(messages['msg-mod'].destroyed, true);

  assert.equal((await request(app).delete('/api/messages/msg-user').set('Authorization', bearer(MODERATOR))).status, 200);
  assert.equal(messages['msg-user'].destroyed, true);
});

test('room history page size is capped', async () => {
  const findAll = mock.method(db.Message, 'findAll', async () => []);
  await request(app).get('/api/messages/room/room-open?limit=100000').set('Authorization', bearer(USERS.user));
  assert.equal(findAll.mock.calls[0].arguments[0].limit, 100);
  const bad = await request(app).get('/api/messages/room/room-open?before=not-a-date').set('Authorization', bearer(USERS.user));
  assert.equal(bad.status, 400);
});

test('reactions are stamped with the caller and need a readable message', async () => {
  const create = mock.method(db.MessageReaction, 'create', async (d) => d);
  const ok = await request(app).post('/api/messages/reactions').set('Authorization', bearer(USERS.user))
    .send({ message_id: 'msg-mod', emoji: '👍', user_id: OWNER.id });
  assert.equal(ok.status, 201);
  assert.equal(create.mock.calls[0].arguments[0].user_id, USERS.user.id);

  const hidden = await request(app).post('/api/messages/reactions').set('Authorization', bearer(USERS.user))
    .send({ message_id: 'msg-private', emoji: '👍' });
  assert.equal(hidden.status, 404);
});

test('a user cannot delete someone else\'s reaction', async () => {
  const reaction = row({ id: 'r1', message_id: 'msg-mod', user_id: MODERATOR.id });
  mock.method(db.MessageReaction, 'findByPk', async () => reaction);
  const res = await request(app).delete('/api/messages/reactions/r1').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 404);
  assert.notEqual(reaction.destroyed, true);
});

// --- WebSocket ----------------------------------------------------------------------

/** A WebSocketService with no network, capturing what it sends. */
function fakeWs() {
  const svc = Object.create(WebSocketService.prototype);
  svc.rooms = new Map();
  svc.clients = new Map();
  svc.typingTimeouts = new Map();
  svc.sent = [];
  svc.broadcasts = [];
  svc.sendToUser = (userId, data) => svc.sent.push({ userId, data });
  svc.broadcastToRoom = (roomId, data) => svc.broadcasts.push({ roomId, data });
  return svc;
}

test('the WebSocket server caps frame size', () => {
  const svc = new WebSocketService(http.createServer());
  try {
    assert.equal(svc.wss.options.maxPayload, 64 * 1024);
  } finally {
    svc.wss.close();
  }
});

test('WS join_room refuses a private room and does not track the user', async () => {
  const create = mock.method(db.ChatRoomParticipant, 'create', async (d) => d);
  const svc = fakeWs();
  await svc.handleMessage({ userId: PREMIUM.id }, Buffer.from(JSON.stringify({ type: 'join_room', roomId: 'room-private' })));
  assert.equal(create.mock.callCount(), 0);
  assert.equal(svc.isInRoom(PREMIUM.id, 'room-private'), false);
  assert.deepEqual(svc.sent.at(-1).data, { type: 'error', message: 'You cannot join this room' });
});

test('WS join broadcasts never include email', async () => {
  mock.method(db.ChatRoomParticipant, 'create', async (d) => d);
  // Behave like Sequelize: honour `attributes`, return an instance with toJSON.
  db.User.findByPk.mock.mockImplementation(async (uid, opts = {}) => {
    const full = { ...PREMIUM, id: uid, email: 'premium@example.test', name: 'P' };
    const plain = Array.isArray(opts.attributes)
      ? Object.fromEntries(opts.attributes.map((a) => [a, full[a]]))
      : full;
    return { ...plain, toJSON: () => plain };
  });
  const svc = fakeWs();
  await svc.handleJoinRoom(PREMIUM.id, 'room-open');
  assert.equal(svc.isInRoom(PREMIUM.id, 'room-open'), true);
  const joined = svc.broadcasts.find((b) => b.data.type === 'user_joined');
  assert.equal(joined.data.user.id, PREMIUM.id);
  assert.equal('email' in joined.data.user, false);
});

test('WS room events need a prior join', async () => {
  const svc = fakeWs();
  for (const type of ['typing_start', 'read_messages', 'leave_room']) {
    await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type, roomId: 'room-private' })));
  }
  await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type: 'message_reaction', messageId: 'msg-private', emoji: '👍' })));
  assert.deepEqual(svc.broadcasts, []);
});

test('WS errors do not leak internal messages', async () => {
  db.ChatRoom.findByPk.mock.mockImplementation(async () => { throw new Error('ER_NO_SUCH_TABLE: chat_rooms'); });
  const svc = fakeWs();
  await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type: 'join_room', roomId: 'room-open' })));
  assert.deepEqual(svc.sent.at(-1).data, { type: 'error', message: 'Request failed' });
});

test('WS muted participants cannot post', async () => {
  const create = mock.method(db.Message, 'create', async (d) => d);
  participants['p-user'].muted = true;
  const svc = fakeWs();
  await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type: 'chat_message', roomId: 'room-open', content: 'x' })));
  assert.equal(create.mock.callCount(), 0);
  assert.deepEqual(svc.sent.at(-1).data, { type: 'error', message: 'You are muted in this room' });
});

// --- review follow-ups ------------------------------------------------------------

test('a subscriber cannot move their subscription to another room', async () => {
  const sub = row({ id: 'sub1', user_id: USERS.user.id, room_id: 'room-cheap', status: 'active' });
  mock.method(db.RoomSubscription, 'findByPk', async () => sub);
  const res = await request(app).put('/api/chatrooms/subscriptions/sub1').set('Authorization', bearer(USERS.user))
    .send({ room_id: 'room-premium', start_date: '2020-01-01' });
  assert.equal(res.status, 200);
  assert.equal(sub.room_id, 'room-cheap');
  assert.equal(sub.start_date, undefined);
});

test('a lapsed premium member loses read access', async () => {
  participants['p-user-premium'] = row({ id: 'p-user-premium', chat_room_id: 'room-premium', user_id: USERS.user.id, role: 'member' });
  mock.method(db.Message, 'findAll', async () => []);
  const lapsed = await request(app).get('/api/messages/room/room-premium').set('Authorization', bearer(USERS.user));
  assert.equal(lapsed.status, 404);

  db.RoomSubscription.findOne.mock.mockImplementation(async () => ({ status: 'active', expires_at: '2999-01-01' }));
  const renewed = await request(app).get('/api/messages/room/room-premium').set('Authorization', bearer(USERS.user));
  assert.equal(renewed.status, 200);
});

test('a lapsed premium member cannot rejoin over WS', async () => {
  participants['p-user-premium'] = row({ id: 'p-user-premium', chat_room_id: 'room-premium', user_id: USERS.user.id, role: 'member' });
  const svc = fakeWs();
  await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type: 'join_room', roomId: 'room-premium' })));
  assert.equal(svc.isInRoom(USERS.user.id, 'room-premium'), false);
});

test('a muted member cannot leave to shed the mute, nor post from outside', async () => {
  participants['p-user'].muted = true;
  assert.equal((await request(app).post('/api/chatrooms/room-open/leave').set('Authorization', bearer(USERS.user))).status, 403);
  assert.equal((await request(app).delete('/api/chatrooms/participants/p-user').set('Authorization', bearer(USERS.user))).status, 403);
  assert.notEqual(participants['p-user'].destroyed, true);

  const create = mock.method(db.Message, 'create', async (d) => d);
  const outsider = await request(app).post('/api/messages').set('Authorization', bearer(PREMIUM)).send({ chat_room_id: 'room-open', content: 'x' });
  assert.equal(outsider.status, 403);
  assert.equal(create.mock.callCount(), 0);
});

test('removing a participant decrements the count and evicts their socket', async () => {
  const evict = mock.method(app.get('wsService'), 'evictFromRoom', () => {});
  const res = await request(app).delete('/api/chatrooms/participants/p-user').set('Authorization', bearer(MODERATOR));
  assert.equal(res.status, 200);
  assert.equal(db.ChatRoom.decrement.mock.callCount(), 1);
  assert.deepEqual(evict.mock.calls[0].arguments, [USERS.user.id, 'room-open']);
});

test('adding an existing participant again does not duplicate them', async () => {
  const create = mock.method(db.ChatRoomParticipant, 'create', async (d) => row(d));
  const res = await request(app).post('/api/chatrooms/participants').set('Authorization', bearer(MODERATOR))
    .send({ chat_room_id: 'room-open', user_id: USERS.user.id });
  assert.equal(res.status, 200);
  assert.equal(create.mock.callCount(), 0);
  assert.equal(db.ChatRoom.increment.mock.callCount(), 0);
});

test('evictFromRoom stops room delivery for that user', () => {
  const svc = fakeWs();
  svc.rooms.set('room-private', new Set([USERS.user.id, OWNER.id]));
  svc.evictFromRoom(USERS.user.id, 'room-private');
  assert.equal(svc.isInRoom(USERS.user.id, 'room-private'), false);
  assert.equal(svc.isInRoom(OWNER.id, 'room-private'), true);
  assert.equal(svc.sent[0].data.type, 'removed_from_room');
});

test('reactions are listed only for a readable message', async () => {
  const findAll = mock.method(db.MessageReaction, 'findAll', async () => []);
  const list = (q) => request(app).get(`/api/messages/reactions${q}`).set('Authorization', bearer(USERS.user));
  assert.equal((await list('')).status, 404);
  assert.equal((await list('?message_id=msg-private')).status, 404);
  assert.equal(findAll.mock.callCount(), 0);
  assert.equal((await list('?message_id=msg-mod')).status, 200);
});

test('read receipts are listed only to their owner', async () => {
  const findAll = mock.method(db.MessageReadReceipt, 'findAll', async () => []);
  await request(app).get('/api/messages/read-receipts').set('Authorization', bearer(USERS.user));
  assert.equal(findAll.mock.calls[0].arguments[0].where.user_id, USERS.user.id);
});

test('a reaction cannot be moved to another message', async () => {
  const reaction = row({ id: 'r1', message_id: 'msg-mod', user_id: USERS.user.id, emoji: '👍' });
  mock.method(db.MessageReaction, 'findByPk', async () => reaction);
  const res = await request(app).put('/api/messages/reactions/r1').set('Authorization', bearer(USERS.user))
    .send({ message_id: 'msg-private', emoji: '🔥' });
  assert.equal(res.status, 200);
  assert.equal(reaction.message_id, 'msg-mod');
  assert.equal(reaction.emoji, '🔥');
});

test('an owner cannot switch a room to premium or admin by editing it', async () => {
  const room = row(ROOMS['room-open']);
  db.ChatRoom.findByPk.mock.mockImplementation(async () => room);
  await request(app).put('/api/chatrooms/room-open').set('Authorization', bearer(OWNER))
    .send({ description: 'd', is_premium: true, room_type: 'admin' });
  assert.deepEqual(room.updatedWith, { description: 'd' });
});

test('an edit with nothing the caller may change is refused, not a silent 200', async () => {
  const res = await request(app).put('/api/messages/msg-user').set('Authorization', bearer(USERS.user)).send({ is_pinned: true });
  assert.equal(res.status, 403);
});

test('a REST reply cannot point into another room', async () => {
  const create = mock.method(db.Message, 'create', async (d) => d);
  await request(app).post('/api/messages').set('Authorization', bearer(USERS.user))
    .send({ chat_room_id: 'room-open', content: 'x', reply_to_id: 'msg-private' });
  assert.equal(create.mock.calls[0].arguments[0].reply_to_id, null);
});

// --- second review follow-ups -------------------------------------------------------

test('a moderator cannot appoint moderators; a room admin can', async () => {
  mock.method(db.ChatRoomParticipant, 'create', async (d) => row({ id: 'new', ...d }));
  const byMod = await request(app).post('/api/chatrooms/participants').set('Authorization', bearer(MODERATOR))
    .send({ chat_room_id: 'room-open', user_id: PREMIUM.id, role: 'moderator' });
  assert.equal(byMod.status, 403);

  const promote = await request(app).put('/api/chatrooms/participants/p-user').set('Authorization', bearer(MODERATOR))
    .send({ role: 'moderator' });
  assert.equal(promote.status, 403);
  assert.equal(participants['p-user'].role, 'member');

  const byAdmin = await request(app).post('/api/chatrooms/participants').set('Authorization', bearer(ROOM_ADMIN))
    .send({ chat_room_id: 'room-open', user_id: PREMIUM.id, role: 'moderator' });
  assert.equal(byAdmin.status, 201);
});

test('WS: a lapsed premium member cannot post', async () => {
  const create = mock.method(db.Message, 'create', async (d) => d);
  participants['p-user-premium'] = row({ id: 'p-user-premium', chat_room_id: 'room-premium', user_id: USERS.user.id, role: 'member' });
  const svc = fakeWs();
  await svc.handleMessage({ userId: USERS.user.id }, Buffer.from(JSON.stringify({ type: 'chat_message', roomId: 'room-premium', content: 'x' })));
  assert.equal(create.mock.callCount(), 0);
  assert.deepEqual(svc.sent.at(-1).data, { type: 'error', message: 'Not a member of this room' });
});
