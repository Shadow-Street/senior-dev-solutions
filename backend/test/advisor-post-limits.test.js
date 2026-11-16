const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, bearer } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const schemaGuard = require('../src/utils/schemaGuard');
const limits = require('../src/services/AdvisorPostLimitService');

// Client bug deck slides 16-18: locked posts leak no title, ?preview=member, and the
// advisor recommendation-limit tracker (weekly/monthly caps, IST windows, ledger).

const U = {
  advA: { id: '41000000-0000-4000-8000-000000000041', email: 'a@example.test', name: 'Adv A', role: 'advisor', app_role: 'advisor', status: 'active' },
  advB: { id: '42000000-0000-4000-8000-000000000042', email: 'b@example.test', name: 'Adv B', role: 'advisor', app_role: 'advisor', status: 'active' },
  admin: { id: '43000000-0000-4000-8000-000000000043', email: 'admin@example.test', name: 'Admin', role: 'admin', app_role: 'admin', status: 'active' },
  sub: { id: '44000000-0000-4000-8000-000000000044', email: 's@example.test', name: 'Sub', role: 'user', app_role: 'user', status: 'active' },
  plain: { id: '45000000-0000-4000-8000-000000000045', email: 'p@example.test', name: 'Plain', role: 'user', app_role: 'user', status: 'active' },
};
const ADV_A = { id: 'aa000000-0000-4000-8000-0000000000aa', user_id: U.advA.id, status: 'approved', display_name: 'Advisor A' };
const ADV_B = { id: 'bb000000-0000-4000-8000-0000000000bb', user_id: U.advB.id, status: 'approved', display_name: 'Advisor B' };
const BASIC = 'a1000000-0000-4000-8000-0000000000a1';
const PRO = 'a2000000-0000-4000-8000-0000000000a2';
const B_PLAN = 'b1000000-0000-4000-8000-0000000000b1';
const SYSTEM = 'f1000000-0000-4000-8000-0000000000f1';

let T;
const as = (u) => ({ Authorization: bearer(u) });

function setup() {
  const users = fakeTable(Object.values(U).map((u) => ({ ...u }))).install(mock, db.User);
  users.rows.forEach((r, i) => { r.id = Object.values(U)[i].id; });
  T = {
    advisors: fakeTable([{ ...ADV_A }, { ...ADV_B }]).install(mock, db.Advisor),
    plans: fakeTable([
      { advisor_id: ADV_A.id, name: 'Basic Stock Advisory', price: 500, interval: 'month', is_active: true, features: ['x'] },
      { advisor_id: ADV_A.id, name: 'Pro', price: 1500, interval: 'month', is_active: true, features: ['x'] },
      { advisor_id: ADV_B.id, name: 'B plan', price: 700, interval: 'month', is_active: true, features: ['x'] },
      { advisor_id: null, name: 'Premium', price: 592, interval: 'month', is_active: true, is_system_plan: true },
    ]).install(mock, db.SubscriptionPlan),
    posts: fakeTable().install(mock, db.AdvisorPost),
    subs: fakeTable().install(mock, db.Subscription),
    planLimits: fakeTable().install(mock, db.AdvisorPlanLimit),
    usage: fakeTable().install(mock, db.AdvisorPostUsage),
  };
  [BASIC, PRO, B_PLAN, SYSTEM].forEach((pid, i) => { T.plans.rows[i].id = pid; });
  T.advisors.rows[0].id = ADV_A.id; T.advisors.rows[1].id = ADV_B.id;
  mock.method(db.Notification, 'bulkCreate', async (rows) => rows);
  mock.method(db.AuditLog, 'create', async (d) => d);
  mock.method(db.sequelize.getQueryInterface(), 'describeTable', async () => Object.fromEntries(schemaGuard.POST_COLUMNS_014.map((c) => [c, {}])));
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
}

beforeEach(() => { schemaGuard._reset(); limits._reset(); setup(); });
afterEach(() => mock.restoreAll());

const setLimit = (planId, count, period = 'week', effective = new Date(Date.now() - 1000)) =>
  T.planLimits.add({ plan_id: planId, advisor_id: ADV_A.id, limit_count: count, limit_period: period, effective_from: effective });
const useAllowance = (planId, n, when = new Date()) => {
  for (let i = 0; i < n; i += 1) T.usage.add({ advisor_id: ADV_A.id, plan_id: planId, post_id: `99999999-0000-4000-8000-${String(Math.random()).slice(2, 14).padEnd(12, '0')}`, published_at: when });
};
const rec = (extra = {}) => ({ title: 'Buy Apple', content: 'Because.', stock_symbol: 'AAPL', recommendation_type: 'buy', ...extra });
const publish = (body, user = U.advA) => request(app).post('/api/advisors/posts').set(as(user)).send(body);
const usageRows = (planId) => T.usage.rows.filter((r) => r.plan_id === planId);

