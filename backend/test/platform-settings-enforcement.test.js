/**
 * Each managed platform setting is enforced where it takes effect, not just
 * stored. One block per setting group.
 */
const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const PlatformSettings = require('../src/services/PlatformSettingsService');
const SubscriptionService = require('../src/services/SubscriptionService');
const { resetLoginFailures } = require('../src/middleware/accessPolicy');

let settings;
let audits;

beforeEach(() => {
  PlatformSettings.__reset();
  resetLoginFailures();
  stubUserLookup();
  settings = fakeTable().install(mock, db.PlatformSetting);
  audits = fakeTable().install(mock, db.AuditLog);
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
});
afterEach(() => mock.restoreAll());

const set = (values) => { for (const [key, value] of Object.entries(values)) settings.add({ key, value: String(value) }); };
const call = (u, method, path, body) => {
  const r = request(app)[method](path);
  if (u) r.set('Authorization', bearer(u));
  return body === undefined ? r : r.send(body);
};

describe('maintenance mode', () => {
  beforeEach(() => {
    mock.method(db.Notification, 'findAll', async () => []);
    mock.method(db.Notification, 'findAndCountAll', async () => ({ rows: [], count: 0 }));
  });

  test('off by default: members are served', async () => {
    const res = await call(USERS.user, 'get', '/api/notifications');
    assert.notEqual(res.status, 503);
  });

  test('on: members and anonymous callers get 503 with the configured message', async () => {
    set({ maintenance_mode: true, maintenance_message: 'Back at 6 pm' });
    const member = await call(USERS.user, 'get', '/api/notifications');
    assert.equal(member.status, 503);
    assert.equal(member.body.code, 'MAINTENANCE');
    assert.equal(member.body.error, 'Back at 6 pm');
    assert.equal((await call(null, 'get', '/api/stocks/search?q=TCS')).status, 503);
  });

  test('on: admin bypass, and sign-in / public config / payment webhook stay open', async () => {
    set({ maintenance_mode: true });
    assert.notEqual((await call(USERS.admin, 'get', '/api/notifications')).status, 503);
    assert.notEqual((await call(USERS.superAdmin, 'get', '/api/notifications')).status, 503);
    const cfg = await call(null, 'get', '/api/platform/settings/public-config');
    assert.equal(cfg.status, 200);
    assert.equal(cfg.body.maintenance_mode, true);
    assert.notEqual((await call(null, 'post', '/api/auth/login', { email: 'a@b.co' })).status, 503);
    assert.notEqual((await call(null, 'post', '/api/payments/webhook', {})).status, 503);
  });

  test('on: sign-up is closed during maintenance (any spelling of the path)', async () => {
    set({ maintenance_mode: true });
    assert.equal((await call(null, 'post', '/api/auth/register', { email: 'x@y.co' })).status, 503);
    assert.equal((await call(null, 'post', '/api/auth/Register', { email: 'x@y.co' })).status, 503);
  });
});

describe('registration open / closed', () => {
  test('closed: email sign-up is refused before any account is created', async () => {
    set({ registration_enabled: false });
    const create = mock.method(db.User, 'create', async () => { throw new Error('must not be called'); });
    const res = await call(null, 'post', '/api/auth/register', { email: 'new@example.test', password: 'Secret123!', name: 'New' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'REGISTRATION_CLOSED');
    assert.equal(create.mock.callCount(), 0);
  });

  test('open (default): the request reaches registration', async () => {
    mock.method(db.User, 'findOne', async () => ({ id: 'someone' }));
    const res = await call(null, 'post', '/api/auth/register', { email: 'taken@example.test', password: 'Secret123!', name: 'X' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'User already exists');
  });

  test('closed: Google sign-in cannot create a new account', async () => {
    set({ registration_enabled: false });
    mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
      getPayload: () => ({ email: 'fresh@gmail.com', email_verified: true, name: 'Fresh', sub: 'g-1' }),
    }));
    mock.method(db.User, 'findOne', async () => null);
    const create = mock.method(db.User, 'create', async () => { throw new Error('must not be called'); });
    const res = await call(null, 'post', '/api/auth/google', { token: 'id-token' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'REGISTRATION_CLOSED');
    assert.equal(create.mock.callCount(), 0);
  });
});

