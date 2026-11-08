const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const EmailService = require('../src/services/EmailService');

const HOUR = 3600 * 1000;

// BE-11: advisor bank accounts + withdrawals (advisor side).

const ADV_A = { id: '44444444-4444-4444-8444-444444444444', email: 'a@example.test', app_role: 'advisor', role: 'user', status: 'active' };
const ADV_B = { id: '55555555-5555-4555-8555-555555555555', email: 'b@example.test', app_role: 'advisor', role: 'user', status: 'active' };
const ADV_NOPROFILE = { id: '66666666-6666-4666-8666-666666666666', email: 'c@example.test', app_role: 'advisor', role: 'user', status: 'active' };
const PROFILE_A = { id: 'a0000000-0000-4000-8000-00000000000a', user_id: ADV_A.id, status: 'approved', display_name: 'Advisor A' };
const PROFILE_B = { id: 'b0000000-0000-4000-8000-00000000000b', user_id: ADV_B.id, status: 'approved', display_name: 'Advisor B' };

const FULL_NUMBER = '123456789012';
const VALID_ACCOUNT = { account_holder_name: 'Asha Rao', bank_name: 'HDFC Bank', ifsc: 'HDFC0001234', account_type: 'savings', account_number: FULL_NUMBER };

let t; // fake tables
let auditCalls;
let notifCalls;
let emails;
const savedKey = process.env.BANK_DATA_KEY;

function setup({ commissionTotal = 5000 } = {}) {
  stubUserLookup({ [ADV_A.id]: ADV_A, [ADV_B.id]: ADV_B, [ADV_NOPROFILE.id]: ADV_NOPROFILE });
  t = {
    advisors: fakeTable([PROFILE_A, PROFILE_B]).install(mock, db.Advisor),
    banks: fakeTable().install(mock, db.AdvisorBankAccount),
    payouts: fakeTable().install(mock, db.PayoutRequest),
    commissions: fakeTable([{ advisor_id: PROFILE_A.id, status: 'approved', amount: commissionTotal }, { advisor_id: PROFILE_A.id, status: 'pending', amount: 99999 }, { advisor_id: PROFILE_B.id, status: 'approved', amount: 700 }]).install(mock, db.CommissionTracking),
  };
  // Keep the ids stable for assertions on the profile rows.
  t.advisors.rows[0].id = PROFILE_A.id; t.advisors.rows[1].id = PROFILE_B.id;
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
  auditCalls = []; notifCalls = []; emails = [];
  mock.method(EmailService, 'sendEmail', async (to, subject, html) => { emails.push({ to, subject, html }); return true; });
  mock.method(db.AuditLog, 'create', async (d) => { auditCalls.push(d); return d; });
  mock.method(db.Notification, 'create', async (d) => { notifCalls.push(d); return { ...d, toJSON: () => d }; });
}

beforeEach(() => {
  process.env.BANK_DATA_KEY = crypto.randomBytes(32).toString('base64');
  setup();
});
afterEach(() => {
  mock.restoreAll();
  if (savedKey === undefined) delete process.env.BANK_DATA_KEY; else process.env.BANK_DATA_KEY = savedKey;
});

const as = (user) => ({ Authorization: bearer(user) });
const addAccount = (owner, extra = {}) => t.banks.add({
  user_id: owner.id, account_holder_name: 'Asha Rao', bank_name: 'HDFC Bank', account_number_encrypted: 'v1:xx',
  account_last4: '9012', ifsc: 'HDFC0001234', account_type: 'savings', is_primary: true, status: 'active', verified_at: null,
  destination_changed_at: new Date(Date.now() - 48 * HOUR), ...extra,
});