// ---------------------------------------------------------------------------
describe('IST windows', () => {
  const iso = (d) => d.toISOString();
  test('week runs Monday 00:00 to Monday 00:00 IST', () => {
    // Sunday 15 Nov 2026 23:59 IST is still the week of Mon 9 Nov.
    const w = limits.weekWindow(new Date('2026-11-15T18:29:00Z'));
    assert.equal(iso(w.start), '2026-11-08T18:30:00.000Z');
    assert.equal(iso(w.end), '2026-11-15T18:30:00.000Z');
    // One minute later it is Monday 16 Nov 00:00 IST: a new week.
    const next = limits.weekWindow(new Date('2026-11-15T18:30:00Z'));
    assert.equal(iso(next.start), '2026-11-15T18:30:00.000Z');
    assert.equal(limits.formatReset(next.start), 'Mon 16 Nov');
    assert.equal(limits.formatReset(w.end), 'Mon 16 Nov');
  });

  test('the IST date, not the UTC date, decides the week (Sunday 20:00 UTC is Monday in India)', () => {
    const w = limits.weekWindow(new Date('2026-11-15T20:00:00Z'));
    assert.equal(iso(w.start), '2026-11-15T18:30:00.000Z');
  });

  test('month is the calendar month in IST', () => {
    const m = limits.monthWindow(new Date('2026-11-30T18:29:00Z'));
    assert.equal(iso(m.start), '2026-10-31T18:30:00.000Z');
    assert.equal(iso(m.end), '2026-11-30T18:30:00.000Z');
    const dec = limits.monthWindow(new Date('2026-11-30T18:30:00Z'));
    assert.equal(iso(dec.start), '2026-11-30T18:30:00.000Z');
    assert.equal(limits.formatReset(m.end), 'Tue 1 Dec');
  });

  test('caps: weekly W gives 4W per month; monthly M has no weekly cap; empty is unlimited', () => {
    assert.deepEqual(limits.capsFor({ limit_count: 2, limit_period: 'week' }), { week: 2, month: 8 });
    assert.deepEqual(limits.capsFor({ limit_count: 10, limit_period: 'month' }), { week: null, month: 10 });
    assert.deepEqual(limits.capsFor({ limit_count: null, limit_period: 'week' }), { week: null, month: null });
    assert.deepEqual(limits.capsFor(null), { week: null, month: null });
  });
});

// ---------------------------------------------------------------------------
describe('feed: locked posts and ?preview=member', () => {
  let pro; let open;
  beforeEach(() => {
    T.posts.add({ advisor_id: ADV_A.id, title: 'Buy Apple', content: 'SECRET BODY', status: 'published', visibility: 'subscribers', stock_symbol: 'AAPL', recommendation_type: 'buy', post_type: 'recommendation', target_price: 120, stop_loss: 115 });
    pro = T.posts.add({ advisor_id: ADV_A.id, title: 'Sell Tata', content: 'PRO BODY', status: 'published', visibility: 'subscribers', required_plan_id: PRO, post_type: 'recommendation' });
    open = T.posts.add({ advisor_id: ADV_A.id, title: 'Free note', content: 'PUBLIC BODY', status: 'published', visibility: 'public' });
  });
  const feed = (user, q = '') => request(app).get(`/api/advisors/posts/by-advisor/${ADV_A.id}${q}`).set(user ? as(user) : {});

  test('locked previews keep id/type/plan/dates but carry no title, content, symbol or targets', async () => {
    const res = await feed(U.plain);
    const locked = res.body.filter((p) => p.locked);
    assert.equal(locked.length, 2);
    for (const p of locked) {
      assert.equal(p.title, null);
      for (const k of ['content', 'stock_symbol', 'recommendation_type', 'target_price', 'stop_loss']) assert.equal(p[k], undefined, k);
      assert.ok(p.id && p.post_type && p.created_at);
    }
    const lockedPro = locked.find((p) => p.id === pro.id);
    assert.equal(lockedPro.required_plan_id, PRO);
    assert.equal(lockedPro.required_plan_name, 'Pro');
    const text = JSON.stringify(res.body);
    for (const leak of ['Buy Apple', 'Sell Tata', 'SECRET BODY', 'PRO BODY', 'AAPL']) assert.ok(!text.includes(leak), leak);
    assert.equal(res.body.find((p) => p.id === open.id).title, 'Free note');
  });

  test('the advisor and staff see everything; preview=member shows them what a non-subscriber sees', async () => {
    for (const u of [U.advA, U.admin]) {
      const full = await feed(u);
      assert.equal(full.body.filter((p) => p.locked).length, 0);
      assert.ok(full.body.some((p) => p.title === 'Buy Apple'));
      const preview = await feed(u, '?preview=member');
      assert.equal(preview.body.filter((p) => p.locked).length, 2);
      assert.ok(!JSON.stringify(preview.body).includes('Buy Apple'));
      assert.equal(preview.body.find((p) => p.id === open.id).locked, false, 'public posts stay readable');
    }
  });

  test('preview=member can only reduce access: it never unlocks anything for anyone', async () => {
    for (const u of [null, U.plain]) {
      const a = await feed(u);
      const b = await feed(u, '?preview=member');
      assert.deepEqual(b.body, a.body);
    }
    T.subs.add({ user_id: U.sub.id, advisor_id: ADV_A.id, plan_id: PRO, status: 'active', end_date: new Date(Date.now() + 86400000) });
    assert.equal((await feed(U.sub)).body.filter((p) => p.locked).length, 0);
    assert.equal((await feed(U.sub, '?preview=member')).body.filter((p) => p.locked).length, 2, 'a subscriber previewing as a member is locked out');
    // any other value is ignored (no escalation, no error)
    assert.equal((await feed(U.plain, '?preview=staff')).body.filter((p) => p.locked).length, 2);
    assert.equal((await feed(U.plain, '?preview=owner')).body.filter((p) => p.locked).length, 2);
  });
});

