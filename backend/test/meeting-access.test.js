const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { Op } = require('sequelize');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { safeMeetingUrl } = require('../src/routes/meeting.routes');

// SEC-32: meeting links were stored unvalidated, and any signed-in user could
// change or end any room's meeting.

const HOST_ID = '66666666-6666-4666-8666-666666666666';
const ROOM_OWNER_ID = '88888888-8888-4888-8888-888888888888';
const MODERATOR = { id: '77777777-7777-4777-8777-777777777777', email: 'mod@example.test', app_role: 'user', role: 'user', status: 'active' };

const ROOMS = {
  open: { id: 'room-open', owner_id: HOST_ID, is_public: null, is_premium: null },
  owned: { id: 'room-owned', owner_id: '88888888-8888-4888-8888-888888888888', is_public: false, is_premium: false },
  private: { id: 'room-private', owner_id: HOST_ID, is_public: false, is_premium: false },
};
// Room memberships: room id -> user id -> participant role.
const MEMBERS = { 'room-open': { [MODERATOR.id]: 'moderator', [USERS.user.id]: 'member' } };

const meetingRecord = (fields) => ({
  id: 'm1', chat_room_id: 'room-open', host_id: HOST_ID, status: 'active', meeting_url: 'https://meet.google.com/abc',
  ...fields,
  async update(data) { Object.assign(this, data); return this; },
});

let meeting;
beforeEach(() => {
  stubUserLookup({
    [MODERATOR.id]: MODERATOR,
    [HOST_ID]: { id: HOST_ID, app_role: 'user', role: 'user', status: 'active' },
    [ROOM_OWNER_ID]: { id: ROOM_OWNER_ID, app_role: 'user', role: 'user', status: 'active' },
  });
  meeting = meetingRecord();
  mock.method(db.Meeting, 'findByPk', async (id) => (id === meeting.id ? meeting : null));
  mock.method(db.ChatRoom, 'findByPk', async (id) => Object.values(ROOMS).find((r) => r.id === id) || null);
  mock.method(db.ChatRoomParticipant, 'findOne', async ({ where }) => {
    const role = MEMBERS[where.chat_room_id]?.[where.user_id];
    return role ? { role } : null;
  });
});
afterEach(() => mock.restoreAll());

test('unauthenticated meeting reads are 401', async () => {
  assert.equal((await request(app).get('/api/meetings/room/room-open/active')).status, 401);
  assert.equal((await request(app).get('/api/meetings?chat_room_id=room-open')).status, 401);
});

test('safeMeetingUrl accepts https links to known providers only', () => {
  assert.equal(safeMeetingUrl('https://meet.google.com/abc-defg-hij'), 'https://meet.google.com/abc-defg-hij');
  assert.ok(safeMeetingUrl('https://us02web.zoom.us/j/123'));
  assert.ok(safeMeetingUrl('https://teams.microsoft.com/l/meetup-join/x'));
  for (const bad of [
    'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'http://meet.google.com/abc',
    'https://evil.example/meet.google.com', 'https://meet.google.com.evil.example/x', 'https://notzoom.us/j/1',
    'https://user:pass@meet.google.com/x', 'https://meet.google.com:8443/x', `https://meet.google.com/${'é'.repeat(120)}`,
    'not a url', '', null, { href: 'https://meet.google.com' },
  ]) {
    assert.equal(safeMeetingUrl(bad), null, String(bad));
  }
});

for (const url of ['javascript:alert(1)', 'data:text/html,x', 'http://meet.google.com/abc', 'https://evil.example/x']) {
  test(`creating a meeting with ${url} is rejected`, async () => {
    const create = mock.method(db.Meeting, 'create', async (d) => d);
    const res = await request(app).post('/api/meetings').set('Authorization', bearer(USERS.user))
      .send({ chat_room_id: 'room-open', meeting_url: url });
    assert.equal(res.status, 400);
    assert.equal(create.mock.callCount(), 0);
  });
}

test('a room member creates a meeting as its host, with whitelisted fields', async () => {
  const create = mock.method(db.Meeting, 'create', async (d) => d);
  const res = await request(app).post('/api/meetings').set('Authorization', bearer(USERS.user))
    .send({ chat_room_id: 'room-open', meeting_url: 'https://meet.google.com/xyz', status: 'active', host_id: HOST_ID, recording_url: 'https://evil.example' });
  assert.equal(res.status, 201);
  const [written] = create.mock.calls[0].arguments;
  assert.equal(written.host_id, USERS.user.id);
  assert.equal(written.meeting_url, 'https://meet.google.com/xyz');
  assert.equal(written.recording_url, undefined);
});

test('a non-member cannot start a meeting in a private room', async () => {
  const create = mock.method(db.Meeting, 'create', async (d) => d);
  const res = await request(app).post('/api/meetings').set('Authorization', bearer(USERS.user))
    .send({ chat_room_id: 'room-private', meeting_url: 'https://meet.google.com/xyz' });
  assert.equal(res.status, 403);
  assert.equal(create.mock.callCount(), 0);
});

test('a plain member cannot update, end or delete someone else\'s meeting', async () => {
  const update = mock.method(meeting, 'update');
  const put = await request(app).put('/api/meetings/m1').set('Authorization', bearer(USERS.user)).send({ meeting_url: 'https://meet.google.com/new' });
  const end = await request(app).put('/api/meetings/m1/end').set('Authorization', bearer(USERS.user));
  const del = await request(app).delete('/api/meetings/m1').set('Authorization', bearer(USERS.user));
  assert.deepEqual([put.status, end.status, del.status], [404, 404, 404]);
  assert.equal(update.mock.callCount(), 0);
});