describe('access control', () => {
  for (const path of ['/api/advisors/bank-accounts', '/api/advisors/withdrawals', '/api/advisors/withdrawals/summary']) {
    test(`GET ${path} without a token is 401`, async () => {
      assert.equal((await request(app).get(path)).status, 401);
    });
    for (const [who, user] of [['user', USERS.user], ['admin', USERS.admin], ['super admin', USERS.superAdmin]]) {
      test(`GET ${path} as ${who} is 403`, async () => {
        const res = await request(app).get(path).set(as(user));
        assert.equal(res.status, 403);
      });
    }
  }

  test('an advisor-role user with no advisors row is 403', async () => {
    const res = await request(app).get('/api/advisors/bank-accounts').set(as(ADV_NOPROFILE));
    assert.equal(res.status, 403);
  });

  test('the role is checked even when the caller owns an advisors row (e.g. a demoted or admin account)', async () => {
    t.advisors.add({ user_id: USERS.user.id, status: 'approved' });
    t.advisors.add({ user_id: USERS.admin.id, status: 'approved' });
    for (const user of [USERS.user, USERS.admin]) {
      const a = await request(app).get('/api/advisors/bank-accounts').set(as(user));
      const w = await request(app).get('/api/advisors/withdrawals/summary').set(as(user));
      assert.deepEqual([a.status, w.status], [403, 403]);
    }
  });

  test('a non-advisor cannot add a bank account or request a withdrawal', async () => {
    const a = await request(app).post('/api/advisors/bank-accounts').set(as(USERS.user)).send(VALID_ACCOUNT);
    const w = await request(app).post('/api/advisors/withdrawals').set(as(USERS.user)).send({ amount: 10 });
    assert.equal(a.status, 403);
    assert.equal(w.status, 403);
    assert.equal(t.banks.rows.length, 0);
    assert.equal(t.payouts.rows.length, 0);
  });
});

