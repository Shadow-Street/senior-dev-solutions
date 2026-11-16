/**
 * GET /api/platform/community-stats: the dashboard "Traders Joined" card.
 * It used to count GET /users, which a member may only read for themself, so
 * every member saw 1. Now: active members, raised to the admin floor (670 by
 * default, as the client asked), aggregates only.
 */
const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db } = require('./helpers');
const PlatformSettings = require('../src/services/PlatformSettingsService');
const platformRoutes = require('../src/routes/platform.routes');

let counts;
let floor;
beforeEach(() => {
  platformRoutes.resetCommunityCache();
  counts = { total: 3, week: 1 };
  floor = 670;
  mock.method(db.User, 'count', async ({ where }) => (where.created_at ? counts.week : counts.total));
  mock.method(PlatformSettings, 'getValue', async (key) => (key === 'community_traders_display_min' ? floor : undefined));
});
afterEach(() => mock.restoreAll());

test('shows the floor while the real count is lower, and is public and aggregate-only', async () => {
  const res = await request(app).get('/api/platform/community-stats');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { traders: 670, joined_this_week: 1 });
});

test('shows the real count once it passes the floor', async () => {
  counts.total = 1200;
  const res = await request(app).get('/api/platform/community-stats');
  assert.equal(res.body.traders, 1200);
});

test('a floor of 0 shows the real count; deleted and inactive accounts are excluded', async () => {
  floor = 0;
  const res = await request(app).get('/api/platform/community-stats');
  assert.equal(res.body.traders, 3);
  const where = db.User.count.mock.calls[0].arguments[0].where;
  assert.equal(where.status, 'active');
  assert.ok(JSON.stringify(Object.getOwnPropertySymbols(where.email).map((s) => where.email[s])).includes('deleted.protocall.invalid'));
});

test('the setting is an integer between 0 and 10,000,000, default 670, not public', () => {
  const def = PlatformSettings.definitionFor('community_traders_display_min');
  assert.equal(def.default, 670);
  assert.equal(def.public, false);
  assert.ok(PlatformSettings.validateValue(def, -1).error);
  assert.ok(PlatformSettings.validateValue(def, 1.5).error);
  assert.deepEqual(PlatformSettings.validateValue(def, '670'), { value: 670 });
});
