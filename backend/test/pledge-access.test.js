const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

// SEC-31: pledge reads needed no login, and session/execution writes took
// req.body from any signed-in user.

const ADVISOR = { id: '44444444-4444-4444-8444-444444444444', email: 'adv@example.test', app_role: 'advisor', role: 'user', status: 'active' };
const OTHER_ID = '55555555-5555-4555-8555-555555555555';

beforeEach(() => stubUserLookup({ [ADVISOR.id]: ADVISOR }));
afterEach(() => mock.restoreAll());

for (const path of ['/api/pledges/pledges', '/api/pledges/sessions', '/api/pledges/executions', '/api/pledges/access-requests']) {
  test(`GET ${path} without a token is 401`, async () => {
    const res = await request(app).get(path);
    assert.equal(res.status, 401);
  });
}

test('a user cannot read another user\'s executions, and limit is capped', async () => {
  const findAll = mock.method(db.PledgeExecutionRecord, 'findAll', async () => []);
  const res = await request(app)
    .get(`/api/pledges/executions?user_id=${OTHER_ID}&limit=100000&offset=-5`)
    .set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  const [opts] = findAll.mock.calls[0].arguments;
  assert.equal(opts.where.user_id, USERS.user.id);
  assert.equal(opts.limit, 200);
  assert.equal(opts.offset, 0);
});

test('an advisor sees only their own executions until sessions are advisor-owned (BE-8)', async () => {
  const findAll = mock.method(db.PledgeExecutionRecord, 'findAll', async () => []);
  await request(app).get(`/api/pledges/executions?user_id=${OTHER_ID}`).set('Authorization', bearer(ADVISOR));
  assert.equal(findAll.mock.calls[0].arguments[0].where.user_id, ADVISOR.id);
});

test('staff may filter executions by any user', async () => {
  const findAll = mock.method(db.PledgeExecutionRecord, 'findAll', async () => []);
  const res = await request(app).get(`/api/pledges/executions?user_id=${OTHER_ID}`).set('Authorization', bearer(USERS.admin));
  assert.equal(res.status, 200);
  assert.equal(findAll.mock.calls[0].arguments[0].where.user_id, OTHER_ID);
});

test('pledge listing is confined to the caller', async () => {
  const findAll = mock.method(db.Pledge, 'findAll', async () => []);
  await request(app).get(`/api/pledges/pledges?user_id=${OTHER_ID}`).set('Authorization', bearer(USERS.user));
  assert.equal(findAll.mock.calls[0].arguments[0].where.user_id, USERS.user.id);
});

test('access-request listing is confined to the caller', async () => {
  const findAll = mock.method(db.PledgeAccessRequest, 'findAll', async () => []);
  await request(app).get(`/api/pledges/access-requests?user_id=${OTHER_ID}`).set('Authorization', bearer(USERS.user));
  assert.equal(findAll.mock.calls[0].arguments[0].where.user_id, USERS.user.id);
});

test('object-shaped query filters never reach the WHERE clause', async () => {
  const findAll = mock.method(db.PledgeSession, 'findAll', async () => []);
  const res = await request(app)
    .get('/api/pledges/sessions?status[$in][]=active&execution_rule=manual')
    .set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  assert.deepEqual(findAll.mock.calls[0].arguments[0].where, { execution_rule: 'manual' });
});

for (const [who, user] of [['user', USERS.user], ['advisor', ADVISOR]]) {
  test(`a ${who} cannot update a pledge session`, async () => {
    const update = mock.method(db.PledgeSession, 'update', async () => [1]);
    const res = await request(app)
      .put('/api/pledges/sessions/s1')
      .set('Authorization', bearer(user))
      .send({ status: 'completed' });
    assert.equal(res.status, 403);
    assert.equal(update.mock.callCount(), 0);
  });
}

test('staff session updates are whitelisted', async () => {
  mock.method(db.PledgeSession, 'findByPk', async () => ({ id: 's1' }));
  const update = mock.method(db.PledgeSession, 'update', async () => [1]);
  const res = await request(app)
    .put('/api/pledges/sessions/s1')
    .set('Authorization', bearer(USERS.admin))
    .send({ status: 'completed', id: 'other', user_id: OTHER_ID, created_at: '2000-01-01' });
  assert.equal(res.status, 200);
  assert.deepEqual(update.mock.calls[0].arguments[0], { status: 'completed' });
});