// ---------------------------------------------------------------------------
describe('plan limit validation and ownership', () => {
  const plan = { name: 'Plan X', price: 100, features: ['a'] };
  const create = (extra, user = U.advA) => request(app).post('/api/advisors/plans').set(as(user)).send({ ...plan, ...extra });

  for (const [label, patch] of [
    ['zero', { limit_count: 0, limit_period: 'week' }],
    ['negative', { limit_count: -3, limit_period: 'week' }],
    ['over 1000', { limit_count: 1001, limit_period: 'month' }],
    ['a fraction', { limit_count: 2.5, limit_period: 'week' }],
    ['text', { limit_count: 'abc', limit_period: 'week' }],
    ['a boolean', { limit_count: true, limit_period: 'week' }],
    ['an object', { limit_count: { $gt: 1 }, limit_period: 'week' }],
    ['no period', { limit_count: 3 }],
    ['unknown period', { limit_count: 3, limit_period: 'day' }],
    ['period only', { limit_period: 'week' }],
  ]) {
    test(`400 for ${label}`, async () => {
      const before = T.plans.rows.length;
      const res = await create(patch);
      assert.equal(res.status, 400, JSON.stringify(res.body));
      assert.equal(T.plans.rows.length, before);
      assert.equal(T.planLimits.rows.length, 0);
    });
  }

  test('a valid weekly limit is stored in the history table and returned with the plan', async () => {
    const res = await create({ limit_count: '2', limit_period: 'week' });
    assert.equal(res.status, 201);
    assert.equal(res.body.limit_count, 2);
    assert.equal(res.body.limit_period, 'week');
    assert.ok(res.body.limit_effective_from);
    assert.equal(T.planLimits.rows.length, 1);
    assert.equal(T.planLimits.rows[0].created_by, U.advA.id);
    assert.equal(T.planLimits.rows[0].advisor_id, ADV_A.id);
    // never written onto the plan row itself
    assert.equal(T.plans.rows.find((p) => p.name === 'Plan X').limit_count, undefined);
  });

  test('blank means unlimited and creates no history row', async () => {
    const res = await create({ limit_count: '', limit_period: 'week' });
    assert.equal(res.status, 201);
    assert.equal(res.body.limit_count, null);
    assert.equal(T.planLimits.rows.length, 0);
  });

  test('editing inserts a new row effective now; an unchanged limit adds none; clearing records unlimited', async () => {
    setLimit(BASIC, 2, 'week', new Date(Date.now() - 86400000));
    const put = (b) => request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.advA)).send(b);
    assert.equal((await put({ limit_count: 2, limit_period: 'week' })).status, 200);
    assert.equal(T.planLimits.rows.length, 1, 'same limit -> no new row');
    const changed = await put({ limit_count: 5, limit_period: 'month' });
    assert.equal(changed.body.limit_count, 5);
    assert.equal(changed.body.limit_period, 'month');
    assert.equal(T.planLimits.rows.length, 2);
    const cleared = await put({ limit_count: null });
    assert.equal(cleared.body.limit_count, null);
    assert.equal(T.planLimits.rows.length, 3);
    assert.equal(T.planLimits.rows[2].limit_count, null);
    // a limit-only edit does not trip "Nothing to update"
    assert.equal(T.plans.rows[0].name, 'Basic Stock Advisory');
  });

  test('another advisor, staff and platform plans cannot have limits set', async () => {
    const body = { limit_count: 3, limit_period: 'week' };
    assert.equal((await request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.advB)).send(body)).status, 404);
    assert.equal((await request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.admin)).send(body)).status, 403);
    assert.equal((await request(app).put(`/api/advisors/plans/${SYSTEM}`).set(as(U.advA)).send(body)).status, 404);
    assert.equal((await request(app).put(`/api/advisors/plans/${SYSTEM}`).set(as(U.admin)).send(body)).status, 404);
    assert.equal((await request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.plain)).send(body)).status, 403);
    assert.equal((await request(app).put(`/api/advisors/plans/${BASIC}`).send(body)).status, 401);
    assert.equal(T.planLimits.rows.length, 0);
  });

  test('mine and the public plan list both carry the limit in force; a future-dated row is not in force yet', async () => {
    setLimit(BASIC, 1, 'week', new Date(Date.now() - 5000));
    setLimit(BASIC, 2, 'week', new Date(Date.now() - 1000));
    setLimit(BASIC, 99, 'week', new Date(Date.now() + 3600000));
    const mine = await request(app).get('/api/advisors/plans/mine').set(as(U.advA));
    const basic = mine.body.find((p) => p.id === BASIC);
    assert.equal(basic.limit_count, 2, 'latest row at or before now');
    assert.equal(mine.body.find((p) => p.id === PRO).limit_count, null);
    const pub = await request(app).get(`/api/advisors/plans?advisor_id=${ADV_A.id}`);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.find((p) => p.id === BASIC).limit_count, 2);
    assert.equal(pub.body.find((p) => p.id === BASIC).limit_period, 'week');
    const one = await request(app).get(`/api/advisors/plans/${BASIC}`);
    assert.equal(one.body.limit_count, 2);
  });
});

