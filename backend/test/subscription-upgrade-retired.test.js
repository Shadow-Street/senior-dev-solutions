const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, USERS, bearer, stubUserLookup } = require('./helpers');
const SubscriptionService = require('../src/services/SubscriptionService');

// Regression: POST /subscriptions/upgrade called upgradeWithProration →
// activateSubscription with no payment check, so any signed-in user could
// POST a VIP plan id (public via /subscriptions/plans) and receive VIP.
afterEach(() => mock.restoreAll());

test('POST /subscriptions/upgrade no longer activates a plan', async () => {
  stubUserLookup();
  const upgrade = mock.method(SubscriptionService, 'upgradeWithProration', async () => ({ ok: true }));
  const activate = mock.method(SubscriptionService, 'activateSubscription', async () => ({ ok: true }));

  const res = await request(app)
    .post('/api/subscriptions/upgrade')
    .set('Authorization', bearer(USERS.user))
    .send({ planId: 'vip-plan-id' });

  assert.equal(res.status, 410);
  assert.equal(upgrade.mock.callCount(), 0);
  assert.equal(activate.mock.callCount(), 0);
});