describe('failed sign-in lockout', () => {
  const login = (email = 'victim@example.test') => call(null, 'post', '/api/auth/login', { email, password: 'wrong' });

  test('locks the account after N failures, per account, with 429', async () => {
    set({ login_max_failed_attempts: 3, login_lockout_minutes: 10 });
    mock.method(db.User, 'findOne', async () => null);
    for (let i = 0; i < 3; i += 1) assert.equal((await login()).status, 400);
    const locked = await login();
    assert.equal(locked.status, 429);
    assert.equal(locked.body.code, 'LOGIN_LOCKED');
    assert.ok(Number(locked.headers['retry-after']) > 0);
    assert.equal((await login('other@example.test')).status, 400, 'other accounts unaffected');
  });

  test('a non-string email is refused, so an array cannot skip the counter', async () => {
    set({ login_max_failed_attempts: 3 });
    const findOne = mock.method(db.User, 'findOne', async () => null);
    const res = await call(null, 'post', '/api/auth/login', { email: ['victim@example.test'], password: 'x' });
    assert.equal(res.status, 400);
    assert.equal(findOne.mock.callCount(), 0);
  });

  test('accent and case variants of an address share one counter', async () => {
    set({ login_max_failed_attempts: 3 });
    mock.method(db.User, 'findOne', async () => null);
    await login('victim@example.test');
    await login('VICTIM@example.test');
    await login('victím@example.test');
    assert.equal((await login('victim@example.test')).status, 429);
  });

  test('off (0, the default): no lockout', async () => {
    mock.method(db.User, 'findOne', async () => null);
    // Kept to 3 attempts: the per-IP auth limiter (20 failures / 15 min)
    // is shared by every sign-in request in this file.
    for (let i = 0; i < 3; i += 1) assert.equal((await login()).status, 400);
  });
});

describe('referral programme', () => {
  let referrals;
  beforeEach(() => {
    referrals = fakeTable().install(mock, db.Referral);
    mock.method(db.User, 'update', async () => [1]);
  });

  test('paused: no codes, no new referrals', async () => {
    set({ referral_system_enabled: false });
    const gen = await call(USERS.user, 'post', '/api/referrals/generate-code');
    assert.equal(gen.status, 403);
    assert.equal(gen.body.code, 'REFERRALS_DISABLED');
    assert.equal((await call(USERS.user, 'post', '/api/referrals/apply', { code: 'REFX' })).status, 403);
    assert.equal(referrals.rows.length, 0);
  });

  test('paused: the generic create is closed too', async () => {
    set({ referral_system_enabled: false });
    assert.equal((await call(USERS.user, 'post', '/api/referrals', { code: 'X' })).status, 403);
    assert.equal(referrals.rows.length, 0);
  });

  test('enabled: applying a code records the configured inviter reward', async () => {
    set({ referral_inviter_bonus: 250 });
    mock.method(db.User, 'findOne', async () => ({ id: USERS.admin.id }));
    const res = await call(USERS.user, 'post', '/api/referrals/apply', { code: 'REFADMIN' });
    assert.equal(res.status, 201);
    assert.equal(referrals.rows[0].reward_amount, 250);
    assert.equal(referrals.rows[0].status, 'pending');
  });

  test('members cannot mark their own referral completed or set its reward', async () => {
    const res = await call(USERS.user, 'post', '/api/referrals', { code: 'X', status: 'completed', reward_amount: 99999, reward_paid: true });
    assert.equal(res.status, 201);
    const row = referrals.rows[0];
    assert.equal(row.referrer_id, USERS.user.id);
    assert.equal(row.status, undefined);
    assert.equal(row.reward_amount, undefined);
    assert.equal(row.reward_paid, undefined);
  });

  test('badges are defined by admins only', async () => {
    fakeTable().install(mock, db.ReferralBadge);
    assert.equal((await call(USERS.user, 'post', '/api/referrals/badges', { name: 'Hacker' })).status, 403);
    assert.equal((await call(USERS.admin, 'post', '/api/referrals/badges', { name: 'Builder' })).status, 201);
  });
});

describe('notification defaults', () => {
  test('a member\'s first notification settings come from the platform defaults', async () => {
    set({ notification_default_email: false, notification_default_push: false, notification_default_sms: true });
    const prefs = fakeTable().install(mock, db.NotificationSetting);
    const res = await call(USERS.user, 'get', '/api/notifications/settings/my-settings');
    assert.equal(res.status, 200);
    assert.equal(prefs.rows[0].email_enabled, false);
    assert.equal(prefs.rows[0].push_enabled, false);
    assert.equal(prefs.rows[0].sms_enabled, true);
  });

  test('renewal reminder emails can be switched off', async () => {
    set({ notification_reminder_emails_enabled: false });
    const CronService = require('../src/services/CronService');
    const EmailService = require('../src/services/EmailService');
    CronService.dailyJob.stop();
    mock.method(db.Subscription, 'findAll', async () => [{ User: { email: 'a@b.co', name: 'A' }, SubscriptionPlan: { price_monthly: 99 }, billing_cycle: 'monthly' }]);
    const send = mock.method(EmailService, 'sendEmail', async () => null);
    await CronService.checkExpiringSubscriptions();
    assert.equal(send.mock.callCount(), 0);
  });
});