// ---------------------------------------------------------------------------
describe('allowance: enforcement', () => {
  test('weekly cap: 2 per week allows two, refuses the third with a 409 naming the plan and the reset date; nothing is created', async () => {
    setLimit(BASIC, 2, 'week');
    assert.equal((await publish(rec({ required_plan_id: BASIC }))).status, 201);
    assert.equal((await publish(rec({ required_plan_id: BASIC }))).status, 201);
    const third = await publish(rec({ required_plan_id: BASIC }));
    assert.equal(third.status, 409);
    assert.equal(third.body.error, `Basic Stock Advisory has used 2 of 2 recommendations this week. It resets on ${limits.formatReset(limits.weekWindow().end)}.`);
    assert.equal(third.body.plan_id, BASIC);
    assert.equal(third.body.scope, 'week');
    assert.equal(T.posts.rows.length, 2);
    assert.equal(usageRows(BASIC).length, 2);
  });

  test('monthly cap is 4 x the weekly limit: 8 for 2/week, reset on the 1st (IST)', async () => {
    const now = new Date('2026-11-18T06:30:00Z'); // Wednesday
    setLimit(BASIC, 2, 'week', new Date('2026-01-01T00:00:00Z'));
    const wk = limits.weekWindow(now);
    const mo = limits.monthWindow(now);
    // 8 used this month, but none in the current week -> weekly is free, monthly is full.
    for (let i = 0; i < 8; i += 1) useAllowance(BASIC, 1, new Date(mo.start.getTime() + 60000 + i));
    assert.ok(wk.start > new Date(mo.start.getTime() + 60000 + 8));
    const post = { id: 'c0000000-0000-4000-8000-000000000001', status: 'published', visibility: 'subscribers', recommendation_type: 'buy', required_plan_id: BASIC };
    await assert.rejects(limits.reserve(ADV_A.id, post, { now }), (e) => {
      assert.equal(e.status, 409);
      assert.equal(e.message, 'Basic Stock Advisory has used 8 of 8 recommendations this month. It resets on Tue 1 Dec.');
      return true;
    });
    // 7 used -> the 8th is allowed.
    T.usage.rows.pop();
    await limits.reserve(ADV_A.id, post, { now });
    assert.equal(usageRows(BASIC).length, 8);
  });

  test('both caps full: the message names the month, the longer wait', async () => {
    const now = new Date('2026-11-18T06:30:00Z');
    setLimit(BASIC, 1, 'week', new Date('2026-01-01T00:00:00Z'));
    useAllowance(BASIC, 4, now); // 4 in this week and month = month cap of 4
    const post = { id: 'c0000000-0000-4000-8000-000000000002', status: 'published', visibility: 'subscribers', recommendation_type: 'buy', required_plan_id: BASIC };
    await assert.rejects(limits.reserve(ADV_A.id, post, { now }), /this month\. It resets on Tue 1 Dec/);
  });

  test('allowance comes back at the reset boundaries (IST), not before', async () => {
    setLimit(BASIC, 1, 'week', new Date('2026-01-01T00:00:00Z'));
    const post = (n) => ({ id: `c0000000-0000-4000-8000-00000000010${n}`, status: 'published', visibility: 'subscribers', recommendation_type: 'buy', required_plan_id: BASIC });
    // Used Sunday 23:59 IST.
    useAllowance(BASIC, 1, new Date('2026-11-15T18:29:00Z'));
    await assert.rejects(limits.reserve(ADV_A.id, post(1), { now: new Date('2026-11-15T18:29:30Z') }), /resets on Mon 16 Nov/);
    // Monday 00:00 IST: new week, free again.
    await limits.reserve(ADV_A.id, post(2), { now: new Date('2026-11-15T18:30:00Z') });
    assert.equal(usageRows(BASIC).length, 2);
  });

  test('a monthly limit has no weekly cap', async () => {
    const now = new Date('2026-11-18T06:30:00Z');
    setLimit(BASIC, 3, 'month', new Date('2026-01-01T00:00:00Z'));
    useAllowance(BASIC, 2, now);
    const post = (n) => ({ id: `c0000000-0000-4000-8000-00000000020${n}`, status: 'published', visibility: 'subscribers', recommendation_type: 'buy', required_plan_id: BASIC });
    await limits.reserve(ADV_A.id, post(1), { now });
    await assert.rejects(limits.reserve(ADV_A.id, post(2), { now }), /used 3 of 3 recommendations this month/);
    const usage = await limits.usageForAdvisor(ADV_A.id, { now });
    const basic = usage.plans.find((p) => p.plan_id === BASIC);
    assert.equal(basic.week.cap, null);
    assert.equal(basic.week.used, 3);
    assert.equal(basic.month.cap, 3);
  });

  test('no limit means unlimited', async () => {
    for (let i = 0; i < 12; i += 1) assert.equal((await publish(rec({ required_plan_id: BASIC }))).status, 201);
  });

  test('usage is counted once per (post, plan): re-saving an edited post adds nothing', async () => {
    setLimit(BASIC, 5, 'week');
    const created = await publish(rec({ required_plan_id: BASIC }));
    assert.equal(usageRows(BASIC).length, 1);
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await request(app).put(`/api/advisors/posts/${created.body.id}`).set(as(U.advA)).send({ content: `edit ${i}` })).status, 200);
    }
    assert.equal(usageRows(BASIC).length, 1);
    // unpublish then republish: still the same ledger row
    await request(app).put(`/api/advisors/posts/${created.body.id}`).set(as(U.advA)).send({ status: 'draft' });
    await request(app).put(`/api/advisors/posts/${created.body.id}`).set(as(U.advA)).send({ status: 'published' });
    assert.equal(usageRows(BASIC).length, 1);
  });

  test('deleting a post gives no allowance back', async () => {
    setLimit(BASIC, 1, 'week');
    const created = await publish(rec({ required_plan_id: BASIC }));
    assert.equal(created.status, 201);
    assert.equal((await request(app).delete(`/api/advisors/posts/${created.body.id}`).set(as(U.advA))).status, 200);
    assert.equal(T.posts.rows.length, 0);
    assert.equal(usageRows(BASIC).length, 1, 'ledger row survives');
    assert.equal((await publish(rec({ required_plan_id: BASIC }))).status, 409);
  });

  test('an all-subscribers post consumes every plan of the advisor (and only that advisor\'s)', async () => {
    const res = await publish(rec());
    assert.equal(res.status, 201);
    assert.equal(usageRows(BASIC).length, 1);
    assert.equal(usageRows(PRO).length, 1);
    assert.equal(usageRows(B_PLAN).length, 0);
    assert.equal(usageRows(SYSTEM).length, 0);
  });

  test('a Premium-only post does not consume Basic; a Basic-tier post reaches Basic and Premium', async () => {
    assert.equal((await publish(rec({ required_plan_id: PRO }))).status, 201);
    assert.equal(usageRows(PRO).length, 1);
    assert.equal(usageRows(BASIC).length, 0);
    assert.equal((await publish(rec({ required_plan_id: BASIC }))).status, 201);
    assert.equal(usageRows(BASIC).length, 1);
    assert.equal(usageRows(PRO).length, 2);
  });

  test('a Premium-only post is not blocked by an exhausted Basic plan', async () => {
    setLimit(BASIC, 1, 'week');
    useAllowance(BASIC, 1);
    assert.equal((await publish(rec({ required_plan_id: PRO }))).status, 201);
    assert.equal((await publish(rec({ required_plan_id: BASIC }))).status, 409);
    assert.equal((await publish(rec())).status, 409, 'all-subscribers reaches Basic');
  });

  test('drafts, public posts and non-recommendations never count', async () => {
    setLimit(BASIC, 1, 'week');
    assert.equal((await publish(rec({ status: 'draft' }))).status, 201);
    assert.equal((await publish(rec({ visibility: 'public' }))).status, 201);
    assert.equal((await publish({ title: 'Market view', content: 'Sideways.' })).status, 201);
    assert.equal(T.usage.rows.length, 0);
    // publishing the draft is what spends the allowance
    const draftId = T.posts.rows[0].id;
    assert.equal((await request(app).put(`/api/advisors/posts/${draftId}`).set(as(U.advA)).send({ status: 'published' })).status, 200);
    assert.equal(usageRows(BASIC).length, 1);
    const second = await publish(rec({ status: 'draft' }));
    const refused = await request(app).put(`/api/advisors/posts/${second.body.id}`).set(as(U.advA)).send({ status: 'published' });
    assert.equal(refused.status, 409);
    assert.equal(T.posts.rows.find((p) => p.id === second.body.id).status, 'draft', 'a refused publish leaves the draft a draft');
    assert.equal((await request(app).put(`/api/advisors/posts/${second.body.id}`).set(as(U.advA)).send({ content: 'still a draft' })).status, 200, 'saving a draft is never blocked');
  });

  test('a stock call filed as an analysis (symbol + target or stop loss) still counts', async () => {
    assert.equal(limits.countsAgainstLimit({ status: 'published', visibility: 'subscribers', post_type: 'analysis', stock_symbol: 'TCS', target_price: 4200 }), true);
    assert.equal(limits.countsAgainstLimit({ status: 'published', visibility: 'subscribers', post_type: 'update', stock_symbol: 'TCS', stop_loss: '3900' }), true);
    assert.equal(limits.countsAgainstLimit({ status: 'published', visibility: 'subscribers', post_type: 'analysis', stock_symbol: 'TCS' }), false, 'a symbol alone is commentary');
    assert.equal(limits.countsAgainstLimit({ status: 'published', visibility: 'subscribers', post_type: 'analysis', target_price: 10 }), false);
    setLimit(BASIC, 1, 'week');
    assert.equal((await publish({ title: 'TCS view', content: 'Looks strong.', post_type: 'analysis', stock_symbol: 'TCS', target_price: 4200 })).status, 201);
    const refused = await publish({ title: 'INFY view', content: 'Looks strong.', post_type: 'analysis', stock_symbol: 'INFY', stop_loss: 1500 });
    assert.equal(refused.status, 409);
  });

  test('an edit that widens reach is checked against the newly reached plans', async () => {
    setLimit(BASIC, 1, 'week');
    useAllowance(BASIC, 1);
    const created = await publish(rec({ required_plan_id: PRO }));
    assert.equal(created.status, 201);
    assert.equal(usageRows(BASIC).length, 1, 'only the seeded row: Basic not reached yet');
    const widen = await request(app).put(`/api/advisors/posts/${created.body.id}`).set(as(U.advA)).send({ required_plan_id: BASIC });
    assert.equal(widen.status, 409);
    assert.match(widen.body.error, /^Basic Stock Advisory has used 1 of 1 recommendation this week/);
    assert.equal(T.posts.rows.find((p) => p.id === created.body.id).required_plan_id, PRO, 'unchanged');
    // narrowing is always fine and does not refund
    const all = await request(app).put(`/api/advisors/posts/${created.body.id}`).set(as(U.advA)).send({ required_plan_id: PRO, content: 'narrow' });
    assert.equal(all.status, 200);
  });

  test('turning an analysis into a recommendation is checked at that moment', async () => {
    setLimit(BASIC, 1, 'week');
    useAllowance(BASIC, 1);
    const note = await publish({ title: 'Market view', content: 'Sideways.', required_plan_id: BASIC });
    assert.equal(note.status, 201);
    const turn = await request(app).put(`/api/advisors/posts/${note.body.id}`).set(as(U.advA)).send({ recommendation_type: 'buy' });
    assert.equal(turn.status, 409);
  });

  test('staff moderation edits are not blocked by an advisor\'s allowance but are recorded', async () => {
    setLimit(BASIC, 1, 'week');
    useAllowance(BASIC, 1);
    const draft = T.posts.add({ advisor_id: ADV_A.id, title: 'Held', content: 'c', status: 'draft', visibility: 'subscribers', recommendation_type: 'buy', required_plan_id: BASIC });
    const res = await request(app).put(`/api/advisors/posts/${draft.id}`).set(as(U.admin)).send({ status: 'published' });
    assert.equal(res.status, 200);
    assert.equal(usageRows(BASIC).length, 2);
  });

  test('two publishes racing for the last slot: exactly one wins; plan rows are locked FOR UPDATE', async () => {
    setLimit(BASIC, 1, 'week');
    const locks = [];
    const realFindAll = db.SubscriptionPlan.findAll;
    mock.method(db.SubscriptionPlan, 'findAll', async (opts = {}) => { locks.push(opts.lock); return realFindAll(opts); });
    // Serialise the two transactions the way the row lock does in MySQL.
    let tail = Promise.resolve();
    db.sequelize.transaction.mock.mockImplementation((cb) => { const run = tail.then(() => cb({ LOCK: { UPDATE: 'UPDATE' } })); tail = run.catch(() => {}); return run; });
    const results = await Promise.all([publish(rec({ required_plan_id: BASIC })), publish(rec({ required_plan_id: BASIC }))]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.ok(locks.includes('UPDATE'), 'SELECT ... FOR UPDATE on the plan rows');
    assert.equal(usageRows(BASIC).length, 1);
    assert.equal(T.posts.rows.length, 1);
  });
});

