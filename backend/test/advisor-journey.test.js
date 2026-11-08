const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, bearer } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const EmailService = require('../src/services/EmailService');
const storage = require('../src/services/StorageService');
const schemaGuard = require('../src/utils/schemaGuard');

// BE-16: the advisor journey - apply, admin review, advisor-only APIs, plans,
// posts (subscriber gating), subscribers, earnings, directory.

const id = (n) => `${n}0000000-0000-4000-8000-00000000000${n}`;
const U = {
  applicant: { id: id(1), email: 'applicant@example.test', name: 'App Licant', role: 'user', app_role: 'user', status: 'active' },
  other: { id: id(2), email: 'other@example.test', name: 'Other', role: 'user', app_role: 'user', status: 'active' },
  admin: { id: id(3), email: 'admin@example.test', name: 'Admin', role: 'admin', app_role: 'admin', status: 'active' },
  advA: { id: id(4), email: 'a@example.test', name: 'Adv A', role: 'advisor', app_role: 'advisor', status: 'active' },
  advB: { id: id(5), email: 'b@example.test', name: 'Adv B', role: 'advisor', app_role: 'advisor', status: 'active' },
  pending: { id: id(6), email: 'p@example.test', name: 'Pending', role: 'user', app_role: 'user', status: 'active' },
  rejected: { id: id(7), email: 'r@example.test', name: 'Rejected', role: 'user', app_role: 'user', status: 'active' },
  drifted: { id: id(8), email: 'd@example.test', name: 'Drifted', role: 'advisor', app_role: 'advisor', status: 'active' }, // role advisor, profile suspended
  sub1: { id: id(9), email: 'sub1@example.test', name: 'Sub One', role: 'user', app_role: 'user', status: 'active' },
  sub2: { id: 'a0000000-0000-4000-8000-000000000010', email: 'sub2@example.test', name: 'Sub Two', role: 'user', app_role: 'user', status: 'active' },
};
const ADV = {
  A: { id: 'aa000000-0000-4000-8000-0000000000aa', user_id: U.advA.id, status: 'approved', display_name: 'Advisor A', sebi_registration_number: 'INA000012345', sebi_document_url: `private/${id(4)}/sebi-certificates/doc.pdf`, rejection_reason: null, verified: true, follower_count: 5 },
  B: { id: 'bb000000-0000-4000-8000-0000000000bb', user_id: U.advB.id, status: 'approved', display_name: 'Advisor B', sebi_registration_number: 'INA000099999', verified: true, follower_count: 9 },
  P: { id: 'cc000000-0000-4000-8000-0000000000cc', user_id: U.pending.id, status: 'pending_approval', display_name: 'Pending One', sebi_registration_number: 'INA000011111', sebi_document_url: `private/${id(6)}/sebi-certificates/secret.pdf`, verified: false },
  R: { id: 'dd000000-0000-4000-8000-0000000000dd', user_id: U.rejected.id, status: 'rejected', display_name: 'Rejected One', sebi_registration_number: 'INA000022222', rejection_reason: 'Certificate unreadable', verified: false },
  D: { id: 'ee000000-0000-4000-8000-0000000000ee', user_id: U.drifted.id, status: 'suspended', display_name: 'Drifted', sebi_registration_number: 'INA000033333', verified: false },
};
const PLAN_A_BASIC = 'a1000000-0000-4000-8000-0000000000a1';
const PLAN_A_PRO = 'a2000000-0000-4000-8000-0000000000a2';
const PLAN_B = 'b1000000-0000-4000-8000-0000000000b1';
const SYSTEM_PLAN = 'f1000000-0000-4000-8000-0000000000f1';

let T;
let notifications;
let bulkNotifications;
let audits;
let emails;

function setup() {
  const users = fakeTable(Object.values(U).map((u) => ({ ...u }))).install(mock, db.User);
  users.rows.forEach((r, i) => { r.id = Object.values(U)[i].id; });
  T = {
    users,
    advisors: fakeTable(Object.values(ADV).map((a) => ({ ...a }))).install(mock, db.Advisor),
    plans: fakeTable([
      { advisor_id: ADV.A.id, name: 'Basic', price: 500, interval: 'month', is_active: true, features: ['x'] },
      { advisor_id: ADV.A.id, name: 'Pro', price: 1500, interval: 'month', is_active: true, features: ['x'] },
      { advisor_id: ADV.B.id, name: 'B plan', price: 700, interval: 'month', is_active: true, features: ['x'] },
      { advisor_id: null, name: 'Premium', price: 592, interval: 'month', is_active: true, is_system_plan: true },
    ]).install(mock, db.SubscriptionPlan),
    posts: fakeTable().install(mock, db.AdvisorPost),
    recs: fakeTable().install(mock, db.AdvisorRecommendation),
    subs: fakeTable().install(mock, db.Subscription),
    commissions: fakeTable().install(mock, db.CommissionTracking),
    payouts: fakeTable().install(mock, db.PayoutRequest),
    reviews: fakeTable().install(mock, db.Review),
    refunds: fakeTable().install(mock, db.RefundRequest),
    pledgeCommissions: fakeTable().install(mock, db.AdvisorPledgeCommission),
  };
  [PLAN_A_BASIC, PLAN_A_PRO, PLAN_B, SYSTEM_PLAN].forEach((pid, i) => { T.plans.rows[i].id = pid; });
  Object.values(ADV).forEach((a, i) => { T.advisors.rows[i].id = a.id; });
  notifications = []; bulkNotifications = []; audits = []; emails = [];
  mock.method(db.Notification, 'create', async (d) => { notifications.push(d); return { ...d, toJSON: () => d }; });
  mock.method(db.Notification, 'bulkCreate', async (rows) => { bulkNotifications.push(...rows); return rows; });
  mock.method(db.AuditLog, 'create', async (d) => { audits.push(d); return d; });
  mock.method(storage, 'objectExists', async () => true);
  mock.method(db.sequelize.getQueryInterface(), 'describeTable', async () => Object.fromEntries(schemaGuard.POST_COLUMNS_014.map((c) => [c, {}])));
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
  mock.method(EmailService, 'sendEmail', async (to, subject, html) => { emails.push({ to, subject, html }); return true; });
}

beforeEach(() => { schemaGuard._reset(); process.env.PUBLIC_API_BASE_URL = API; setup(); });
afterEach(() => { mock.restoreAll(); delete process.env.PUBLIC_API_BASE_URL; });

const as = (u) => ({ Authorization: bearer(u) });
const own = (userId) => `private/${userId}/sebi-certificates/abc-cert.pdf`;
const API = 'https://api.example.test/api';
const validApplication = (u, extra = {}) => ({
  display_name: 'Asha Rao', bio: 'Technical analyst with ten years of experience.',
  sebi_registration_number: 'ina000012346', sebi_document_key: own(u.id), specialization: ['Technical', 'Options'], ...extra,
});
const advisorRow = (key) => T.advisors.rows.find((r) => r.id === ADV[key].id);
const userRow = (u) => T.users.rows.find((r) => r.id === u.id);