describe('subscription refunds switch', () => {
  beforeEach(() => {
    mock.method(SubscriptionService, 'checkSubscriptionStatus', async () => ({ id: 'sub-1', user_id: USERS.user.id }));
  });

  test('off: cancelling stops renewal without a refund', async () => {
    set({ subscription_refund_enabled: false });
    const refund = mock.method(SubscriptionService, 'initiateRefund', async () => { throw new Error('must not refund'); });
    const stop = mock.method(SubscriptionService, 'disableAutopay', async () => ({ id: 'sub-1', auto_renew: false }));
    const res = await call(USERS.user, 'post', '/api/subscriptions/cancel', {});
    assert.equal(res.status, 200);
    assert.equal(res.body.refunded, false);
    assert.equal(refund.mock.callCount(), 0);
    assert.equal(stop.mock.callCount(), 1);
    assert.equal(stop.mock.calls[0].arguments[0], USERS.user.id);
  });

  test('on (default): the refund path runs', async () => {
    const refund = mock.method(SubscriptionService, 'initiateRefund', async () => ({ refundId: 'r1' }));
    const res = await call(USERS.user, 'post', '/api/subscriptions/cancel', {});
    assert.equal(res.status, 200);
    assert.equal(refund.mock.callCount(), 1);
  });
});

describe('alert retention', () => {
  test('deletes only alerts resolved/dismissed longer ago than the configured days; 0 keeps all', async () => {
    const CronService = require('../src/services/CronService');
    CronService.dailyJob.stop();
    const destroy = mock.method(db.AlertLog, 'destroy', async () => 3);
    assert.equal(await CronService.pruneResolvedAlerts(), 0);
    assert.equal(destroy.mock.callCount(), 0);

    PlatformSettings.invalidate();
    set({ alert_retention_days: 30 });
    const now = new Date('2026-11-09T00:00:00Z');
    assert.equal(await CronService.pruneResolvedAlerts(now), 3);
    const { where } = destroy.mock.calls[0].arguments[0];
    const { Op } = db.Sequelize;
    assert.deepEqual(where.status[Op.in], ['resolved', 'dismissed']);
    assert.equal(where.created_at, undefined, 'age is measured from resolution, not creation');
    const [byResolved, byUpdated] = where[Op.or];
    assert.equal(byResolved.resolved_at[Op.lt].toISOString(), '2026-10-10T00:00:00.000Z');
    assert.equal(byUpdated.resolved_at, null);
    assert.equal(byUpdated.updated_at[Op.lt].toISOString(), '2026-10-10T00:00:00.000Z');
  });
});

describe('static pages editor', () => {
  let pages;
  beforeEach(() => { pages = fakeTable().install(mock, db.StaticPage); });
  const content = 'This privacy policy explains what Protocall collects and why it does so.';

  test('admin only; known slugs only; validated; audited', async () => {
    assert.equal((await call(USERS.user, 'put', '/api/static-pages/managed/privacy', { title: 'x', content, status: 'published' })).status, 403);
    assert.equal((await call(USERS.admin, 'put', '/api/static-pages/managed/anything', { title: 'x', content, status: 'published' })).status, 404);
    const bad = await call(USERS.admin, 'put', '/api/static-pages/managed/privacy', { title: '', content: 'short', status: 'live' });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.fields.title && bad.body.fields.status);
    const ok = await call(USERS.admin, 'put', '/api/static-pages/managed/privacy', { title: 'Privacy Policy', content, status: 'published' });
    assert.equal(ok.status, 200);
    assert.equal(pages.rows[0].slug, 'privacy');
    assert.equal(pages.rows[0].status, 'published');
    assert.equal(audits.rows[0].action, 'static_page_updated');
    const list = await call(USERS.admin, 'get', '/api/static-pages/managed');
    assert.equal(list.body.find((p) => p.slug === 'privacy').content, content);
    assert.equal(list.body.find((p) => p.slug === 'terms').status, 'draft');
  });

  test('drafts are not readable through the generic list/get', async () => {
    pages.add({ slug: 'privacy', title: 'Draft', content: 'secret draft text', status: 'draft' });
    assert.equal((await call(null, 'get', '/api/static-pages')).status, 401);
    assert.equal((await call(USERS.user, 'get', '/api/static-pages')).status, 403);
    assert.equal((await call(null, 'get', '/api/static-pages/slug/privacy')).status, 404, 'public read is published-only');
  });
});

describe('entity configuration writes', () => {
  test('members can no longer upsert entity configuration', async () => {
    mock.method(db.EntityConfig, 'upsert', async () => { throw new Error('must not be called'); });
    assert.equal((await call(USERS.user, 'put', '/api/entity-configs/type/Advisor', { config: {} })).status, 403);
  });
});