// ---------------------------------------------------------------------------
describe('GET /advisors/posts/usage', () => {
  test('401 without a token, 403 for non-advisors and staff', async () => {
    assert.equal((await request(app).get('/api/advisors/posts/usage')).status, 401);
    assert.equal((await request(app).get('/api/advisors/posts/usage').set(as(U.plain))).status, 403);
    assert.equal((await request(app).get('/api/advisors/posts/usage').set(as(U.admin))).status, 403);
  });

  test('returns the advisor\'s own plans with limit in force, counters, remaining and reset times', async () => {
    setLimit(BASIC, 2, 'week');
    await publish(rec({ required_plan_id: BASIC }));
    const res = await request(app).get('/api/advisors/posts/usage').set(as(U.advA));
    assert.equal(res.status, 200);
    assert.equal(res.body.timezone, 'Asia/Kolkata');
    assert.deepEqual(res.body.plans.map((p) => p.plan_id).sort(), [BASIC, PRO].sort(), 'own plans only');
    const basic = res.body.plans.find((p) => p.plan_id === BASIC);
    assert.equal(basic.plan_name, 'Basic Stock Advisory');
    assert.equal(basic.is_active, true);
    assert.equal(basic.limit_count, 2);
    assert.equal(basic.limit_period, 'week');
    assert.ok(basic.effective_from);
    assert.equal(basic.week.used, 1);
    assert.equal(basic.week.cap, 2);
    assert.equal(basic.week.remaining, 1);
    assert.equal(basic.month.cap, 8);
    assert.equal(basic.month.remaining, 7);
    assert.equal(basic.week.resets_at, limits.weekWindow().end.toISOString());
    assert.equal(basic.month.resets_at, limits.monthWindow().end.toISOString());
    const pro = res.body.plans.find((p) => p.plan_id === PRO);
    assert.equal(pro.limit_count, null);
    assert.equal(pro.week.cap, null);
    assert.equal(pro.week.remaining, null);
    assert.equal(pro.week.used, 1, 'a Basic-tier post also reaches Pro');
  });

  test('editing the limit changes the caps from its effective moment', async () => {
    setLimit(BASIC, 2, 'week', new Date(Date.now() - 86400000));
    await request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.advA)).send({ limit_count: 5, limit_period: 'week' });
    const res = await request(app).get('/api/advisors/posts/usage').set(as(U.advA));
    const basic = res.body.plans.find((p) => p.plan_id === BASIC);
    assert.equal(basic.week.cap, 5);
    assert.equal(basic.month.cap, 20);
  });

  test('post_id reports which plans already counted that post', async () => {
    const created = await publish(rec({ required_plan_id: PRO }));
    const res = await request(app).get(`/api/advisors/posts/usage?post_id=${created.body.id}`).set(as(U.advA));
    assert.deepEqual(res.body.counted_plan_ids, [PRO]);
    const bad = await request(app).get('/api/advisors/posts/usage?post_id=nope').set(as(U.advA));
    assert.deepEqual(bad.body.counted_plan_ids, []);
  });

  test('answers 503 when the tables are missing, and posting is not blocked', async () => {
    mock.method(db.sequelize.getQueryInterface(), 'describeTable', async (table) => {
      if (String(table).startsWith('advisor_p')) throw new Error("Table 'x' doesn't exist");
      return Object.fromEntries(schemaGuard.POST_COLUMNS_014.map((c) => [c, {}]));
    });
    limits._reset(); schemaGuard._reset();
    const res = await request(app).get('/api/advisors/posts/usage').set(as(U.advA));
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'MIGRATION_PENDING');
    const created = await publish(rec({ required_plan_id: BASIC }));
    assert.equal(created.status, 201, 'publishing still works');
    assert.equal(T.usage.rows.length, 0);
    const put = await request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.advA)).send({ limit_count: 3, limit_period: 'week' });
    assert.equal(put.status, 503, 'limits cannot be saved without the tables');
    const list = await request(app).get('/api/advisors/plans/mine').set(as(U.advA));
    assert.equal(list.status, 200, 'plan lists still load');
    assert.equal(list.body[0].limit_count, null);
  });
});