// ---------------------------------------------------------------------------
describe('registration: apply', () => {
  test('401 without a token', async () => {
    assert.equal((await request(app).post('/api/advisors/apply').send(validApplication(U.applicant))).status, 401);
    assert.equal((await request(app).get('/api/advisors/me')).status, 401);
  });

  for (const [label, patch, fragment] of [
    ['missing name', { display_name: '' }, /Name is required/],
    ['short bio', { bio: 'too short' }, /Bio must be at least/],
    ['bad SEBI number', { sebi_registration_number: '313131' }, /SEBI registration number must look like/],
    ['no certificate', { sebi_document_key: '' }, /SEBI certificate is required/],
    ['certificate that is a foreign URL', { sebi_document_key: 'https://evil.example/api/files/view/private/11111111-1111-4111-8111-111111111111/sebi-certificates/a.pdf' }, /must be one you uploaded yourself/],
    ['someone else\'s upload', { sebi_document_key: `private/${U.other.id}/sebi-certificates/a.pdf` }, /must be one you uploaded yourself/],
    ['a key in another folder', { sebi_document_key: `private/${U.applicant.id}/documents/a.pdf` }, /must be one you uploaded yourself/],
    ['a traversal key', { sebi_document_key: `private/${U.applicant.id}/sebi-certificates/../../x` }, /must be one you uploaded yourself/],
    ['a public key', { sebi_document_key: 'public/sebi-certificates/a.pdf' }, /must be one you uploaded yourself/],
    ['a key with a query', { sebi_document_key: `private/${U.applicant.id}/sebi-certificates/a.pdf?x=1` }, /must be one you uploaded yourself/],
    ['too many expertise tags', { specialization: Array.from({ length: 9 }, (_, i) => `t${i}`) }, /at most 8/],
  ]) {
    test(`400 for ${label}`, async () => {
      const res = await request(app).post('/api/advisors/apply').set(as(U.applicant)).send(validApplication(U.applicant, patch));
      assert.equal(res.status, 400);
      assert.match(res.body.error, fragment);
      assert.equal(T.advisors.rows.length, Object.keys(ADV).length);
    });
  }

  test('creates a PENDING application owned by the session user; role untouched; privileged fields ignored', async () => {
    const res = await request(app).post('/api/advisors/apply').set(as(U.applicant)).send(validApplication(U.applicant, {
      status: 'approved', verified: true, user_id: U.other.id, rating: 5, follower_count: 999, total_earnings: 1e6, rejection_reason: 'x', role: 'advisor', app_role: 'advisor',
    }));
    assert.equal(res.status, 201);
    const row = T.advisors.rows.find((r) => r.user_id === U.applicant.id);
    assert.ok(row);
    assert.equal(row.status, 'pending_approval');
    assert.equal(row.verified, false);
    assert.equal(row.sebi_registration_number, 'INA000012346', 'normalised to upper case');
    assert.equal(row.follower_count, 0);
    assert.equal(row.rating, undefined);
    assert.equal(row.total_earnings, undefined);
    assert.deepEqual(row.specialization, ['Technical', 'Options']);
    assert.equal(userRow(U.applicant).role, 'user');
    assert.equal(userRow(U.applicant).app_role, 'user');
    assert.equal(res.body.advisor.status, 'pending_approval');
  });

  test('a second application is refused: pending, approved and suspended', async () => {
    for (const u of [U.pending, U.advA, U.drifted]) {
      const before = T.advisors.rows.length;
      const res = await request(app).post('/api/advisors/apply').set(as(u)).send(validApplication(u));
      assert.equal(res.status, 409, `${u.email}`);
      assert.equal(T.advisors.rows.length, before);
    }
    assert.equal(advisorRow('A').status, 'approved');
  });

  test('a rejected applicant can re-apply: back to pending, reason cleared, no second row', async () => {
    const before = T.advisors.rows.length;
    const res = await request(app).post('/api/advisors/apply').set(as(U.rejected)).send(validApplication(U.rejected, { status: 'approved' }));
    assert.equal(res.status, 200);
    assert.equal(T.advisors.rows.length, before);
    assert.equal(advisorRow('R').status, 'pending_approval');
    assert.equal(advisorRow('R').rejection_reason, null);
    assert.equal(advisorRow('R').sebi_registration_number, 'INA000012346');
  });

  test('staff cannot apply', async () => {
    const res = await request(app).post('/api/advisors/apply').set(as(U.admin)).send(validApplication(U.admin));
    assert.equal(res.status, 403);
  });

  test('GET /me returns only the caller\'s own application (with the rejection reason)', async () => {
    const res = await request(app).get('/api/advisors/me').set(as(U.rejected));
    assert.equal(res.status, 200);
    assert.equal(res.body.advisor.id, ADV.R.id);
    assert.equal(res.body.advisor.rejection_reason, 'Certificate unreadable');
    const none = await request(app).get('/api/advisors/me').set(as(U.applicant));
    assert.equal(none.body.advisor, null);
  });
});

// ---------------------------------------------------------------------------
describe('no self-service approval', () => {
  test('the generic advisor CRUD has no write routes at all (not even for staff)', async () => {
    const create = await request(app).post('/api/users/advisors').set(as(U.applicant)).send({ ...validApplication(U.applicant), status: 'approved', verified: true });
    assert.equal(create.status, 404);
    const update = await request(app).put(`/api/users/advisors/${ADV.P.id}`).set(as(U.pending)).send({ status: 'approved', verified: true });
    assert.equal(update.status, 404);
    assert.equal((await request(app).put(`/api/users/advisors/${ADV.P.id}`).set(as(U.admin)).send({ status: 'approved' })).status, 404);
    assert.equal((await request(app).delete(`/api/users/advisors/${ADV.P.id}`).set(as(U.admin))).status, 404);
    assert.equal(advisorRow('P').status, 'pending_approval');
    assert.equal(userRow(U.pending).role, 'user');
    assert.equal(T.advisors.rows.length, Object.keys(ADV).length);
  });

  test('PUT /me cannot touch status, verified, ratings or user_id', async () => {
    const res = await request(app).put('/api/advisors/me').set(as(U.advA))
      .send({ bio: 'An updated biography that is long enough.', status: 'suspended', verified: false, rating: 5, follower_count: 1, user_id: U.other.id, total_earnings: 1 });
    assert.equal(res.status, 200);
    assert.equal(advisorRow('A').bio, 'An updated biography that is long enough.');
    assert.equal(advisorRow('A').status, 'approved');
    assert.equal(advisorRow('A').verified, true);
    assert.equal(advisorRow('A').user_id, U.advA.id);
    assert.equal(advisorRow('A').rating, undefined);
    assert.equal(advisorRow('A').follower_count, 5);
  });

  test('the SEBI number is read-only after approval, editable while pending', async () => {
    const locked = await request(app).put('/api/advisors/me').set(as(U.advA)).send({ sebi_registration_number: 'INA000000001' });
    assert.equal(locked.status, 400);
    assert.equal(advisorRow('A').sebi_registration_number, 'INA000012345');
    const same = await request(app).put('/api/advisors/me').set(as(U.advA)).send({ sebi_registration_number: 'ina000012345', display_name: 'Advisor Alpha' });
    assert.equal(same.status, 200);
    assert.equal(advisorRow('A').display_name, 'Advisor Alpha');
    const pend = await request(app).put('/api/advisors/me').set(as(U.pending)).send({ sebi_registration_number: 'INA000055555' });
    assert.equal(pend.status, 200);
    assert.equal(advisorRow('P').sebi_registration_number, 'INA000055555');
  });

  test('rejected and suspended profiles cannot be edited through /me', async () => {
    assert.equal((await request(app).put('/api/advisors/me').set(as(U.rejected)).send({ display_name: 'New Name' })).status, 409);
    assert.equal((await request(app).put('/api/advisors/me').set(as(U.drifted)).send({ display_name: 'New Name' })).status, 403);
  });
});

