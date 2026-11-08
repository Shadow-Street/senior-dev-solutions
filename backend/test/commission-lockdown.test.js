const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');

// BE-11 review, Critical: commission_tracking feeds an advisor's withdrawable
// balance, and the generic CRUD let any signed-in user write it (advisor_id,
// amount and status all came from the body).

const ADV = { id: '44444444-4444-4444-8444-444444444444', email: 'a@example.test', app_role: 'advisor', role: 'user', status: 'active' };
const PROFILE = { id: 'a0000000-0000-4000-8000-00000000000a', user_id: ADV.id, status: 'approved', display_name: 'Advisor A' };
const OTHER_PROFILE = 'b0000000-0000-4000-8000-00000000000b';

let t; let audit;
const as = (u) => ({ Authorization: bearer(u) });

beforeEach(() => {
  stubUserLookup({ [ADV.id]: ADV });
  t = {
    advisors: fakeTable([PROFILE]).install(mock, db.Advisor),
    commissions: fakeTable().install(mock, db.CommissionTracking),
    banks: fakeTable().install(mock, db.AdvisorBankAccount),
    payouts: fakeTable().install(mock, db.PayoutRequest),
  };
  t.advisors.rows[0].id = PROFILE.id;
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
  audit = [];
  mock.method(db.AuditLog, 'create', async (d) => { audit.push(d); return d; });
  t.banks.add({ user_id: ADV.id, status: 'active', is_primary: true, bank_name: 'HDFC', account_last4: '9012', ifsc: 'HDFC0001234', destination_changed_at: new Date(Date.now() - 48 * 3600e3) });
});
afterEach(() => mock.restoreAll());

const FORGED = { advisor_id: PROFILE.id, amount: 500000, status: 'approved', user_id: ADV.id, commission_type: 'subscription' };

describe('non-staff cannot write commission rows', () => {
  for (const [who, user] of [['advisor', ADV], ['user', USERS.user]]) {
    for (const base of ['/api/commissions/tracking', '/api/commissions']) {
      test(`${who}: POST ${base} (the original exploit) is 403 and creates nothing`, async () => {
        const res = await request(app).post(base).set(as(user)).send(FORGED);
        assert.equal(res.status, 403);
        assert.equal(t.commissions.rows.length, 0);
      });
    }
    test(`${who}: PUT/DELETE/bulk on a commission row are 403 and change nothing`, async () => {
      const row = t.commissions.add({ advisor_id: PROFILE.id, user_id: user.id, status: 'pending', amount: 10 });
      const put = await request(app).put(`/api/commissions/tracking/${row.id}`).set(as(user)).send({ status: 'approved', amount: 999999 });
      const put2 = await request(app).put(`/api/commissions/${row.id}`).set(as(user)).send({ status: 'approved' });
      const del = await request(app).delete(`/api/commissions/tracking/${row.id}`).set(as(user));
      const bulk = await request(app).post('/api/commissions/tracking/bulk').set(as(user)).send([FORGED]);
      assert.deepEqual([put.status, put2.status, del.status, bulk.status], [403, 403, 403, 403]);
      assert.equal(row.status, 'pending');
      assert.equal(row.amount, 10);
      assert.equal(t.commissions.rows.length, 1);
    });
    test(`${who}: cannot approve or cancel commissions`, async () => {
      const row = t.commissions.add({ advisor_id: PROFILE.id, status: 'pending', amount: 10 });
      for (const action of ['approve', 'cancel']) {
        const res = await request(app).post(`/api/commissions/tracking/${action}`).set(as(user)).send({ ids: [row.id] });
        assert.equal(res.status, 403);
      }
      assert.equal(row.status, 'pending');
      assert.equal(audit.length, 0);
    });
  }

  test('unauthenticated writes are 401', async () => {
    assert.equal((await request(app).post('/api/commissions/tracking').send(FORGED)).status, 401);
    assert.equal((await request(app).post('/api/commissions/tracking/approve').send({ ids: [] })).status, 401);
  });

  test('settings stay admin-only', async () => {
    const res = await request(app).post('/api/commissions/settings').set(as(ADV)).send({ entity_type: 'advisor', commission_percent: 0 });
    assert.equal(res.status, 403);
  });
});