// ---------------------------------------------------------------------------
describe('editing a live post does not charge allowance', () => {
  const live = (extra = {}) => T.posts.add({ advisor_id: ADV_A.id, title: 'Old call', content: 'c', status: 'published', visibility: 'subscribers', post_type: 'recommendation', recommendation_type: 'buy', stock_symbol: 'ABC', created_at: new Date('2026-01-05T10:00:00Z'), ...extra });
  const edit = (id, body, user = U.advA) => request(app).put(`/api/advisors/posts/${id}`).set(as(user)).send({ status: 'published', ...body });

  test('legacy post (no ledger rows), exhausted plan: a typo fix returns 200 and writes no row', async () => {
    setLimit(BASIC, 1, 'week');
    useAllowance(BASIC, 1);
    const post = live();
    const before = T.usage.rows.length;
    const res = await edit(post.id, { content: 'typo fixed' });
    assert.equal(res.status, 200);
    assert.equal(post.content, 'typo fixed');
    assert.equal(T.usage.rows.length, before, 'no ledger row, in particular none dated now');
    assert.equal(post.status, 'published');
  });

  test('legacy post, spare allowance: editing spends no slot', async () => {
    setLimit(BASIC, 2, 'week');
    const post = live({ required_plan_id: BASIC });
    assert.equal((await edit(post.id, { title: 'Better title' })).status, 200);
    assert.equal(T.usage.rows.length, 0);
    const usage = await request(app).get('/api/advisors/posts/usage').set(as(U.advA));
    assert.equal(usage.body.plans.find((p) => p.plan_id === BASIC).week.used, 0);
  });

  test('widening a legacy post charges only the newly reached plan', async () => {
    setLimit(BASIC, 1, 'week');
    useAllowance(BASIC, 1);
    const post = live({ required_plan_id: PRO });
    assert.equal((await edit(post.id, { content: 'x' })).status, 200, 'Pro already reached, not charged');
    assert.equal((await edit(post.id, { required_plan_id: BASIC })).status, 409, 'Basic newly reached and full');
    assert.equal(post.required_plan_id, PRO);
  });

  test('a staff edit of a live post does not charge the advisor', async () => {
    setLimit(BASIC, 1, 'week');
    const post = live();
    const res = await edit(post.id, { content: 'moderator fix' }, U.admin);
    assert.equal(res.status, 200);
    assert.equal(T.usage.rows.length, 0);
  });
});