// ---------------------------------------------------------------------------
describe('admin review', () => {
  const review = (user, advisor, body) => request(app).post(`/api/advisors/${advisor.id}/review`).set(user ? as(user) : {}).send(body);

  test('only admins: 401 anonymous, 403 user / advisor / applicant', async () => {
    assert.equal((await review(null, ADV.P, { action: 'approve' })).status, 401);
    for (const u of [U.other, U.advA, U.pending]) {
      assert.equal((await review(u, ADV.P, { action: 'approve' })).status, 403, u.email);
    }
    assert.equal(advisorRow('P').status, 'pending_approval');
    assert.equal(userRow(U.pending).role, 'user');
    assert.equal(notifications.length, 0);
  });

  test('approve: status, verified, BOTH role columns, notification, audit and email', async () => {
    const res = await review(U.admin, ADV.P, { action: 'approve' });
    assert.equal(res.status, 200);
    assert.equal(advisorRow('P').status, 'approved');
    assert.equal(advisorRow('P').verified, true);
    assert.equal(advisorRow('P').rejection_reason, null);
    assert.equal(userRow(U.pending).role, 'advisor');
    assert.equal(userRow(U.pending).app_role, 'advisor');
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].user_id, U.pending.id);
    assert.equal(notifications[0].action_url, '/AdvisorDashboard');
    assert.equal(audits[0].action, 'advisor_approve');
    assert.equal(audits[0].user_id, U.admin.id);
    assert.equal(emails[0].to, U.pending.email);
  });

  test('reject needs a reason, stores it, keeps the user a plain user and tells them why', async () => {
    assert.equal((await review(U.admin, ADV.P, { action: 'reject' })).status, 400);
    assert.equal((await review(U.admin, ADV.P, { action: 'reject', reason: 'no' })).status, 400);
    assert.equal(advisorRow('P').status, 'pending_approval');

    const res = await review(U.admin, ADV.P, { action: 'reject', reason: 'SEBI number does not match the certificate' });
    assert.equal(res.status, 200);
    assert.equal(advisorRow('P').status, 'rejected');
    assert.equal(advisorRow('P').verified, false);
    assert.equal(advisorRow('P').rejection_reason, 'SEBI number does not match the certificate');
    assert.equal(userRow(U.pending).role, 'user');
    assert.match(notifications[0].message, /SEBI number does not match the certificate/);
  });

  test('suspend demotes the advisor; reactivating restores the role', async () => {
    assert.equal((await review(U.admin, ADV.A, { action: 'suspend', reason: 'Compliance review' })).status, 200);
    assert.equal(advisorRow('A').status, 'suspended');
    assert.equal(userRow(U.advA).role, 'user');
    assert.equal(userRow(U.advA).app_role, 'user');
    assert.equal((await review(U.admin, ADV.A, { action: 'approve' })).status, 200);
    assert.equal(userRow(U.advA).app_role, 'advisor');
  });

  test('invalid transitions and bad input', async () => {
    assert.equal((await review(U.admin, ADV.A, { action: 'approve' })).status, 409, 'already approved');
    assert.equal((await review(U.admin, ADV.R, { action: 'suspend' })).status, 409, 'cannot suspend a rejected application');
    assert.equal((await review(U.admin, ADV.P, { action: 'delete' })).status, 400);
    const missing = await request(app).post('/api/advisors/11111111-2222-4333-8444-555555555555/review').set(as(U.admin)).send({ action: 'approve' });
    assert.equal(missing.status, 404);
    assert.equal((await request(app).post('/api/advisors/not-a-uuid/review').set(as(U.admin)).send({ action: 'approve' })).status, 404);
  });

  test('reviewing never changes a staff account\'s role', async () => {
    T.advisors.add({ user_id: U.admin.id, status: 'pending_approval', display_name: 'Staff profile' });
    const row = T.advisors.rows.at(-1);
    assert.equal((await request(app).post(`/api/advisors/${row.id}/review`).set(as(U.admin)).send({ action: 'approve' })).status, 200);
    assert.equal(userRow(U.admin).role, 'admin');
    assert.equal(userRow(U.admin).app_role, 'admin');
    assert.equal((await request(app).post(`/api/advisors/${row.id}/review`).set(as(U.admin)).send({ action: 'suspend' })).status, 200);
    assert.equal(userRow(U.admin).role, 'admin');
  });

  test('a notification failure after a successful write does not fail the review', async () => {
    mock.method(EmailService, 'sendEmail', async () => { throw new Error('smtp down'); });
    const res = await review(U.admin, ADV.P, { action: 'approve' });
    assert.equal(res.status, 200);
    assert.equal(advisorRow('P').status, 'approved');
  });
});

describe('admin delete', () => {
  const del = (user, advisor) => request(app).delete(`/api/advisors/${advisor.id}`).set(user ? as(user) : {});

  test('admin only', async () => {
    assert.equal((await del(null, ADV.R)).status, 401);
    for (const u of [U.other, U.advA, U.rejected]) assert.equal((await del(u, ADV.R)).status, 403, u.email);
    assert.ok(advisorRow('R'));
  });

  test('removes the profile and its plans/posts and withdraws the advisor role', async () => {
    T.posts.add({ advisor_id: ADV.B.id, title: 'x', status: 'draft' });
    const res = await del(U.admin, ADV.B);
    assert.equal(res.status, 200);
    assert.equal(T.advisors.rows.some((a) => a.id === ADV.B.id), false);
    assert.equal(T.plans.rows.some((p) => p.advisor_id === ADV.B.id), false);
    assert.equal(T.posts.rows.length, 0);
    assert.equal(userRow(U.advB).role, 'user');
    assert.equal(userRow(U.advB).app_role, 'user');
    assert.equal(audits.at(-1).action, 'advisor_delete');
    assert.equal(T.plans.rows.some((p) => p.advisor_id === ADV.A.id), true, 'other advisors untouched');
  });

  test('refuses while there is financial history or an active subscriber', async () => {
    T.commissions.add({ advisor_id: ADV.A.id, amount: 10, status: 'pending' });
    assert.equal((await del(U.admin, ADV.A)).status, 409);
    T.subs.add({ advisor_id: ADV.B.id, user_id: U.sub1.id, plan_id: PLAN_B, status: 'active' });
    assert.equal((await del(U.admin, ADV.B)).status, 409);
    assert.ok(advisorRow('A') && advisorRow('B'));
    assert.equal(userRow(U.advA).role, 'advisor');
  });

  test('404 for unknown ids', async () => {
    assert.equal((await request(app).delete('/api/advisors/11111111-2222-4333-8444-555555555555').set(as(U.admin))).status, 404);
    assert.equal((await request(app).delete('/api/advisors/nope').set(as(U.admin))).status, 404);
  });
});