describe('bank accounts', () => {
  test('create stores ciphertext, returns only masked data, and takes the owner from the session', async () => {
    const res = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A))
      .send({ ...VALID_ACCOUNT, user_id: ADV_B.id, is_primary: false, status: 'removed', verified_at: '2020-01-01', account_last4: '0000' });
    assert.equal(res.status, 201);
    const stored = t.banks.rows[0];
    assert.equal(stored.user_id, ADV_A.id);
    assert.equal(stored.status, 'active');
    assert.equal(stored.verified_at, null);
    assert.equal(stored.account_last4, '9012');
    assert.equal(stored.is_primary, true, 'first account becomes primary');
    assert.ok(stored.account_number_encrypted.startsWith('v1:'));
    assert.ok(!stored.account_number_encrypted.includes(FULL_NUMBER));

    const body = JSON.stringify(res.body);
    assert.ok(!body.includes(FULL_NUMBER), 'full number must not appear in the response');
    assert.ok(!body.includes('account_number_encrypted'));
    assert.ok(!body.includes(stored.account_number_encrypted));
    assert.equal(res.body.masked_account_number, 'XXXXXXXX9012');
    assert.equal(res.body.account_last4, '9012');
  });

  test('no response from list/update/primary leaks the number or ciphertext', async () => {
    const acc = (await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT)).body;
    const second = (await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send({ ...VALID_ACCOUNT, account_number: '999988887777', ifsc: 'ICIC0000001' })).body;
    const responses = [
      await request(app).get('/api/advisors/bank-accounts').set(as(ADV_A)),
      await request(app).put(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A)).send({ bank_name: 'HDFC Bank Ltd' }),
      await request(app).post(`/api/advisors/bank-accounts/${second.id}/primary`).set(as(ADV_A)),
    ];
    for (const r of responses) {
      assert.equal(r.status, 200);
      const s = JSON.stringify(r.body);
      assert.ok(!s.includes(FULL_NUMBER) && !s.includes('999988887777'));
      assert.ok(!s.includes('encrypted') && !s.includes('v1:'));
    }
  });

  test('missing BANK_DATA_KEY: create and number edits return 503 and nothing is stored; listing still works', async () => {
    const acc = addAccount(ADV_A);
    delete process.env.BANK_DATA_KEY;
    const created = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT);
    assert.equal(created.status, 503);
    assert.equal(t.banks.rows.length, 1, 'no new row');
    const edited = await request(app).put(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A)).send({ account_number: '555566667777' });
    assert.equal(edited.status, 503);
    assert.equal(acc.account_number_encrypted, 'v1:xx', 'row untouched');
    const list = await request(app).get('/api/advisors/bank-accounts').set(as(ADV_A));
    assert.equal(list.status, 200);
  });

  test('a malformed key is treated as missing', async () => {
    process.env.BANK_DATA_KEY = 'not-a-real-key';
    const res = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT);
    assert.equal(res.status, 503);
  });

  for (const [label, patch, field] of [
    ['bad IFSC', { ifsc: 'HDFC1001234' }, 'ifsc'],
    ['short account number', { account_number: '12345' }, 'account_number'],
    ['long account number', { account_number: '1'.repeat(19) }, 'account_number'],
    ['bad type', { account_type: 'nri' }, 'account_type'],
    ['empty holder', { account_holder_name: '' }, 'account_holder_name'],
  ]) {
    test(`create rejects ${label} with 400`, async () => {
      const res = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send({ ...VALID_ACCOUNT, ...patch });
      assert.equal(res.status, 400);
      assert.ok(res.body.details[field]);
      assert.equal(t.banks.rows.length, 0);
    });
  }

  test('only own accounts are listed', async () => {
    addAccount(ADV_A, { bank_name: 'A Bank' });
    addAccount(ADV_B, { bank_name: 'B Bank' });
    addAccount(ADV_A, { bank_name: 'Gone', status: 'removed' });
    const res = await request(app).get('/api/advisors/bank-accounts').set(as(ADV_A));
    assert.deepEqual(res.body.map((a) => a.bank_name), ['A Bank']);
  });

  test("another advisor's account cannot be updated, deleted or made primary (404, unchanged)", async () => {
    const theirs = addAccount(ADV_B, { is_primary: false });
    const before = { ...theirs };
    const put = await request(app).put(`/api/advisors/bank-accounts/${theirs.id}`).set(as(ADV_A)).send({ bank_name: 'Hijack Bank', ifsc: 'HDFC0009999' });
    const del = await request(app).delete(`/api/advisors/bank-accounts/${theirs.id}`).set(as(ADV_A));
    const prim = await request(app).post(`/api/advisors/bank-accounts/${theirs.id}/primary`).set(as(ADV_A));
    assert.deepEqual([put.status, del.status, prim.status], [404, 404, 404]);
    assert.equal(theirs.bank_name, before.bank_name);
    assert.equal(theirs.status, 'active');
    assert.equal(theirs.is_primary, false);
    assert.equal(t.banks.updates.length, 0);
  });

  test('update whitelists fields and re-verifies on a changed destination', async () => {
    const acc = addAccount(ADV_A, { verified_at: new Date('2025-01-01') });
    const res = await request(app).put(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A))
      .send({ bank_name: 'Axis Bank', user_id: ADV_B.id, status: 'disabled', is_primary: false, verified_at: '2030-01-01', account_number_encrypted: 'evil', ifsc: 'UTIB0000001' });
    assert.equal(res.status, 200);
    assert.equal(acc.user_id, ADV_A.id);
    assert.equal(acc.status, 'active');
    assert.equal(acc.is_primary, true);
    assert.equal(acc.account_number_encrypted, 'v1:xx');
    assert.equal(acc.bank_name, 'Axis Bank');
    assert.equal(acc.ifsc, 'UTIB0000001');
    assert.equal(acc.verified_at, null);
  });

  test('update with nothing editable is 400', async () => {
    const acc = addAccount(ADV_A);
    const res = await request(app).put(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A)).send({ status: 'removed' });
    assert.equal(res.status, 400);
  });

  test('delete is a soft delete and promotes another account to primary', async () => {
    const first = addAccount(ADV_A, { is_primary: true });
    const second = addAccount(ADV_A, { is_primary: false, account_last4: '1111' });
    const res = await request(app).delete(`/api/advisors/bank-accounts/${first.id}`).set(as(ADV_A));
    assert.equal(res.status, 200);
    assert.equal(first.status, 'removed');
    assert.equal(first.is_primary, false);
    assert.equal(second.is_primary, true);
    assert.ok(t.banks.rows.includes(first), 'row is kept for payout history');
  });

  test('an account with a withdrawal in progress cannot be deleted or have its destination changed', async () => {
    const acc = addAccount(ADV_A);
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', bank_account_id: acc.id, amount: 100, status: 'approved' });
    const del = await request(app).delete(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A));
    const put = await request(app).put(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A)).send({ ifsc: 'UTIB0000001' });
    assert.equal(del.status, 409);
    assert.equal(put.status, 409);
    assert.equal(acc.status, 'active');
    assert.equal(acc.ifsc, 'HDFC0001234');
  });

  test('set-primary leaves exactly one primary', async () => {
    const a = addAccount(ADV_A, { is_primary: true });
    const b = addAccount(ADV_A, { is_primary: false });
    const res = await request(app).post(`/api/advisors/bank-accounts/${b.id}/primary`).set(as(ADV_A));
    assert.equal(res.status, 200);
    assert.equal(a.is_primary, false);
    assert.equal(b.is_primary, true);
  });

  test('a sixth account and a duplicate are refused', async () => {
    for (let i = 0; i < 5; i++) addAccount(ADV_A, { account_last4: String(1000 + i), ifsc: 'HDFC0001234', is_primary: i === 0 });
    const sixth = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send({ ...VALID_ACCOUNT, account_number: '222233334444' });
    assert.equal(sixth.status, 409);
    t.banks.rows.length = 1;
    t.banks.rows[0].account_last4 = '9012';
    const dup = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT);
    assert.equal(dup.status, 409);
  });

  test('a malformed id is 404, not a query', async () => {
    const res = await request(app).delete('/api/advisors/bank-accounts/not-a-uuid').set(as(ADV_A));
    assert.equal(res.status, 404);
  });
});