// ---------------------------------------------------------------------------
describe('unlimited plans do not need the tables', () => {
  test('create/edit with limit_count null succeeds while the tables are missing; a real limit answers 503', async () => {
    mock.method(db.sequelize.getQueryInterface(), 'describeTable', async (table) => {
      if (String(table).startsWith('advisor_p')) throw new Error("doesn't exist");
      return Object.fromEntries(schemaGuard.POST_COLUMNS_014.map((c) => [c, {}]));
    });
    limits._reset();
    const plan = { name: 'Plan X', price: 100, features: ['a'], limit_period: 'week' };
    const ok = await request(app).post('/api/advisors/plans').set(as(U.advB)).send({ ...plan, limit_count: null });
    assert.equal(ok.status, 201);
    const put = await request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.advA)).send({ limit_count: null, limit_period: 'week', name: 'Renamed' });
    assert.equal(put.status, 200);
    assert.equal(T.plans.rows[0].name, 'Renamed');
    assert.equal((await request(app).post('/api/advisors/plans').set(as(U.advB)).send({ ...plan, name: 'Plan Y', limit_count: 3 })).status, 503);
    assert.equal((await request(app).put(`/api/advisors/plans/${BASIC}`).set(as(U.advA)).send({ limit_count: 3, limit_period: 'week' })).status, 503);
  });
});