// ---------------------------------------------------------------------------
describe('pending / rejected / suspended users cannot reach advisor-only APIs', () => {
  const planBody = { name: 'Gold', price: 999, features: ['Daily calls'] };
  const postBody = { title: 'Buy ABC', content: 'Because.' };
  const calls = [
    ['POST', '/api/advisors/plans', planBody],
    ['PUT', `/api/advisors/plans/${PLAN_A_BASIC}`, { price: 1 }],
    ['DELETE', `/api/advisors/plans/${PLAN_A_BASIC}`],
    ['POST', '/api/advisors/posts', postBody],
    ['GET', '/api/advisors/posts'],
    ['POST', '/api/advisors/recommendations', { stock_symbol: 'TCS', action: 'buy' }],
    ['GET', '/api/advisors/subscriptions/my-subscribers'],
    ['GET', '/api/advisors/earnings'],
    ['GET', '/api/advisors/refunds'],
    ['GET', '/api/advisors/bank-accounts'],
    ['GET', '/api/advisors/withdrawals/summary'],
  ];
  for (const [who, user] of [['pending applicant', U.pending], ['rejected applicant', U.rejected], ['ordinary user', U.other], ['suspended advisor whose role has not been demoted', U.drifted]]) {
    test(`${who} gets 403 everywhere`, async () => {
      for (const [method, path, body] of calls) {
        const res = await request(app)[method.toLowerCase()](path).set(as(user)).send(body);
        assert.equal(res.status, 403, `${method} ${path} as ${who}`);
      }
      assert.equal(T.plans.rows.length, 4);
      assert.equal(T.posts.rows.length, 0);
    });
  }

  test('the advisor ROLE is required even when an approved profile row exists', async () => {
    T.advisors.add({ user_id: U.sub1.id, status: 'approved', display_name: 'Role-less' });
    for (const [method, path, body] of calls.filter(([, p]) => !p.includes('bank') && !p.includes('withdraw'))) {
      const res = await request(app)[method.toLowerCase()](path).set(as(U.sub1)).send(body);
      assert.equal(res.status, 403, `${method} ${path}`);
    }
  });

  test('anonymous callers get 401', async () => {
    for (const [method, path, body] of calls) {
      const res = await request(app)[method.toLowerCase()](path).send(body);
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  });

  test('an advisor pledge commission cannot be forged: writes are staff-only', async () => {
    const forged = { amount: 100000, status: 'paid' };
    assert.equal((await request(app).post('/api/advisors/pledge-commissions').set(as(U.advA)).send(forged)).status, 403);
    T.pledgeCommissions.add({ advisor_id: ADV.A.id, amount: 5, status: 'pending' });
    const rowId = T.pledgeCommissions.rows[0].id;
    assert.equal((await request(app).put(`/api/advisors/pledge-commissions/${rowId}`).set(as(U.advA)).send({ status: 'paid' })).status, 403);
    assert.equal((await request(app).delete(`/api/advisors/pledge-commissions/${rowId}`).set(as(U.advA))).status, 403);
    assert.equal(T.pledgeCommissions.rows[0].status, 'pending');
    const read = await request(app).get('/api/advisors/pledge-commissions/my-commissions').set(as(U.advA));
    assert.equal(read.status, 200);
    assert.equal(read.body.length, 1);
  });
});

// ---------------------------------------------------------------------------
describe('directory', () => {
  const json = (res) => JSON.stringify(res.body);

  test('anonymous: approved advisors only, no documents, reasons or user ids', async () => {
    for (const path of ['/api/advisors', '/api/users/advisors', '/api/users/advisors?status=pending_approval', '/api/users/advisors?status=rejected&limit=100']) {
      const res = await request(app).get(path);
      assert.equal(res.status, 200, path);
      assert.deepEqual(res.body.map((a) => a.display_name).sort(), ['Advisor A', 'Advisor B'], path);
      const text = json(res);
      assert.ok(!text.includes('sebi_document_url'), path);
      assert.ok(!text.includes('rejection_reason'), path);
      assert.ok(!text.includes('total_earnings'), path);
      assert.ok(!text.includes('"user_id"'), path);
      assert.ok(!text.includes('http://x/api/files/view/private'), path);
    }
  });

  test('other signed-in users see the same public view', async () => {
    const res = await request(app).get(`/api/users/advisors?user_id=${U.pending.id}`).set(as(U.other));
    assert.deepEqual(res.body.map((a) => a.display_name).sort(), ['Advisor A', 'Advisor B']);
  });

  test('the applicant can read their own pending / rejected row, including the reason', async () => {
    const a = await request(app).get(`/api/users/advisors?user_id=${U.rejected.id}`).set(as(U.rejected));
    assert.equal(a.body.length, 1);
    assert.equal(a.body[0].rejection_reason, 'Certificate unreadable');
    const b = await request(app).get(`/api/users/advisors/${ADV.P.id}`).set(as(U.pending));
    assert.equal(b.status, 200);
    assert.equal(b.body.status, 'pending_approval');
  });

  test('a single pending profile is 404 to everyone but its owner and staff', async () => {
    assert.equal((await request(app).get(`/api/users/advisors/${ADV.P.id}`)).status, 404);
    assert.equal((await request(app).get(`/api/users/advisors/${ADV.P.id}`).set(as(U.other))).status, 404);
    assert.equal((await request(app).get(`/api/users/advisors/${ADV.P.id}`).set(as(U.admin))).status, 200);
    const pub = await request(app).get(`/api/users/advisors/${ADV.A.id}`);
    assert.equal(pub.status, 200);
    assert.ok(!json(pub).includes('sebi_document_url'));
    assert.equal(pub.body.sebi_registration_number, 'INA000012345');
  });

  test('staff see every status with documents; filter by status works for staff', async () => {
    const all = await request(app).get('/api/users/advisors').set(as(U.admin));
    assert.equal(all.body.length, 5);
    assert.ok(json(all).includes('sebi_document_url'));
    const pend = await request(app).get('/api/users/advisors?status=pending_approval').set(as(U.admin));
    assert.deepEqual(pend.body.map((a) => a.display_name), ['Pending One']);
  });

  test('search narrows the directory', async () => {
    const calls = T.advisors.calls.length;
    await request(app).get('/api/advisors?q=Alpha%25&specialization=tech');
    const where = T.advisors.calls.slice(calls).find(([m]) => m === 'findAll')[1].where;
    assert.equal(where.status, 'approved');
    assert.ok(Object.getOwnPropertySymbols(where).length === 1, 'search clauses are combined with the approved filter');
  });
});

// ---------------------------------------------------------------------------
describe('plans', () => {
  const good = { name: 'Gold', price: 999, features: ['Daily calls'], description: 'Top tier' };

  test('create: owner and flags come from the session; client-set system fields are ignored', async () => {
    const res = await request(app).post('/api/advisors/plans').set(as(U.advB)).send({ ...good, advisor_id: ADV.A.id, is_system_plan: true, finfluencer_id: id(9), trial_days: 99, billing_interval: 'yearly' });
    assert.equal(res.status, 201);
    const row = T.plans.rows.at(-1);
    assert.equal(row.advisor_id, ADV.B.id);
    assert.equal(row.is_system_plan, false);
    assert.equal(row.finfluencer_id, null);
    assert.equal(row.trial_days, undefined);
    assert.equal(row.interval, 'year');
    assert.equal(row.price, 999);
    assert.equal(row.price_monthly, 999);
    assert.equal(row.is_active, true);
  });

  for (const [label, patch] of [
    ['zero price', { price: 0 }], ['negative price', { price: -5 }], ['text price', { price: 'abc' }], ['huge price', { price: 1e9 }],
    ['fractional paise', { price: 10.005 }], ['no features', { features: [] }], ['short name', { name: 'x' }], ['bad interval', { billing_interval: 'weekly' }], ['inactive flag as text', { is_active: 'no' }],
  ]) {
    test(`400 for ${label}`, async () => {
      const res = await request(app).post('/api/advisors/plans').set(as(U.advB)).send({ ...good, ...patch });
      assert.equal(res.status, 400);
      assert.equal(T.plans.rows.length, 4);
    });
  }

  test('at most three plans per advisor', async () => {
    assert.equal((await request(app).post('/api/advisors/plans').set(as(U.advA)).send(good)).status, 201);
    const fourth = await request(app).post('/api/advisors/plans').set(as(U.advA)).send({ ...good, name: 'Fourth' });
    assert.equal(fourth.status, 409);
  });

  test('update: own plan only, owner cannot be reassigned, platform plans untouchable', async () => {
    const ok = await request(app).put(`/api/advisors/plans/${PLAN_A_BASIC}`).set(as(U.advA)).send({ price: 650, is_active: false, advisor_id: ADV.B.id, is_system_plan: true });
    assert.equal(ok.status, 200);
    const row = T.plans.rows.find((p) => p.id === PLAN_A_BASIC);
    assert.equal(row.price, 650);
    assert.equal(row.price_monthly, 650);
    assert.equal(row.is_active, false);
    assert.equal(row.advisor_id, ADV.A.id);
    assert.notEqual(row.is_system_plan, true);

    assert.equal((await request(app).put(`/api/advisors/plans/${PLAN_B}`).set(as(U.advA)).send({ price: 1 })).status, 404);
    assert.equal(T.plans.rows.find((p) => p.id === PLAN_B).price, 700);
    assert.equal((await request(app).put(`/api/advisors/plans/${SYSTEM_PLAN}`).set(as(U.advA)).send({ price: 1 })).status, 404);
    assert.equal((await request(app).put(`/api/advisors/plans/${SYSTEM_PLAN}`).set(as(U.admin)).send({ price: 1 })).status, 404, 'platform plans stay with the subscription admin');
    assert.equal((await request(app).put(`/api/advisors/plans/${PLAN_A_BASIC}`).set(as(U.advA)).send({ price: 0 })).status, 400);
  });

  test('delete: own plan, blocked while it has active subscribers', async () => {
    T.subs.add({ user_id: U.sub1.id, advisor_id: ADV.A.id, plan_id: PLAN_A_PRO, status: 'active' });
    const blocked = await request(app).delete(`/api/advisors/plans/${PLAN_A_PRO}`).set(as(U.advA));
    assert.equal(blocked.status, 409);
    assert.equal((await request(app).delete(`/api/advisors/plans/${PLAN_B}`).set(as(U.advA))).status, 404);
    assert.equal((await request(app).delete(`/api/advisors/plans/${PLAN_A_BASIC}`).set(as(U.advA))).status, 200);
    assert.equal(T.plans.rows.some((p) => p.id === PLAN_A_BASIC), false);
    assert.equal(T.plans.rows.some((p) => p.id === PLAN_B), true);
  });

  test('plans stay publicly readable', async () => {
    const res = await request(app).get(`/api/advisors/plans?advisor_id=${ADV.A.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
  });
});

// ---------------------------------------------------------------------------
describe('posts and subscriber-only content', () => {
  const body = { title: 'Buy ABC', content: 'Detailed reasoning', stock_symbol: 'abc', recommendation_type: 'buy', target_price: 120, stop_loss: 90 };

  test('create stamps the advisor, whitelists fields and defaults to subscribers-only', async () => {
    const res = await request(app).post('/api/advisors/posts').set(as(U.advA)).send({ ...body, advisor_id: ADV.B.id, likes_count: 9999, is_pinned: true, view_count: 5 });
    assert.equal(res.status, 201);
    const row = T.posts.rows[0];
    assert.equal(row.advisor_id, ADV.A.id);
    assert.equal(row.visibility, 'subscribers');
    assert.equal(row.status, 'published');
    assert.equal(row.stock_symbol, 'ABC');
    assert.equal(row.likes_count, 0);
    assert.equal(row.is_pinned, false);
    assert.equal(row.view_count, undefined);
  });

  test('validation: title/content required, call and prices checked, plan must be the advisor\'s own', async () => {
    const send = (b) => request(app).post('/api/advisors/posts').set(as(U.advA)).send(b);
    assert.equal((await send({ content: 'x' })).status, 400);
    assert.equal((await send({ title: 'Hello' })).status, 400);
    assert.equal((await send({ ...body, recommendation_type: 'moon' })).status, 400);
    assert.equal((await send({ ...body, target_price: -4 })).status, 400);
    assert.equal((await send({ ...body, visibility: 'friends' })).status, 400);
    assert.equal((await send({ ...body, status: 'archived' })).status, 400);
    assert.equal((await send({ ...body, required_plan_id: PLAN_B })).status, 400, "another advisor's plan");
    assert.equal((await send({ ...body, required_plan_id: 'nope' })).status, 400);
    assert.equal((await send({ ...body, required_plan_id: PLAN_A_PRO })).status, 201);
    assert.equal(T.posts.rows.length, 1);
  });

  test('publishing notifies the entitled active subscribers once; drafts notify nobody', async () => {
    const inFuture = new Date(Date.now() + 86400000);
    T.subs.add({ user_id: U.sub1.id, advisor_id: ADV.A.id, plan_id: PLAN_A_BASIC, status: 'active', end_date: inFuture });
    T.subs.add({ user_id: U.sub2.id, advisor_id: ADV.A.id, plan_id: PLAN_A_PRO, status: 'active', end_date: inFuture });
    T.subs.add({ user_id: U.other.id, advisor_id: ADV.A.id, plan_id: PLAN_A_PRO, status: 'active', end_date: new Date(Date.now() - 1000) });

    const draft = await request(app).post('/api/advisors/posts').set(as(U.advA)).send({ ...body, status: 'draft' });
    assert.equal(draft.status, 201);
    assert.equal(bulkNotifications.length, 0);

    // Publishing the draft later notifies, once.
    const publish = await request(app).put(`/api/advisors/posts/${draft.body.id}`).set(as(U.advA)).send({ status: 'published', required_plan_id: PLAN_A_PRO });
    assert.equal(publish.status, 200);
    assert.deepEqual(bulkNotifications.map((n) => n.user_id), [U.sub2.id], 'only the Pro subscriber with a live subscription');
    assert.equal(publish.body.notified_subscribers, 1);
    assert.equal(bulkNotifications[0].action_url, `/AdvisorProfile?id=${ADV.A.id}`);
    await request(app).put(`/api/advisors/posts/${draft.body.id}`).set(as(U.advA)).send({ title: 'Edited title' });
    assert.equal(bulkNotifications.length, 1, 'editing a live post does not notify again');

    const anyTier = await request(app).post('/api/advisors/posts').set(as(U.advA)).send(body);
    assert.equal(anyTier.body.notified_subscribers, 2);
  });

  test('optional fields can be cleared on edit, required ones cannot', async () => {
    const row = T.posts.add({ advisor_id: ADV.A.id, title: 'T1', content: 'c', stock_symbol: 'ABC', target_price: 10, status: 'published', visibility: 'subscribers' });
    const ok = await request(app).put(`/api/advisors/posts/${row.id}`).set(as(U.advA)).send({ stock_symbol: null, target_price: null });
    assert.equal(ok.status, 200);
    assert.equal(row.stock_symbol, null);
    assert.equal(row.target_price, null);
    assert.equal((await request(app).put(`/api/advisors/posts/${row.id}`).set(as(U.advA)).send({ title: '' })).status, 400);
    assert.equal((await request(app).put(`/api/advisors/posts/${row.id}`).set(as(U.advA)).send({ content: null })).status, 400);
    assert.equal(row.title, 'T1');
  });

  test('a public post carries no tier even if one is sent', async () => {
    await request(app).post('/api/advisors/posts').set(as(U.advA)).send({ ...body, visibility: 'public', required_plan_id: PLAN_A_PRO });
    assert.equal(T.posts.rows[0].required_plan_id, null);
  });

  test('edit / delete: own posts only (404 for another advisor), owner column immutable', async () => {
    const own = T.posts.add({ advisor_id: ADV.A.id, title: 'Mine', content: 'c', status: 'published', visibility: 'subscribers' });
    const theirs = T.posts.add({ advisor_id: ADV.B.id, title: 'Theirs', content: 'c', status: 'published', visibility: 'subscribers' });

    assert.equal((await request(app).put(`/api/advisors/posts/${theirs.id}`).set(as(U.advA)).send({ title: 'Hijacked' })).status, 404);
    assert.equal((await request(app).delete(`/api/advisors/posts/${theirs.id}`).set(as(U.advA))).status, 404);
    assert.equal((await request(app).get(`/api/advisors/posts/${theirs.id}`).set(as(U.advA))).status, 404);
    assert.equal(theirs.title, 'Theirs');

    const res = await request(app).put(`/api/advisors/posts/${own.id}`).set(as(U.advA)).send({ title: 'Edited', advisor_id: ADV.B.id, visibility: 'public' });
    assert.equal(res.status, 200);
    assert.equal(own.title, 'Edited');
    assert.equal(own.visibility, 'public');
    assert.equal(own.advisor_id, ADV.A.id);
    assert.equal((await request(app).delete(`/api/advisors/posts/${own.id}`).set(as(U.advA))).status, 200);
    assert.equal(T.posts.rows.some((p) => p.id === own.id), false);
  });

  test('the dashboard list is the advisor\'s own, whatever advisor_id is requested', async () => {
    T.posts.add({ advisor_id: ADV.A.id, title: 'Mine', status: 'draft' });
    T.posts.add({ advisor_id: ADV.B.id, title: 'Theirs', status: 'published' });
    const res = await request(app).get(`/api/advisors/posts?advisor_id=${ADV.B.id}`).set(as(U.advA));
    assert.deepEqual(res.body.map((p) => p.title), ['Mine']);
  });

  describe('feed', () => {
    let pub; let sub; let pro; let draft;
    beforeEach(() => {
      pub = T.posts.add({ advisor_id: ADV.A.id, title: 'Free teaser', content: 'PUBLIC BODY', status: 'published', visibility: 'public', stock_symbol: 'AAA' });
      sub = T.posts.add({ advisor_id: ADV.A.id, title: 'Members call', content: 'SECRET BODY', status: 'published', visibility: 'subscribers', stock_symbol: 'BBB', recommendation_type: 'buy', target_price: 10 });
      pro = T.posts.add({ advisor_id: ADV.A.id, title: 'Pro call', content: 'PRO BODY', status: 'published', visibility: 'subscribers', required_plan_id: PLAN_A_PRO, stock_symbol: 'CCC' });
      draft = T.posts.add({ advisor_id: ADV.A.id, title: 'Draft', content: 'DRAFT BODY', status: 'draft', visibility: 'public' });
      T.posts.add({ advisor_id: ADV.B.id, title: 'Other advisor', content: 'B BODY', status: 'published', visibility: 'public' });
    });
    const feed = (user, advisor = ADV.A) => request(app).get(`/api/advisors/posts/by-advisor/${advisor.id}`).set(user ? as(user) : {});
    const byTitle = (res, t) => res.body.find((p) => p.title === t);
    const active = (user, planId, extra = {}) => T.subs.add({ user_id: user.id, advisor_id: ADV.A.id, plan_id: planId, status: 'active', end_date: new Date(Date.now() + 86400000), ...extra });

    test('anonymous and non-subscribers see public posts in full and everything else locked', async () => {
      for (const user of [null, U.other, U.sub2]) {
        const res = await feed(user);
        assert.equal(res.status, 200);
        assert.equal(byTitle(res, 'Free teaser').content, 'PUBLIC BODY');
        assert.equal(byTitle(res, 'Free teaser').locked, false);
        for (const t of ['Members call', 'Pro call']) {
          const p = byTitle(res, t);
          assert.equal(p.locked, true, t);
          assert.equal(p.content, undefined, `${t} content must be withheld server-side`);
          assert.equal(p.stock_symbol, undefined);
          assert.equal(p.target_price, undefined);
          assert.equal(p.recommendation_type, undefined);
        }
        const text = JSON.stringify(res.body);
        assert.ok(!text.includes('SECRET BODY') && !text.includes('PRO BODY') && !text.includes('DRAFT BODY') && !text.includes('B BODY'));
        assert.equal(byTitle(res, 'Draft'), undefined);
      }
    });

    test('an active subscriber unlocks members posts; a cheaper plan does not unlock a higher tier', async () => {
      active(U.sub1, PLAN_A_BASIC);
      const res = await feed(U.sub1);
      assert.equal(byTitle(res, 'Members call').content, 'SECRET BODY');
      assert.equal(byTitle(res, 'Members call').target_price, 10);
      assert.equal(byTitle(res, 'Pro call').locked, true);
      assert.equal(byTitle(res, 'Pro call').required_plan_name, 'Pro');
      assert.equal(byTitle(res, 'Pro call').content, undefined);
    });

    test('the tier plan or a dearer one unlocks the tier', async () => {
      active(U.sub2, PLAN_A_PRO);
      assert.equal(byTitle(await feed(U.sub2), 'Pro call').content, 'PRO BODY');
    });

    test('an expired, cancelled or other-advisor subscription unlocks nothing', async () => {
      active(U.sub1, PLAN_A_PRO, { end_date: new Date(Date.now() - 1000) });
      active(U.sub2, PLAN_A_PRO, { status: 'cancelled' });
      T.subs.add({ user_id: U.other.id, advisor_id: ADV.B.id, plan_id: PLAN_B, status: 'active', end_date: new Date(Date.now() + 86400000) });
      for (const u of [U.sub1, U.sub2, U.other]) {
        const res = await feed(u);
        assert.equal(byTitle(res, 'Members call').locked, true, u.email);
        assert.equal(byTitle(res, 'Members call').content, undefined);
      }
    });

    test('the advisor and staff read everything published; drafts are never in the feed', async () => {
      for (const u of [U.advA, U.admin]) {
        const res = await feed(u);
        assert.equal(byTitle(res, 'Pro call').content, 'PRO BODY');
        assert.equal(byTitle(res, 'Draft'), undefined);
      }
      assert.equal(byTitle(await feed(U.advB), 'Members call').locked, true, 'a different advisor is just a reader');
    });

    test('a non-approved advisor has no public feed', async () => {
      T.posts.add({ advisor_id: ADV.P.id, title: 'Pending post', content: 'x', status: 'published', visibility: 'public' });
      assert.equal((await feed(null, ADV.P)).status, 404);
      assert.equal((await feed(U.other, ADV.P)).status, 404);
      assert.equal((await feed(U.pending, ADV.P)).status, 200, 'owner may preview');
      assert.equal((await request(app).get('/api/advisors/posts/by-advisor/not-a-uuid')).status, 404);
    });

    test('the raw post endpoints are not a back door to locked content', async () => {
      active(U.sub1, PLAN_A_PRO);
      assert.equal((await request(app).get(`/api/advisors/posts/${sub.id}`).set(as(U.sub1))).status, 403);
      assert.equal((await request(app).get('/api/advisors/posts').set(as(U.sub1))).status, 403);
      assert.equal((await request(app).get(`/api/advisors/posts/${sub.id}`)).status, 401);
    });
  });
});

// ---------------------------------------------------------------------------
describe('subscribers and earnings', () => {
  beforeEach(() => {
    T.subs.add({ user_id: U.sub1.id, advisor_id: ADV.A.id, plan_id: PLAN_A_BASIC, status: 'active', start_date: new Date(), end_date: new Date(Date.now() + 86400000) });
    T.subs.add({ user_id: U.sub2.id, advisor_id: ADV.A.id, plan_id: PLAN_A_PRO, status: 'active', start_date: new Date(), end_date: new Date(Date.now() - 1000) });
    T.subs.add({ user_id: U.other.id, advisor_id: ADV.B.id, plan_id: PLAN_B, status: 'active' });
  });

  test('an advisor sees only subscribers of their own plans, by name, without e-mail or user ids', async () => {
    const res = await request(app).get('/api/advisors/subscriptions/my-subscribers').set(as(U.advA));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.deepEqual(res.body.map((s) => s.subscriber_name).sort(), ['Sub One', 'Sub Two']);
    assert.deepEqual(res.body.map((s) => s.plan_name).sort(), ['Basic', 'Pro']);
    assert.equal(res.body.find((s) => s.subscriber_name === 'Sub Two').status, 'expired', 'past its end date');
    const text = JSON.stringify(res.body);
    assert.ok(!text.includes('example.test'));
    assert.ok(!text.includes('"user_id"'));
    const b = await request(app).get('/api/advisors/subscriptions/my-subscribers').set(as(U.advB));
    assert.deepEqual(b.body.map((s) => s.subscriber_name), ['Other']);
  });

  test('staff see every subscription (with user ids); ordinary users are refused', async () => {
    const res = await request(app).get('/api/advisors/subscriptions/my-subscribers').set(as(U.admin));
    assert.equal(res.body.length, 3);
    assert.ok(res.body.every((s) => s.user_id));
    assert.equal((await request(app).get('/api/advisors/subscriptions/my-subscribers').set(as(U.sub1))).status, 403);
  });

  test('earnings separate pending from approved and exclude other advisors\' rows', async () => {
    T.commissions.add({ advisor_id: ADV.A.id, amount: 400, status: 'approved', commission_type: 'subscription', metadata: { gross_amount: 500, platform_fee: 100, plan_id: PLAN_A_BASIC } });
    T.commissions.add({ advisor_id: ADV.A.id, amount: 1200, status: 'pending', commission_type: 'subscription', metadata: { gross_amount: 1500, platform_fee: 300, plan_id: PLAN_A_PRO } });
    T.commissions.add({ advisor_id: ADV.B.id, amount: 77777, status: 'approved' });
    T.payouts.add({ user_id: U.advA.id, entity_type: 'advisor', status: 'paid', amount: 100 });

    const res = await request(app).get('/api/advisors/earnings').set(as(U.advA));
    assert.equal(res.status, 200);
    assert.equal(res.body.summary.approved, 400);
    assert.equal(res.body.summary.pending, 1200);
    assert.equal(res.body.summary.pending_count, 1);
    assert.equal(res.body.summary.available, 300);
    assert.equal(res.body.summary.total_withdrawn, 100);
    assert.equal(res.body.items.length, 2);
    assert.ok(res.body.items.every((i) => i.amount !== 77777));
    assert.deepEqual(res.body.items.map((i) => i.plan_name).sort(), ['Basic', 'Pro']);

    const pendingOnly = await request(app).get('/api/advisors/earnings?status=pending').set(as(U.advA));
    assert.equal(pendingOnly.body.items.length, 1);
    assert.equal((await request(app).get('/api/advisors/earnings?status=bogus').set(as(U.advA))).status, 400);
    assert.equal((await request(app).get('/api/advisors/earnings').set(as(U.admin))).status, 403, 'earnings are per advisor');
  });

  test('refund requests are limited to the advisor\'s own subscribers', async () => {
    const mine = T.subs.rows[0];
    const theirs = T.subs.rows[2];
    T.refunds.add({ subscription_id: mine.id, user_id: U.sub1.id, status: 'pending', reason: 'Not useful', refund_amount: 500 });
    T.refunds.add({ subscription_id: theirs.id, user_id: U.other.id, status: 'pending', reason: 'Other advisor', refund_amount: 700 });
    const res = await request(app).get('/api/advisors/refunds').set(as(U.advA));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((r) => r.reason), ['Not useful']);
    assert.equal(res.body[0].subscriber_name, 'Sub One');
  });
});

// ---------------------------------------------------------------------------
describe('recommendations', () => {
  test('only an approved advisor can post; owner and fields are server-controlled', async () => {
    const res = await request(app).post('/api/advisors/recommendations').set(as(U.advA))
      .send({ stock_symbol: 'tcs', action: 'buy', target_price: 4000, advisor_id: ADV.B.id, status: 'hacked' });
    assert.equal(res.status, 400, 'unknown status');
    const ok = await request(app).post('/api/advisors/recommendations').set(as(U.advA))
      .send({ stock_symbol: 'tcs', action: 'buy', target_price: 4000, advisor_id: ADV.B.id });
    assert.equal(ok.status, 201);
    assert.equal(T.recs.rows[0].advisor_id, ADV.A.id);
    assert.equal(T.recs.rows[0].stock_symbol, 'TCS');
    assert.equal((await request(app).put(`/api/advisors/recommendations/${T.recs.rows[0].id}`).set(as(U.advB)).send({ reason: 'mine now' })).status, 404);
    assert.equal((await request(app).delete(`/api/advisors/recommendations/${T.recs.rows[0].id}`).set(as(U.advB))).status, 404);
    assert.equal(T.recs.rows.length, 1);
  });
});

// ---------------------------------------------------------------------------
describe('certificate and image references are storage keys', () => {
  const apply = (u, extra) => request(app).post('/api/advisors/apply').set(as(u)).send(validApplication(u, extra));

  test('the stored value is the key', async () => {
    const res = await apply(U.applicant);
    assert.equal(res.status, 201);
    assert.equal(T.advisors.rows.find((r) => r.user_id === U.applicant.id).sebi_document_url, own(U.applicant.id));
  });

  test('a legacy full URL is accepted only on our own storage host, and reduced to the key', async () => {
    const legacy = `${API}/files/view/${own(U.applicant.id)}`;
    const ok = await request(app).post('/api/advisors/apply').set(as(U.applicant)).send({ ...validApplication(U.applicant), sebi_document_key: undefined, sebi_document_url: legacy });
    assert.equal(ok.status, 201);
    assert.equal(T.advisors.rows.find((r) => r.user_id === U.applicant.id).sebi_document_url, own(U.applicant.id));

    for (const bad of [
      `https://evil.example/api/files/view/${own(U.other.id)}`,
      `https://evil.example/api/files/view/${own(U.rejected.id)}`,
      `${API}/files/view/${own(U.rejected.id)}?token=1`,
      `https://user:pw@api.example.test/api/files/view/${own(U.rejected.id)}`,
      `${API}/elsewhere/${own(U.rejected.id)}`,
    ]) {
      const res = await request(app).post('/api/advisors/apply').set(as(U.rejected)).send({ ...validApplication(U.rejected), sebi_document_key: undefined, sebi_document_url: bad });
      assert.equal(res.status, 400, bad);
    }
  });

  test('a key whose file does not exist is refused', async () => {
    storage.objectExists.mock.mockImplementation(async () => false);
    const res = await apply(U.applicant);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /could not find your uploaded certificate/);
    assert.equal(T.advisors.rows.some((r) => r.user_id === U.applicant.id), false);
  });

  test('staff and the owner get sebi_document_key; a value that is not a valid own-host reference yields null', async () => {
    const legacyOwn = T.advisors.add({ user_id: U.sub1.id, status: 'pending_approval', display_name: 'Legacy', sebi_document_url: `${API}/files/view/${own(U.sub1.id)}` });
    const legacyForeign = T.advisors.add({ user_id: U.sub2.id, status: 'pending_approval', display_name: 'Foreign', sebi_document_url: `http://98.87.150.151/api/files/view/${own(U.sub2.id)}` });
    const other = T.advisors.add({ user_id: U.other.id, status: 'pending_approval', display_name: 'Swapped', sebi_document_url: own(U.rejected.id) });
    const res = await request(app).get('/api/users/advisors?status=pending_approval').set(as(U.admin));
    const byName = Object.fromEntries(res.body.map((a) => [a.display_name, a.sebi_document_key]));
    assert.equal(byName['Pending One'], `private/${U.pending.id}/sebi-certificates/secret.pdf`);
    assert.equal(byName.Legacy, own(U.sub1.id));
    assert.equal(byName.Foreign, null);
    assert.equal(byName.Swapped, null, "another user's key is not this applicant's certificate");
    assert.ok(legacyOwn && legacyForeign && other);
    const mine = await request(app).get(`/api/users/advisors/${ADV.P.id}`).set(as(U.pending));
    assert.equal(mine.body.sebi_document_key, `private/${U.pending.id}/sebi-certificates/secret.pdf`);
  });

  test('profile photo: only our own public uploads; stored as a URL; removable; foreign URLs refused', async () => {
    const put = (body) => request(app).put('/api/advisors/me').set(as(U.advA)).send(body);
    assert.equal((await put({ profile_image_url: 'https://evil.example/x.png' })).status, 400);
    assert.equal((await put({ avatar_url: 'javascript:alert(1)' })).status, 400);
    assert.equal((await put({ profile_image_url: 'public/avatars/../../etc/passwd' })).status, 400);
    assert.equal((await put({ profile_image_url: `private/${U.advA.id}/sebi-certificates/a.pdf` })).status, 400, 'private files are not photos');
    const ok = await put({ profile_image_url: 'public/avatars/1234-me.png' });
    assert.equal(ok.status, 200);
    assert.match(advisorRow('A').profile_image_url, /^https:\/\/api\.example\.test\/api\/files\/view\/public\/avatars\/1234-me\.png$/);
    assert.equal((await put({ profile_image_url: `${API}/files/view/public/avatars/5678-me.png` })).status, 200);
    assert.equal((await put({ profile_image_url: null })).status, 200);
    assert.equal(advisorRow('A').profile_image_url, null);
  });
});