describe('withdrawals (advisor)', () => {
  test('summary: available = approved commissions - open - paid, from the database', async () => {
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 1000, status: 'paid' });
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 500, status: 'pending' });
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 300, status: 'rejected' });
    t.payouts.add({ user_id: ADV_B.id, entity_type: 'advisor', amount: 4000, status: 'paid' });
    const res = await request(app).get('/api/advisors/withdrawals/summary').set(as(ADV_A));
    assert.equal(res.status, 200);
    assert.equal(res.body.earned, 5000, 'pending commissions are not withdrawable');
    assert.equal(res.body.available, 3500);
    assert.equal(res.body.pending_withdrawals, 500);
    assert.equal(res.body.total_withdrawn, 1000);
    assert.equal(res.body.has_open_request, true);
  });

  test('happy path: row is built server-side, audited and the advisor is notified', async () => {
    const acc = addAccount(ADV_A);
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({
      amount: '1500.50', user_id: ADV_B.id, status: 'paid', entity_id: PROFILE_B.id, entity_type: 'finfluencer',
      reference_number: 'FAKE', approved_at: '2020-01-01', processed_by: ADV_B.id, payment_details: { account: 'x' },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const row = t.payouts.rows[0];
    assert.equal(row.user_id, ADV_A.id);
    assert.equal(row.entity_id, PROFILE_A.id);
    assert.equal(row.entity_type, 'advisor');
    assert.equal(row.status, 'pending');
    assert.equal(Number(row.amount), 1500.5);
    assert.equal(row.bank_account_id, acc.id);
    assert.equal(row.reference_number, undefined);
    assert.equal(row.approved_at, undefined);
    assert.equal(row.processed_by, undefined);
    assert.equal(row.payment_details, null);
    assert.deepEqual(Object.keys(row.bank_snapshot).sort(), ['account_holder_name', 'account_last4', 'bank_name', 'ifsc']);

    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].action, 'withdrawal.request');
    assert.equal(notifCalls.length, 1);
    assert.equal(notifCalls[0].user_id, ADV_A.id);
    assert.equal(notifCalls[0].type, 'withdrawal_pending');
    assert.equal(res.body.bank.masked_account_number, 'XXXXXXXX9012');
  });

  test('an amount above the available balance is refused', async () => {
    addAccount(ADV_A);
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 5000.01 });
    assert.equal(res.status, 400);
    assert.equal(res.body.available, 5000);
    assert.equal(t.payouts.rows.length, 0);
    const ok = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 5000 });
    assert.equal(ok.status, 201);
  });

  test('balance already reserved by an open request cannot be requested again', async () => {
    addAccount(ADV_A);
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 4800, status: 'rejected' });
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 3000, status: 'paid' });
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 2500 });
    assert.equal(res.status, 400);
    assert.equal(res.body.available, 2000);
  });

  for (const bad of [0, -10, 'abc', '', null, '10.999', '1e3', {}, [5]]) {
    test(`amount ${JSON.stringify(bad)} is 400`, async () => {
      addAccount(ADV_A);
      const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: bad });
      assert.equal(res.status, 400);
      assert.equal(t.payouts.rows.length, 0);
    });
  }

  test('a bank account is required', async () => {
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /bank account/i);
  });

  test("another advisor's bank account cannot be used", async () => {
    addAccount(ADV_A);
    const theirs = addAccount(ADV_B);
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10, bank_account_id: theirs.id });
    assert.equal(res.status, 400);
    assert.equal(t.payouts.rows.length, 0);
  });

  test('a removed or disabled account cannot be used', async () => {
    const gone = addAccount(ADV_A, { status: 'removed', is_primary: false });
    addAccount(ADV_A, { status: 'disabled', is_primary: true });
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10, bank_account_id: gone.id });
    assert.equal(res.status, 400);
  });

  test('only one open request at a time', async () => {
    addAccount(ADV_A);
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 10, status: 'pending' });
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    assert.equal(res.status, 409);
    assert.equal(t.payouts.rows.length, 1);
  });

  test('an advisor whose profile is not approved cannot withdraw', async () => {
    addAccount(ADV_A);
    t.advisors.rows[0].status = 'pending_approval';
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    assert.equal(res.status, 403);
  });

  test('the request and the balance read happen under a row lock', async () => {
    addAccount(ADV_A);
    await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    const lockedRead = t.advisors.calls.find(([m, o]) => m === 'findOne' && o.lock === 'UPDATE');
    assert.ok(lockedRead, 'advisor row locked inside the transaction');
  });

  test('listing is confined to the caller, status-filterable and page-capped', async () => {
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 10, status: 'pending' });
    t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 20, status: 'paid' });
    t.payouts.add({ user_id: ADV_B.id, entity_type: 'advisor', amount: 30, status: 'pending' });
    const all = await request(app).get('/api/advisors/withdrawals?user_id=' + ADV_B.id + '&limit=100000').set(as(ADV_A));
    assert.equal(all.status, 200);
    assert.equal(all.body.total, 2);
    assert.deepEqual(all.body.items.map((i) => i.amount).sort(), [10, 20]);
    const [, opts] = t.payouts.calls.find(([m]) => m === 'findAndCountAll');
    assert.equal(opts.limit, 100);
    const paid = await request(app).get('/api/advisors/withdrawals?status=paid').set(as(ADV_A));
    assert.equal(paid.body.items.length, 1);
    const bad = await request(app).get('/api/advisors/withdrawals?status[$ne]=x').set(as(ADV_A));
    assert.equal(bad.status, 400);
  });

  test("another advisor's request is a 404 to read and to cancel", async () => {
    const theirs = t.payouts.add({ user_id: ADV_B.id, entity_type: 'advisor', amount: 30, status: 'pending' });
    const get = await request(app).get(`/api/advisors/withdrawals/${theirs.id}`).set(as(ADV_A));
    const cancel = await request(app).post(`/api/advisors/withdrawals/${theirs.id}/cancel`).set(as(ADV_A));
    assert.deepEqual([get.status, cancel.status], [404, 404]);
    assert.equal(theirs.status, 'pending');
    assert.equal(notifCalls.length, 0);
  });

  test('cancel own pending request: status, timestamp, audit and notification', async () => {
    const mine = t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 30, status: 'pending' });
    const res = await request(app).post(`/api/advisors/withdrawals/${mine.id}/cancel`).set(as(ADV_A));
    assert.equal(res.status, 200);
    assert.equal(mine.status, 'cancelled');
    assert.ok(mine.cancelled_at);
    assert.equal(auditCalls[0].action, 'withdrawal.cancel');
    assert.equal(notifCalls[0].type, 'withdrawal_cancelled');
  });

  for (const status of ['approved', 'paid', 'rejected', 'cancelled']) {
    test(`cancelling a ${status} request is 409`, async () => {
      const mine = t.payouts.add({ user_id: ADV_A.id, entity_type: 'advisor', amount: 30, status });
      const res = await request(app).post(`/api/advisors/withdrawals/${mine.id}/cancel`).set(as(ADV_A));
      assert.equal(res.status, 409);
      assert.equal(mine.status, status);
    });
  }
});

