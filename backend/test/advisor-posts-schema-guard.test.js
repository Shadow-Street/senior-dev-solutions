const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, bearer } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const schemaGuard = require('../src/utils/schemaGuard');

// Release-order safety: if the API starts before migration 014, posts must
// degrade to read-only instead of 500ing on unknown columns. Runs in its own
// file (process) because the guard prunes the shared AdvisorPost model.

const ADVISOR_USER = { id: '44444444-4444-4444-8444-444444444444', email: 'a@example.test', app_role: 'advisor', role: 'advisor', status: 'active' };
const ADVISOR = { id: 'aa000000-0000-4000-8000-0000000000aa', user_id: ADVISOR_USER.id, status: 'approved', display_name: 'A' };
const as = () => ({ Authorization: bearer(ADVISOR_USER) });
const OLD_COLUMNS = ['id', 'advisor_id', 'content', 'media_urls', 'status', 'likes_count', 'comments_count', 'is_pinned', 'created_at', 'updated_at'];
let describeCalls;

beforeEach(() => {
  describeCalls = 0;
  schemaGuard._reset();
  fakeTable([{ ...ADVISOR_USER }]).install(mock, db.User);
  fakeTable([{ ...ADVISOR }]).install(mock, db.Advisor);
  fakeTable([{ advisor_id: ADVISOR.id, content: 'old post', status: 'published' }]).install(mock, db.AdvisorPost);
  fakeTable().install(mock, db.SubscriptionPlan);
  fakeTable().install(mock, db.Subscription);
  mock.method(db.sequelize.getQueryInterface(), 'describeTable', async () => {
    describeCalls += 1;
    return Object.fromEntries(OLD_COLUMNS.map((c) => [c, {}]));
  });
});
afterEach(() => mock.restoreAll());

describe('posts before migration 014', () => {
  // First on purpose: the other tests prune the shared model.
  test('a failed inspection does not degrade and is not retried on every request', async () => {
    db.sequelize.getQueryInterface().describeTable.mock.mockImplementation(async () => { describeCalls += 1; throw new Error('db down'); });
    for (let i = 0; i < 3; i += 1) await request(app).get('/api/advisors/posts').set(as());
    assert.equal(describeCalls, 1);
    assert.ok('title' in db.AdvisorPost.rawAttributes, 'model untouched when the check itself failed');
  });

  test('reads still work, the missing columns are dropped from the model, and the check runs once', async () => {
    const first = await request(app).get('/api/advisors/posts').set(as());
    assert.equal(first.status, 200);
    assert.equal(first.body.length, 1);
    for (const column of schemaGuard.POST_COLUMNS_014) assert.equal(column in db.AdvisorPost.rawAttributes, false, column);
    assert.ok('content' in db.AdvisorPost.rawAttributes);
    await request(app).get('/api/advisors/posts').set(as());
    assert.equal(describeCalls, 1, 'cached');
  });

  test('creating or editing a post is refused with 503, not silently saved without its fields', async () => {
    const create = await request(app).post('/api/advisors/posts').set(as()).send({ title: 'Hello', content: 'x' });
    assert.equal(create.status, 503);
    assert.match(create.body.error, /read-only/);
    const edit = await request(app).put('/api/advisors/posts/anything').set(as()).send({ title: 'x' });
    assert.equal(edit.status, 503);
    assert.equal(db.AdvisorPost.findAll.mock.calls.length, 0);
  });

  test('authorisation still comes first: an ordinary user gets 403, not 503', async () => {
    const plain = { id: '11111111-1111-4111-8111-111111111111', email: 'u@example.test', app_role: 'user', role: 'user', status: 'active' };
    db.User.findByPk.mock.mockImplementation(async (id) => (id === plain.id ? { ...plain } : id === ADVISOR_USER.id ? { ...ADVISOR_USER } : null));
    const res = await request(app).post('/api/advisors/posts').set({ Authorization: bearer(plain) }).send({ title: 'Hello', content: 'x' });
    assert.equal(res.status, 403);
  });

});