describe('review fixes', () => {
  test('refunds expose the advisor-facing reason only, never staff notes', async () => {
    const sub = T.subs.add({ user_id: U.sub1.id, advisor_id: ADV.A.id, plan_id: PLAN_A_BASIC, status: 'active' });
    T.refunds.add({ subscription_id: sub.id, status: 'rejected', reason: 'Not useful', admin_notes: 'INTERNAL: fraud suspected', refund_amount: 10 });
    const res = await request(app).get('/api/advisors/refunds').set(as(U.advA));
    assert.equal(res.body.length, 1);
    assert.ok(!JSON.stringify(res.body).includes('INTERNAL'));
    assert.ok(!('admin_notes' in res.body[0]));
  });

  test('staff list: newest first by default, status filter honoured', async () => {
    await request(app).get('/api/users/advisors?status=pending_approval').set(as(U.admin));
    const call = T.advisors.calls.filter(([m]) => m === 'findAll').at(-1)[1];
    assert.equal(call.where.status, 'pending_approval');
    assert.deepEqual(call.order[0], ['created_at', 'DESC']);
    await request(app).get('/api/advisors').set(as(U.admin));
    assert.deepEqual(T.advisors.calls.filter(([m]) => m === 'findAll').at(-1)[1].order[0], ['created_at', 'DESC']);
    // The public directory still ranks by popularity.
    await request(app).get('/api/advisors');
    assert.deepEqual(T.advisors.calls.filter(([m]) => m === 'findAll').at(-1)[1].order[0], ['follower_count', 'DESC']);
  });

  test('unpublishing and republishing does not notify again', async () => {
    const inFuture = new Date(Date.now() + 86400000);
    T.subs.add({ user_id: U.sub1.id, advisor_id: ADV.A.id, plan_id: PLAN_A_BASIC, status: 'active', end_date: inFuture });
    const created = await request(app).post('/api/advisors/posts').set(as(U.advA)).send({ title: 'Call one', content: 'x', status: 'published' });
    assert.equal(created.body.notified_subscribers, 1);
    assert.equal(bulkNotifications.length, 1);
    assert.ok(T.posts.rows[0].notified_at, 'recorded');
    await request(app).put(`/api/advisors/posts/${created.body.id}`).set(as(U.advA)).send({ status: 'draft' });
    const again = await request(app).put(`/api/advisors/posts/${created.body.id}`).set(as(U.advA)).send({ status: 'published' });
    assert.equal(again.body.notified_subscribers, 0);
    assert.equal(bulkNotifications.length, 1);
  });
});