describe('24-hour hold on new or changed destinations (BE-11 review)', () => {
  test('a freshly added account cannot be used for a withdrawal until 24h have passed', async () => {
    const created = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT);
    assert.equal(created.status, 201);
    assert.equal(created.body.cooling_off, true);
    assert.ok(created.body.usable_from);
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /recently/i);
    assert.ok(res.body.usable_from);
    assert.equal(t.payouts.rows.length, 0);

    // 25 hours later the same account works.
    t.banks.rows[0].destination_changed_at = new Date(Date.now() - 25 * HOUR);
    const ok = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
  });

  test('the hold applies to an explicitly chosen account too', async () => {
    const fresh = addAccount(ADV_A, { destination_changed_at: new Date() });
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10, bank_account_id: fresh.id });
    assert.equal(res.status, 409);
  });

  test('editing the number, IFSC or holder restarts the hold and unverifies; editing the bank name does not', async () => {
    const acc = addAccount(ADV_A, { verified_at: new Date('2025-01-01') });
    const before = acc.destination_changed_at;
    await request(app).put(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A)).send({ bank_name: 'HDFC Bank Ltd' });
    assert.equal(acc.destination_changed_at, before);
    assert.ok(acc.verified_at);
    await request(app).put(`/api/advisors/bank-accounts/${acc.id}`).set(as(ADV_A)).send({ account_number: '555566667777' });
    assert.ok(acc.destination_changed_at > before);
    assert.equal(acc.verified_at, null);
    const res = await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    assert.equal(res.status, 409);
  });

  test('the account is read under a row lock when a withdrawal is created', async () => {
    addAccount(ADV_A);
    await request(app).post('/api/advisors/withdrawals').set(as(ADV_A)).send({ amount: 10 });
    const locked = t.banks.calls.find(([m, o]) => m === 'findOne' && o.lock === 'UPDATE' && o.where.is_primary === true);
    assert.ok(locked, 'bank account row locked while the snapshot is taken');
  });
});