// ---------------------------------------------------------------------------
describe('migration 025 (static)', () => {
  const sql = require('fs').readFileSync(require('path').join(__dirname, '../src/migrations/025_advisor_post_limits.sql'), 'utf8');
  const code = sql.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  test('creates only the two new tables, idempotently, and changes no existing data or table', () => {
    assert.match(code, /CREATE TABLE IF NOT EXISTS advisor_plan_limits/);
    assert.match(code, /CREATE TABLE IF NOT EXISTS advisor_post_usage/);
    assert.match(code, /UNIQUE KEY uq_post_usage_post_plan \(post_id, plan_id\)/);
    assert.doesNotMatch(code, /\b(DELETE|UPDATE|TRUNCATE|DROP)\b/i);
    const inserts = code.match(/\bINSERT\b[^;]*/gi) || [];
    assert.equal(inserts.length, 1, 'only the backfill inserts');
    assert.match(inserts[0], /^INSERT IGNORE INTO advisor_post_usage/);
    assert.match(inserts[0], /COALESCE\(p\.notified_at, p\.created_at\)/);
    assert.match(code, /idx_post_usage_advisor/);
    assert.match(code, /idx_plan_limits_advisor/);
    assert.doesNotMatch(code, /ALTER TABLE `?(subscription_plans|advisor_posts|users)`?/i);
  });
});