describe('the balance only trusts approved rows for this advisor', () => {
  test('pending, cancelled, paid and other advisors\' rows do not count; withdrawal is refused', async () => {
    t.commissions.add({ advisor_id: PROFILE.id, status: 'pending', amount: 100000 });
    t.commissions.add({ advisor_id: PROFILE.id, status: 'cancelled', amount: 100000 });
    t.commissions.add({ advisor_id: PROFILE.id, status: 'paid', amount: 100000 });
    t.commissions.add({ advisor_id: OTHER_PROFILE, status: 'approved', amount: 100000 });
    const summary = await request(app).get('/api/advisors/withdrawals/summary').set(as(ADV));
    assert.equal(summary.body.available, 0);
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV)).send({ amount: 1 });
    assert.equal(res.status, 400);
    assert.equal(t.payouts.rows.length, 0);
  });

  test('a forged-looking row that cannot be written leaves the advisor at zero (end to end)', async () => {
    await request(app).post('/api/commissions/tracking').set(as(ADV)).send(FORGED);
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV)).send({ amount: 500000 });
    assert.equal(res.status, 400);
  });
});

describe('staff approval', () => {
  const ids = (...rows) => ({ ids: rows.map((r) => r.id) });

  test('admin approves pending commissions: status, audit, and they now back a withdrawal', async () => {
    const a = t.commissions.add({ advisor_id: PROFILE.id, status: 'pending', amount: 700 });
    const b = t.commissions.add({ advisor_id: PROFILE.id, status: 'pending', amount: 300 });
    const res = await request(app).post('/api/commissions/tracking/approve').set(as(USERS.admin)).send(ids(a, b, a));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual([a.status, b.status], ['approved', 'approved']);
    assert.deepEqual(audit.map((x) => x.action), ['commission.approved', 'commission.approved']);
    assert.ok(audit.every((x) => x.user_id === USERS.admin.id));
    const ok = await request(app).post('/api/advisors/withdrawals').set(as(ADV)).send({ amount: 1000 });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
  });

  test('cancel marks pending rows cancelled', async () => {
    const a = t.commissions.add({ advisor_id: PROFILE.id, status: 'pending', amount: 700 });
    const res = await request(app).post('/api/commissions/tracking/cancel').set(as(USERS.superAdmin)).send(ids(a));
    assert.equal(res.status, 200);
    assert.equal(a.status, 'cancelled');
  });

  test('all-or-nothing: a non-pending or unknown id fails the whole call', async () => {
    const pending = t.commissions.add({ advisor_id: PROFILE.id, status: 'pending', amount: 1 });
    const paid = t.commissions.add({ advisor_id: PROFILE.id, status: 'paid', amount: 1 });
    const conflict = await request(app).post('/api/commissions/tracking/approve').set(as(USERS.admin)).send(ids(pending, paid));
    assert.equal(conflict.status, 409);
    const missing = await request(app).post('/api/commissions/tracking/approve').set(as(USERS.admin)).send({ ids: [pending.id, 'cccccccc-0000-4000-8000-000000000001'] });
    assert.equal(missing.status, 404);
    assert.equal(pending.status, 'pending');
    assert.equal(audit.length, 0);
  });

  for (const body of [{}, { ids: [] }, { ids: 'x' }, { ids: ['not-a-uuid'] }, { ids: Array(101).fill('cccccccc-0000-4000-8000-000000000001') }]) {
    test(`bad ids ${JSON.stringify(body).slice(0, 40)} is 400`, async () => {
      assert.equal((await request(app).post('/api/commissions/tracking/approve').set(as(USERS.admin)).send(body)).status, 400);
    });
  }
});

describe('commission reads', () => {
  test('an advisor cannot read another advisor\'s commissions by id; staff and the owner can', async () => {
    t.commissions.add({ advisor_id: OTHER_PROFILE, status: 'approved', amount: 5 });
    assert.equal((await request(app).get(`/api/commissions/advisor/${OTHER_PROFILE}`).set(as(ADV))).status, 403);
    assert.equal((await request(app).get(`/api/commissions/advisor/${PROFILE.id}`).set(as(ADV))).status, 200);
    assert.equal((await request(app).get(`/api/commissions/advisor/${OTHER_PROFILE}`).set(as(USERS.admin))).status, 200);
  });
  test('the owner-scoped list shows only the caller\'s rows', async () => {
    t.commissions.add({ advisor_id: PROFILE.id, user_id: ADV.id, status: 'approved', amount: 5 });
    t.commissions.add({ advisor_id: OTHER_PROFILE, user_id: USERS.user.id, status: 'approved', amount: 9 });
    const res = await request(app).get('/api/commissions/tracking').set(as(ADV));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((r) => Number(r.amount)), [5]);
  });
});