describe('advisor is told when payout details change (BE-11 review)', () => {
  const types = () => notifCalls.map((n) => n.type);

  test('add, edit, make-primary and remove each notify in-app and by email', async () => {
    const first = (await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT)).body;
    const second = (await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send({ ...VALID_ACCOUNT, account_number: '999988887777', ifsc: 'ICIC0000001', bank_name: 'ICICI Bank' })).body;
    await request(app).put(`/api/advisors/bank-accounts/${first.id}`).set(as(ADV_A)).send({ ifsc: 'UTIB0000001' });
    await request(app).post(`/api/advisors/bank-accounts/${second.id}/primary`).set(as(ADV_A));
    await request(app).delete(`/api/advisors/bank-accounts/${first.id}`).set(as(ADV_A));
    assert.deepEqual(types(), ['bank_account_added', 'bank_account_added', 'bank_account_updated', 'bank_account_primary', 'bank_account_removed']);
    assert.ok(notifCalls.every((n) => n.user_id === ADV_A.id));
    assert.equal(emails.length, 5);
    assert.ok(emails.every((e) => e.to === ADV_A.email));
  });

  test('neither the notification nor the email ever contains the account number', async () => {
    await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT);
    const blob = JSON.stringify([notifCalls, emails]);
    assert.ok(!blob.includes(FULL_NUMBER));
    assert.ok(blob.includes('9012'));
  });

  test('a failing mail service or notification never fails the change', async () => {
    mock.method(EmailService, 'sendEmail', async () => { throw new Error('smtp down'); });
    mock.method(db.Notification, 'create', async () => { throw new Error('db down'); });
    const res = await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send(VALID_ACCOUNT);
    assert.equal(res.status, 201);
    assert.equal(t.banks.rows.length, 1);
  });

  test('nothing is sent when the change is refused', async () => {
    const theirs = addAccount(ADV_B);
    await request(app).put(`/api/advisors/bank-accounts/${theirs.id}`).set(as(ADV_A)).send({ bank_name: 'x y' });
    await request(app).post('/api/advisors/bank-accounts').set(as(ADV_A)).send({ ...VALID_ACCOUNT, ifsc: 'bad' });
    assert.equal(notifCalls.length, 0);
    assert.equal(emails.length, 0);
  });
});