test('a normal user cannot create a session; an advisor\'s starts pending', async () => {
  const create = mock.method(db.PledgeSession, 'create', async (d) => d);
  const denied = await request(app).post('/api/pledges/sessions').set('Authorization', bearer(USERS.user)).send({ stock_symbol: 'X' });
  assert.equal(denied.status, 403);
  assert.equal(create.mock.callCount(), 0);

  const ok = await request(app)
    .post('/api/pledges/sessions')
    .set('Authorization', bearer(ADVISOR))
    .send({ stock_symbol: 'X', status: 'active', last_executed_at: '2026-01-01' });
  assert.equal(ok.status, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], { stock_symbol: 'X' });
});

for (const [who, user] of [['user', USERS.user], ['advisor', ADVISOR]]) {
  test(`a ${who} cannot create an execution record`, async () => {
    const create = mock.method(db.PledgeExecutionRecord, 'create', async (d) => d);
    const res = await request(app)
      .post('/api/pledges/executions')
      .set('Authorization', bearer(user))
      .send({ pledge_id: 'p1', executed_price: 1, platform_commission: 0 });
    assert.equal(res.status, 403);
    assert.equal(create.mock.callCount(), 0);
  });
}

test('staff execution records are whitelisted', async () => {
  const create = mock.method(db.PledgeExecutionRecord, 'create', async (d) => d);
  const res = await request(app)
    .post('/api/pledges/executions')
    .set('Authorization', bearer(USERS.admin))
    .send({ id: 'forced', pledge_id: 'p1', executed_qty: 3, created_at: '2000-01-01' });
  assert.equal(res.status, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], { pledge_id: 'p1', executed_qty: 3 });
});

test('a user cannot update another user\'s pledge', async () => {
  mock.method(db.Pledge, 'findByPk', async () => ({ id: 'p1', user_id: OTHER_ID }));
  const update = mock.method(db.Pledge, 'update', async () => [1]);
  const res = await request(app).put('/api/pledges/pledges/p1').set('Authorization', bearer(USERS.user)).send({ qty: 1 });
  assert.equal(res.status, 404);
  assert.equal(update.mock.callCount(), 0);
});

test('an owner may edit and cancel a pledge but not set other statuses or owner', async () => {
  mock.method(db.Pledge, 'findByPk', async () => ({ id: 'p1', user_id: USERS.user.id }));
  const update = mock.method(db.Pledge, 'update', async () => [1]);

  await request(app).put('/api/pledges/pledges/p1').set('Authorization', bearer(USERS.user))
    .send({ qty: 5, status: 'executed', user_id: OTHER_ID, session_id: 's2' });
  assert.deepEqual(update.mock.calls[0].arguments[0], { qty: 5 });

  await request(app).put('/api/pledges/pledges/p1').set('Authorization', bearer(USERS.user)).send({ status: 'cancelled' });
  assert.deepEqual(update.mock.calls[1].arguments[0], { status: 'cancelled' });
});

test('pledge creation ignores client status and user_id', async () => {
  const create = mock.method(db.Pledge, 'create', async (d) => d);
  const res = await request(app).post('/api/pledges/pledges').set('Authorization', bearer(USERS.user))
    .send({ session_id: 's1', stock_symbol: 'X', side: 'buy', qty: 1, status: 'paid', user_id: OTHER_ID });
  assert.equal(res.status, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], { session_id: 's1', stock_symbol: 'X', side: 'buy', qty: 1, user_id: USERS.user.id });
});

for (const status of ['paid', 'executed']) {
  test(`an owner cannot edit or cancel a ${status} pledge`, async () => {
    mock.method(db.Pledge, 'findByPk', async () => ({ id: 'p1', user_id: USERS.user.id, status }));
    const update = mock.method(db.Pledge, 'update', async () => [1]);
    const edit = await request(app).put('/api/pledges/pledges/p1').set('Authorization', bearer(USERS.user)).send({ qty: 1000 });
    const cancel = await request(app).put('/api/pledges/pledges/p1').set('Authorization', bearer(USERS.user)).send({ status: 'cancelled' });
    assert.deepEqual([edit.status, cancel.status], [409, 409]);
    assert.equal(update.mock.callCount(), 0);
  });
}

test('access-request creation ignores client status and user_id', async () => {
  const create = mock.method(db.PledgeAccessRequest, 'create', async (d) => d);
  const res = await request(app).post('/api/pledges/access-requests').set('Authorization', bearer(USERS.user))
    .send({ reason: 'please', status: 'approved', user_id: OTHER_ID });
  assert.equal(res.status, 201);
  assert.deepEqual(create.mock.calls[0].arguments[0], { reason: 'please', user_id: USERS.user.id });
});