describe('public per-stock recommendation tally', () => {
  const addRec = (action, extra = {}) => T.recs.add({ advisor_id: ADV.A.id, stock_symbol: 'TCS', action, status: 'active', reason: 'PRIVATE REASONING', ...extra });

  test('anonymous callers get counts and the latest call only', async () => {
    addRec('buy'); addRec('buy'); addRec('sell', { target_price: 4100 });
    const res = await request(app).get('/api/advisors/recommendations/stock/tcs/summary');
    assert.equal(res.status, 200);
    assert.deepEqual([res.body.symbol, res.body.buy, res.body.sell, res.body.hold, res.body.total], ['TCS', 2, 1, 0, 3]);
    assert.ok(res.body.latest && 'action' in res.body.latest);
    assert.ok(!JSON.stringify(res.body).includes('PRIVATE REASONING'));
    const q = T.recs.calls.filter(([m]) => m === 'findAll').at(-1)[1];
    assert.equal(q.where.status, 'active');
    assert.equal(q.include[0].where.status, 'approved', 'only approved advisors count');
    assert.ok(!q.attributes.includes('reason'));
  });

  test('empty tally and invalid symbols', async () => {
    const empty = await request(app).get('/api/advisors/recommendations/stock/NOPE/summary');
    assert.deepEqual([empty.status, empty.body.total, empty.body.latest], [200, 0, null]);
    assert.equal((await request(app).get('/api/advisors/recommendations/stock/a%20b%3Bdrop/summary')).status, 400);
  });
});