test('a meeting in another room cannot be managed by this room\'s moderator', async () => {
  meeting = meetingRecord({ chat_room_id: 'room-private' });
  const update = mock.method(meeting, 'update');
  const res = await request(app).put('/api/meetings/m1/end').set('Authorization', bearer(MODERATOR));
  assert.equal(res.status, 404);
  assert.equal(update.mock.callCount(), 0);
});

test('a room moderator may update the link; host and room are immutable', async () => {
  const res = await request(app).put('/api/meetings/m1').set('Authorization', bearer(MODERATOR))
    .send({ meeting_url: 'https://zoom.us/j/1', host_id: MODERATOR.id, chat_room_id: 'room-private' });
  assert.equal(res.status, 200);
  assert.equal(meeting.meeting_url, 'https://zoom.us/j/1');
  assert.equal(meeting.host_id, HOST_ID);
  assert.equal(meeting.chat_room_id, 'room-open');
});

test('the host cannot switch the link to javascript:', async () => {
  const res = await request(app).put('/api/meetings/m1').set('Authorization', bearer({ id: HOST_ID }))
    .send({ meeting_url: 'javascript:alert(1)' });
  assert.equal(res.status, 400);
  assert.equal(meeting.meeting_url, 'https://meet.google.com/abc');
});

test('the host and staff may end a meeting', async () => {
  const byHost = await request(app).put('/api/meetings/m1/end').set('Authorization', bearer({ id: HOST_ID }));
  assert.equal(byHost.status, 200);
  assert.equal(meeting.status, 'ended');

  meeting = meetingRecord({ chat_room_id: 'room-private', host_id: null });
  const byAdmin = await request(app).put('/api/meetings/m1/end').set('Authorization', bearer(USERS.admin));
  assert.equal(byAdmin.status, 200);
});

test('a private room\'s meetings are hidden from non-members', async () => {
  const findOne = mock.method(db.Meeting, 'findOne', async () => meeting);
  const active = await request(app).get('/api/meetings/room/room-private/active').set('Authorization', bearer(USERS.user));
  assert.equal(active.status, 404);
  assert.equal(findOne.mock.callCount(), 0);

  const findAll = mock.method(db.Meeting, 'findAll', async () => []);
  await request(app).get('/api/meetings?chat_room_id=room-private').set('Authorization', bearer(USERS.user));
  assert.equal(findAll.mock.calls[0].arguments[0].where.id, '__none__');
});

test('a readable room\'s listing keeps its chat_room_id filter', async () => {
  const findAll = mock.method(db.Meeting, 'findAll', async () => []);
  const res = await request(app).get('/api/meetings?chat_room_id=room-open&status=active').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  const { where } = findAll.mock.calls[0].arguments[0];
  assert.equal(where.chat_room_id, 'room-open');
  assert.equal(where.status, 'active');
});

test('bulk meeting writes still reach the staff-only guard', async () => {
  const res = await request(app).put('/api/meetings/bulk').set('Authorization', bearer(USERS.user)).send({ ids: ['m1'], data: {} });
  assert.equal(res.status, 403);
});

test('creating a meeting without a room is a 400', async () => {
  const create = mock.method(db.Meeting, 'create', async (d) => d);
  const res = await request(app).post('/api/meetings').set('Authorization', bearer(USERS.user))
    .send({ meeting_url: 'https://meet.google.com/xyz' });
  assert.equal(res.status, 400);
  assert.equal(create.mock.callCount(), 0);
});

test('a private room\'s owner may update its meeting without a participant row', async () => {
  meeting = meetingRecord({ chat_room_id: 'room-owned', host_id: null });
  const res = await request(app).put('/api/meetings/m1').set('Authorization', bearer({ id: ROOM_OWNER_ID }))
    .send({ status: 'ended' });
  assert.equal(res.status, 200);
  assert.equal(meeting.status, 'ended');
});

test('a room moderator may delete a meeting', async () => {
  const destroy = mock.fn(async () => {});
  meeting.destroy = destroy;
  const res = await request(app).delete('/api/meetings/m1').set('Authorization', bearer(MODERATOR));
  assert.equal(res.status, 200);
  assert.equal(destroy.mock.callCount(), 1);
});

test('only staff may set recording_url', async () => {
  await request(app).put('/api/meetings/m1').set('Authorization', bearer(MODERATOR))
    .send({ recording_url: 'https://evil.example/rec' });
  assert.equal(meeting.recording_url, undefined);

  const bad = await request(app).put('/api/meetings/m1').set('Authorization', bearer(USERS.admin))
    .send({ recording_url: 'javascript:alert(1)' });
  assert.equal(bad.status, 400);
  const ok = await request(app).put('/api/meetings/m1').set('Authorization', bearer(USERS.admin))
    .send({ recording_url: 'https://drive.example/rec' });
  assert.equal(ok.status, 200);
  assert.equal(meeting.recording_url, 'https://drive.example/rec');
});

test('an unfiltered listing is limited to the caller\'s rooms', async () => {
  mock.method(db.ChatRoomParticipant, 'findAll', async () => [{ chat_room_id: 'room-open' }]);
  const findAll = mock.method(db.Meeting, 'findAll', async () => []);
  const res = await request(app).get('/api/meetings').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  const { where } = findAll.mock.calls[0].arguments[0];
  assert.deepEqual(where[Op.and], [{ chat_room_id: { [Op.in]: ['room-open'] } }]);
});
