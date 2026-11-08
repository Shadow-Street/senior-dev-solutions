const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { Op } = require('sequelize');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

// GET /api/activity/recent feeds the dashboard. It is readable by any signed-in
// user, so it must carry aggregates only.

const now = Date.now();
const ago = (ms) => new Date(now - ms);
const MIN = 60 * 1000;

let calls;
beforeEach(() => {
  calls = {};
  stubUserLookup();
  mock.method(db.Poll, 'findAll', async (opts) => {
    (calls.polls ||= []).push(opts);
    // First call: newest active polls. Second: closed polls.
    if (calls.polls.length === 1) {
      return [{ id: 'p1', title: 'Is JPL a buy?', stock_symbol: 'JPL', created_at: ago(5 * MIN) }];
    }
    return [{ id: 'p2', title: 'HDFC?', stock_symbol: 'HDFC', options: ['Buy', 'Sell'], expires_at: ago(60 * MIN), updated_at: ago(60 * MIN), created_at: ago(3000 * MIN) }];
  });
  mock.method(db.PollVote, 'findAll', async (opts) => (opts.group.includes('option_index')
    ? [{ poll_id: 'p2', option_index: 0, count: '3' }, { poll_id: 'p2', option_index: 1, count: '1' }]
    : [{ poll_id: 'p2', voters: '4' }]));
  mock.method(db.User, 'count', async (opts) => { calls.userCount = opts; return 5; });
  mock.method(db.ChatRoom, 'findAll', async (opts) => { calls.rooms = opts; return [{ id: 'r1', name: 'TCS Talk' }, { id: 'r2', name: 'Banking' }]; });
  mock.method(db.Message, 'findAll', async (opts) => {
    calls.messages = opts;
    return [
      { chat_room_id: 'r1', count: '12', latest: ago(2 * MIN) },
      { chat_room_id: 'r2', count: '3', latest: ago(30 * MIN) },
    ];
  });
});
afterEach(() => mock.restoreAll());

test('requires authentication', async () => {
  assert.equal((await request(app).get('/api/activity/recent')).status, 401);
});

test('returns real aggregate items, newest first', async () => {
  const res = await request(app).get('/api/activity/recent').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  const byId = Object.fromEntries(res.body.items.map((i) => [i.id, i]));

  assert.equal(byId['poll-p1'].title, 'New poll for JPL');
  assert.equal(byId['poll-result-p2'].description, '75% voted Buy (4 votes)');
  assert.equal(byId['members-24h'].title, '5 new members joined');
  assert.equal(byId['chat-24h'].title, '15 messages across 2 rooms');
  assert.equal(byId['chat-24h'].description, 'Busiest: TCS Talk');

  const times = res.body.items.map((i) => new Date(i.occurred_at).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
});

test('only free polls are listed (premium polls are filtered in the query)', async () => {
  await request(app).get('/api/activity/recent').set('Authorization', bearer(USERS.user));
  for (const opts of calls.polls) {
    const [freePoll] = opts.where[Op.and];
    assert.deepEqual(freePoll[Op.or], [{ is_premium: false }, { is_premium: null }]);
  }
});

test('polls tied to a chat room and deactivated polls are never listed', async () => {
  await request(app).get('/api/activity/recent').set('Authorization', bearer(USERS.user));
  assert.equal(calls.polls.length, 2);
  for (const opts of calls.polls) {
    const clauses = opts.where[Op.and];
    assert.ok(clauses.some((c) => c.chat_room_id === null), 'chat_room_id must be null');
  }
  const [newest, closed] = calls.polls.map((o) => o.where[Op.and]);
  assert.ok(newest.some((c) => c.is_active === true));
  assert.ok(closed.some((c) => c[Op.or] && JSON.stringify(c[Op.or]).includes('is_active')), 'closed polls must not be deactivated ones');
});

test('message counts cover open rooms only and never read message text', async () => {
  await request(app).get('/api/activity/recent').set('Authorization', bearer(USERS.user));
  const conditions = calls.rooms.where[Op.and];
  assert.deepEqual(conditions[0][Op.or], [{ is_public: { [Op.ne]: false } }, { is_public: null }]);
  assert.deepEqual(conditions[1][Op.or], [{ is_premium: { [Op.ne]: true } }, { is_premium: null }]);
  assert.deepEqual(conditions[2][Op.or][1].room_type[Op.notIn], ['admin', 'premium', 'premium_admin']);
  assert.deepEqual(conditions[3][Op.or], [{ required_plan: null }, { required_plan: '' }], 'plan-gated rooms are excluded');
  assert.deepEqual(calls.messages.where.chat_room_id[Op.in], ['r1', 'r2']);
  const columns = calls.messages.attributes.map((a) => (Array.isArray(a) ? a[1] : a));
  assert.ok(!columns.includes('content'));
});

test('the payload carries no e-mail addresses, user ids or creator details', async () => {
  const res = await request(app).get('/api/activity/recent').set('Authorization', bearer(USERS.user));
  const text = JSON.stringify(res.body);
  assert.ok(!/@/.test(text), 'no e-mail-like strings');
  for (const key of ['email', 'user_id', 'created_by', 'owner_id', 'content']) {
    assert.ok(!text.includes(`"${key}"`), key);
  }
  assert.deepEqual(Object.keys(res.body.items[0]).sort(), ['description', 'id', 'link', 'occurred_at', 'title', 'type']);
});

test('quiet community: empty items, not an error', async () => {
  mock.restoreAll();
  stubUserLookup();
  mock.method(db.Poll, 'findAll', async () => []);
  mock.method(db.PollVote, 'findAll', async () => []);
  mock.method(db.User, 'count', async () => 0);
  mock.method(db.ChatRoom, 'findAll', async () => []);
  const res = await request(app).get('/api/activity/recent').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.items, []);
});

test('a database failure is a generic 500', async () => {
  mock.restoreAll();
  stubUserLookup();
  mock.method(db.Poll, 'findAll', async () => { throw new Error('boom: secret sql detail'); });
  const res = await request(app).get('/api/activity/recent').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, { error: 'Internal server error' });
});
