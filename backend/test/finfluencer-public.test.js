const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db } = require('./helpers');

// The public Home page lists finfluencers to signed-out visitors, so the
// listing must be approved-only, field-whitelisted and bounded.
let calls;
beforeEach(() => {
  calls = [];
  mock.method(db.FinInfluencer, 'findAll', async (opts) => {
    calls.push(opts);
    return [{ id: 'f1', name: 'Creator', follower_count: 10 }];
  });
});
afterEach(() => mock.restoreAll());

describe('GET /api/finfluencers/top and /featured', () => {
  test('top: anonymous, approved only, whitelisted fields, sorted by followers', async () => {
    const res = await request(app).get('/api/finfluencers/top?limit=8');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    const opts = calls[0];
    assert.deepEqual(opts.where, { status: 'approved' });
    assert.equal(opts.limit, 8);
    assert.deepEqual(opts.order, [['follower_count', 'DESC']]);
    for (const hidden of ['user_id', 'status', 'social_links']) {
      assert.ok(!opts.attributes.includes(hidden), `${hidden} must not be public`);
    }
    for (const shown of ['id', 'name', 'avatar_url', 'bio', 'follower_count', 'specialization']) {
      assert.ok(opts.attributes.includes(shown), `${shown} is needed by the Home page`);
    }
  });

  test('top: limit is clamped to 1..50 and junk falls back to 20', async () => {
    await request(app).get('/api/finfluencers/top?limit=100000');
    await request(app).get('/api/finfluencers/top?limit=0');
    await request(app).get('/api/finfluencers/top?limit=abc');
    await request(app).get('/api/finfluencers/top?limit=-5');
    assert.deepEqual(calls.map((c) => c.limit), [50, 20, 20, 1]);
  });

  test('featured: same whitelist, approved and featured only', async () => {
    const res = await request(app).get('/api/finfluencers/featured');
    assert.equal(res.status, 200);
    assert.deepEqual(calls[0].where, { is_featured: true, status: 'approved' });
    assert.ok(!calls[0].attributes.includes('user_id'));
  });
});
