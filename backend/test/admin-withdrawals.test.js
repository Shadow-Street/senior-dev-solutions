const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const { encryptBankValue } = require('../src/utils/bankCrypto');
const EmailService = require('../src/services/EmailService');

const HOUR = 3600 * 1000;

// BE-11: admin review of advisor withdrawals + lock-down of the generic payout CRUD.

const ADV = { id: '44444444-4444-4444-8444-444444444444', email: 'a@example.test', app_role: 'advisor', role: 'user', status: 'active' };
const PROFILE = { id: 'a0000000-0000-4000-8000-00000000000a', user_id: ADV.id, status: 'approved', display_name: 'Advisor A' };
const FULL_NUMBER = '123456789012';

let t; let audit; let notifs; const savedKey = process.env.BANK_DATA_KEY;
const as = (u) => ({ Authorization: bearer(u) });

beforeEach(() => {
  process.env.BANK_DATA_KEY = crypto.randomBytes(32).toString('base64');
  stubUserLookup({ [ADV.id]: ADV });
  t = {
    advisors: fakeTable([PROFILE]).install(mock, db.Advisor),
    banks: fakeTable().install(mock, db.AdvisorBankAccount),
    payouts: fakeTable().install(mock, db.PayoutRequest),
    // The advisor's approved commissions back the requests under test.
    commissions: fakeTable([{ advisor_id: PROFILE.id, status: 'approved', amount: 5000 }]).install(mock, db.CommissionTracking),
  };
  mock.method(EmailService, 'sendEmail', async () => true);
  t.advisors.rows[0].id = PROFILE.id;
  mock.method(db.sequelize, 'transaction', async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }));
  audit = []; notifs = [];
  mock.method(db.AuditLog, 'create', async (d) => { audit.push(d); return d; });
  mock.method(db.Notification, 'create', async (d) => { notifs.push(d); return { ...d, toJSON: () => d }; });
});
afterEach(() => {
  mock.restoreAll();
  if (savedKey === undefined) delete process.env.BANK_DATA_KEY; else process.env.BANK_DATA_KEY = savedKey;
});

const bankFor = (extra = {}) => t.banks.add({
  user_id: ADV.id, account_holder_name: 'Asha Rao', bank_name: 'HDFC Bank',
  account_number_encrypted: encryptBankValue(FULL_NUMBER, ADV.id), account_last4: '9012', ifsc: 'HDFC0001234',
  account_type: 'savings', is_primary: true, status: 'active', verified_at: null,
  destination_changed_at: new Date(Date.now() - 48 * HOUR), ...extra,
});
const withdrawal = (status = 'pending', extra = {}) => {
  const bank = extra.bank || bankFor();
  return t.payouts.add({
    user_id: ADV.id, entity_id: PROFILE.id, entity_type: 'advisor', amount: '1500.00', status, bank_account_id: bank.id,
    bank_snapshot: { bank_name: 'HDFC Bank', account_holder_name: 'Asha Rao', account_last4: '9012', ifsc: 'HDFC0001234' }, ...extra.row,
  });
};

const ACTIONS = [
  ['post', 'approve', {}],
  ['post', 'reject', { reason: 'Details do not match' }],
  ['post', 'mark-paid', { reference: 'UTR123456789' }],
  ['get', 'bank-details', undefined],
  ['get', '', undefined],
];

describe('admin-only access', () => {
  test('list without a token is 401', async () => {
    assert.equal((await request(app).get('/api/admin/withdrawals')).status, 401);
  });
  for (const [who, user] of [['advisor', ADV], ['user', USERS.user]]) {
    for (const [method, action, body] of ACTIONS) {
      test(`${who} cannot ${method.toUpperCase()} /${action || '(detail)'} (403, nothing changes)`, async () => {
        const w = withdrawal('approved');
        const req = request(app)[method](`/api/admin/withdrawals/${w.id}${action ? '/' + action : ''}`).set(as(user));
        const res = body === undefined ? await req : await req.send(body);
        assert.equal(res.status, 403);
        assert.equal(w.status, 'approved');
        assert.equal(audit.length, 0);
        assert.equal(notifs.length, 0);
      });
    }
    test(`${who} cannot list`, async () => {
      assert.equal((await request(app).get('/api/admin/withdrawals').set(as(user))).status, 403);
    });
  }
});

describe('listing', () => {
  test('filters are validated and applied; page size capped; no secrets in the payload', async () => {
    withdrawal('pending'); withdrawal('paid', { bank: bankFor() });
    const res = await request(app).get(`/api/admin/withdrawals?status=pending&advisor_id=${PROFILE.id}&limit=9999&from=2020-01-01&to=2099-01-01`).set(as(USERS.admin));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].advisor.display_name, 'Advisor A');
    const [, opts] = t.payouts.calls.find(([m]) => m === 'findAndCountAll');
    assert.equal(opts.limit, 100);
    assert.equal(opts.where.entity_type, 'advisor');
    const s = JSON.stringify(res.body);
    assert.ok(!s.includes(FULL_NUMBER) && !s.includes('encrypted') && !s.includes('v1:'));
    assert.equal(res.body.items[0].bank.masked_account_number, 'XXXXXXXX9012');
  });
  for (const q of ['status=bogus', 'advisor_id=nope', 'from=yesterday', 'to=xx', 'status[$ne]=x']) {
    test(`bad filter ${q} is 400`, async () => {
      assert.equal((await request(app).get(`/api/admin/withdrawals?${q}`).set(as(USERS.admin))).status, 400);
    });
  }
  test('detail 404s for an unknown id and for a non-advisor payout', async () => {
    const legacy = t.payouts.add({ user_id: ADV.id, entity_type: null, amount: 5, status: 'pending' });
    assert.equal((await request(app).get(`/api/admin/withdrawals/${legacy.id}`).set(as(USERS.admin))).status, 404);
    assert.equal((await request(app).get('/api/admin/withdrawals/not-a-uuid').set(as(USERS.admin))).status, 404);
  });
});

describe('state machine', () => {
  const run = (id, action) => {
    const bodies = { approve: {}, reject: { reason: 'Not eligible' }, 'mark-paid': { reference: 'UTR987654321' } };
    return request(app).post(`/api/admin/withdrawals/${id}/${action}`).set(as(USERS.admin)).send(bodies[action]);
  };
  const legal = {
    pending: { approve: 'approved', reject: 'rejected' },
    approved: { 'mark-paid': 'paid', reject: 'rejected' },
  };
  for (const status of ['pending', 'approved', 'paid', 'rejected', 'cancelled']) {
    for (const action of ['approve', 'reject', 'mark-paid']) {
      const expected = legal[status]?.[action];
      test(`${status} + ${action} -> ${expected ? expected : '409'}`, async () => {
        const w = withdrawal(status);
        const res = await run(w.id, action);
        if (expected) {
          assert.equal(res.status, 200, JSON.stringify(res.body));
          assert.equal(w.status, expected);
        } else {
          assert.equal(res.status, 409);
          assert.equal(w.status, status);
          assert.equal(notifs.length, 0, 'no notification for a refused change');
          assert.equal(audit.length, 0);
        }
      });
    }
  }

  test('full path pending -> approved -> paid records actor, timestamps, reference, audit and notifications', async () => {
    const bank = bankFor();
    const w = withdrawal('pending', { bank });
    const a = await request(app).post(`/api/admin/withdrawals/${w.id}/approve`).set(as(USERS.admin)).send({ admin_notes: 'KYC ok', status: 'paid', amount: 1 });
    assert.equal(a.status, 200);
    assert.equal(w.status, 'approved');
    assert.equal(w.processed_by, USERS.admin.id);
    assert.ok(w.approved_at);
    assert.equal(w.admin_notes, 'KYC ok');
    assert.equal(w.amount, '1500.00', 'amount is never taken from the body');

    const p = await request(app).post(`/api/admin/withdrawals/${w.id}/mark-paid`).set(as(USERS.superAdmin)).send({ reference: 'UTR987654321' });
    assert.equal(p.status, 200);
    assert.equal(w.status, 'paid');
    assert.equal(w.reference_number, 'UTR987654321');
    assert.ok(w.paid_at && w.processed_at);
    assert.ok(bank.verified_at, 'a paid transfer verifies the destination');

    assert.deepEqual(audit.map((x) => x.action), ['withdrawal.approve', 'withdrawal.mark_paid']);
    assert.deepEqual(audit.map((x) => x.user_id), [USERS.admin.id, USERS.superAdmin.id]);
    assert.deepEqual(notifs.map((n) => n.type), ['withdrawal_approved', 'withdrawal_paid']);
    assert.ok(notifs.every((n) => n.user_id === ADV.id));
    assert.match(notifs[1].message, /UTR987654321/);
    assert.ok(!JSON.stringify(audit).includes(FULL_NUMBER));
  });

  test('reject needs a reason, records it, and tells the advisor', async () => {
    const w = withdrawal('pending');
    for (const body of [{}, { reason: '' }, { reason: 'x' }, { reason: 123 }, { reason: 'y'.repeat(501) }]) {
      const bad = await request(app).post(`/api/admin/withdrawals/${w.id}/reject`).set(as(USERS.admin)).send(body);
      assert.equal(bad.status, 400);
    }
    assert.equal(w.status, 'pending');
    const ok = await request(app).post(`/api/admin/withdrawals/${w.id}/reject`).set(as(USERS.admin)).send({ reason: 'Bank details mismatch' });
    assert.equal(ok.status, 200);
    assert.equal(w.status, 'rejected');
    assert.equal(w.rejection_reason, 'Bank details mismatch');
    assert.ok(w.rejected_at);
    assert.equal(notifs[0].type, 'withdrawal_rejected');
    assert.match(notifs[0].message, /Bank details mismatch/);
  });

  test('mark-paid needs a plausible reference', async () => {
    const w = withdrawal('approved');
    for (const body of [{}, { reference: '' }, { reference: 'abc' }, { reference: 'has space 123' }, { reference: '<script>' }, { reference: 'x'.repeat(65) }, { reference: 123456 }]) {
      const bad = await request(app).post(`/api/admin/withdrawals/${w.id}/mark-paid`).set(as(USERS.admin)).send(body);
      assert.equal(bad.status, 400, JSON.stringify(body));
    }
    assert.equal(w.status, 'approved');
  });

  test('the transition reads the row under a lock inside a transaction', async () => {
    const w = withdrawal('pending');
    await request(app).post(`/api/admin/withdrawals/${w.id}/approve`).set(as(USERS.admin)).send({});
    const read = t.payouts.calls.find(([m, o]) => m === 'findOne' && o.lock === 'UPDATE');
    assert.ok(read && read.length);
  });

  test('a notification failure does not fail an already-committed approval', async () => {
    mock.method(db.Notification, 'create', async () => { throw new Error('boom'); });
    const w = withdrawal('pending');
    const res = await request(app).post(`/api/admin/withdrawals/${w.id}/approve`).set(as(USERS.admin)).send({});
    assert.equal(res.status, 200);
    assert.equal(w.status, 'approved');
  });
});

describe('bank-details reveal', () => {
  test('returns the decrypted number to an admin for an approved request, audits first, never caches', async () => {
    const w = withdrawal('approved');
    mock.method(db.AuditLog, 'create', async (d) => { audit.push(d); return d; });
    const res = await request(app).get(`/api/admin/withdrawals/${w.id}/bank-details`).set(as(USERS.admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.account_number, FULL_NUMBER);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(audit.length, 1);
    assert.equal(audit[0].action, 'withdrawal.bank_details_viewed');
    assert.equal(audit[0].user_id, USERS.admin.id);
    assert.ok(!JSON.stringify(audit).includes(FULL_NUMBER));
  });

  test('if the audit write fails nothing is revealed', async () => {
    const w = withdrawal('approved');
    mock.method(db.AuditLog, 'create', async () => { throw new Error('db down'); });
    const res = await request(app).get(`/api/admin/withdrawals/${w.id}/bank-details`).set(as(USERS.admin));
    assert.equal(res.status, 500);
    assert.ok(!JSON.stringify(res.body).includes(FULL_NUMBER));
  });

  for (const status of ['pending', 'paid', 'rejected', 'cancelled']) {
    test(`is refused for a ${status} request`, async () => {
      const w = withdrawal(status);
      const res = await request(app).get(`/api/admin/withdrawals/${w.id}/bank-details`).set(as(USERS.admin));
      assert.equal(res.status, 409);
      assert.ok(!JSON.stringify(res.body).includes(FULL_NUMBER));
      assert.equal(audit.length, 0);
    });
  }

  test('without BANK_DATA_KEY it is 503', async () => {
    const w = withdrawal('approved');
    delete process.env.BANK_DATA_KEY;
    const res = await request(app).get(`/api/admin/withdrawals/${w.id}/bank-details`).set(as(USERS.admin));
    assert.equal(res.status, 503);
  });

  test('an account that does not belong to the requesting advisor is not decrypted', async () => {
    const foreign = bankFor({ user_id: USERS.user.id });
    const w = withdrawal('approved', { bank: foreign });
    const res = await request(app).get(`/api/admin/withdrawals/${w.id}/bank-details`).set(as(USERS.admin));
    assert.equal(res.status, 404);
  });

  test('a ciphertext bound to a different user fails closed', async () => {
    const swapped = bankFor({ account_number_encrypted: encryptBankValue(FULL_NUMBER, USERS.user.id) });
    const w = withdrawal('approved', { bank: swapped });
    const res = await request(app).get(`/api/admin/withdrawals/${w.id}/bank-details`).set(as(USERS.admin));
    assert.equal(res.status, 500);
    assert.ok(!JSON.stringify(res.body).includes(FULL_NUMBER));
  });
});

describe('generic /api/revenue/payouts CRUD is locked down', () => {
  const OWNER = USERS.user;

  test('an owner cannot PUT their own status or amount', async () => {
    const mine = t.payouts.add({ user_id: OWNER.id, entity_type: null, amount: 100, status: 'pending' });
    for (const body of [{ status: 'completed' }, { status: 'paid' }, { status: 'approved' }, { amount: 999999 }, { status: 'pending', amount: 1 }, {}]) {
      const res = await request(app).put(`/api/revenue/payouts/${mine.id}`).set(as(OWNER)).send(body);
      assert.equal(res.status, 403, JSON.stringify(body));
    }
    assert.equal(mine.status, 'pending');
    assert.equal(mine.amount, 100);
    assert.equal(t.payouts.updates.length, 0);
  });

  test('an owner may cancel their own pending request, with other fields in the body ignored', async () => {
    const mine = t.payouts.add({ user_id: OWNER.id, entity_type: null, amount: 100, status: 'pending' });
    const res = await request(app).put(`/api/revenue/payouts/${mine.id}`).set(as(OWNER)).send({ status: 'cancelled', amount: 1, user_id: USERS.admin.id, reference_number: 'x' });
    assert.equal(res.status, 200);
    assert.equal(mine.status, 'cancelled');
    assert.equal(mine.amount, 100);
    assert.equal(mine.user_id, OWNER.id);
    assert.equal(mine.reference_number, undefined);
  });

  test("an owner cannot touch someone else's payout, and cannot cancel a processed one", async () => {
    const theirs = t.payouts.add({ user_id: ADV.id, entity_type: null, amount: 100, status: 'pending' });
    const done = t.payouts.add({ user_id: OWNER.id, entity_type: null, amount: 100, status: 'paid' });
    assert.equal((await request(app).put(`/api/revenue/payouts/${theirs.id}`).set(as(OWNER)).send({ status: 'cancelled' })).status, 404);
    assert.equal((await request(app).put(`/api/revenue/payouts/${done.id}`).set(as(OWNER)).send({ status: 'cancelled' })).status, 409);
    assert.equal(theirs.status, 'pending');
    assert.equal(done.status, 'paid');
  });

  test('delete is refused for everyone', async () => {
    const mine = t.payouts.add({ user_id: OWNER.id, entity_type: null, amount: 100, status: 'pending' });
    assert.equal((await request(app).delete(`/api/revenue/payouts/${mine.id}`).set(as(OWNER))).status, 403);
    assert.equal((await request(app).delete(`/api/revenue/payouts/${mine.id}`).set(as(USERS.superAdmin))).status, 403);
    assert.ok(t.payouts.rows.includes(mine));
  });

  test('staff can update a legacy row but only whitelisted fields, and not an advisor withdrawal', async () => {
    const legacy = t.payouts.add({ user_id: OWNER.id, entity_type: null, amount: 100, status: 'pending' });
    const res = await request(app).put(`/api/revenue/payouts/${legacy.id}`).set(as(USERS.admin)).send({ status: 'approved', amount: 1, user_id: ADV.id, admin_notes: 'ok' });
    assert.equal(res.status, 200);
    assert.equal(legacy.status, 'approved');
    assert.equal(legacy.amount, 100);
    assert.equal(legacy.user_id, OWNER.id);
    assert.equal(legacy.processed_by, USERS.admin.id);

    const adv = withdrawal('pending');
    const blocked = await request(app).put(`/api/revenue/payouts/${adv.id}`).set(as(USERS.admin)).send({ status: 'paid' });
    assert.equal(blocked.status, 409);
    assert.equal(adv.status, 'pending');
  });

  test('POST builds the row server-side: pending, own user, validated amount, balance enforced', async () => {
    mock.method(db.RevenueTransaction, 'sum', async () => 500);
    mock.method(db.User, 'findOne', async () => ({}));
    const res = await request(app).post('/api/revenue/payouts').set(as(OWNER)).send({
      amount: 200, payment_method: 'upi', payment_details: { upi: 'a@b' }, status: 'paid', user_id: ADV.id, reference_number: 'x',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const row = t.payouts.rows[0];
    assert.equal(row.user_id, OWNER.id);
    assert.equal(row.status, 'pending');
    assert.equal(row.entity_type, null);
    assert.equal(row.reference_number, undefined);
    const over = await request(app).post('/api/revenue/payouts/request').set(as(OWNER)).send({ amount: 301, payment_method: 'upi' });
    assert.equal(over.status, 400, 'earned 500, 200 already committed');
    const bad = await request(app).post('/api/revenue/payouts/request').set(as(OWNER)).send({ amount: -5, payment_method: 'upi' });
    assert.equal(bad.status, 400);
  });

  test('advisors cannot use the legacy create path to skip the bank-account flow', async () => {
    const res = await request(app).post('/api/revenue/payouts/request').set(as(ADV)).send({ amount: 10, payment_method: 'upi' });
    assert.equal(res.status, 403);
    assert.equal(t.payouts.rows.length, 0);
  });
});

describe('review safeguards (BE-11 review)', () => {
  test('approve and mark-paid are refused when the ledger no longer covers the request', async () => {
    const w = withdrawal('pending');            // 1500 requested
    t.commissions.rows[0].amount = 1000;         // commissions were corrected down after the request
    const a = await request(app).post(`/api/admin/withdrawals/${w.id}/approve`).set(as(USERS.admin)).send({});
    assert.equal(a.status, 409);
    assert.match(a.body.error, /no longer covers/i);
    assert.equal(w.status, 'pending');

    const p = withdrawal('approved');
    const paid = await request(app).post(`/api/admin/withdrawals/${p.id}/mark-paid`).set(as(USERS.admin)).send({ reference: 'UTR123456789' });
    assert.equal(paid.status, 409);
    assert.equal(p.status, 'approved');
    assert.equal(notifs.length, 0);
    assert.equal(audit.length, 0);

    // Rejecting is always allowed, whatever the ledger says.
    const rej = await request(app).post(`/api/admin/withdrawals/${w.id}/reject`).set(as(USERS.admin)).send({ reason: 'Balance changed' });
    assert.equal(rej.status, 200);
  });

  test('the balance re-check counts what is already paid or reserved', async () => {
    withdrawal('paid', { row: { amount: '4000.00' } });
    const w = withdrawal('pending');             // 4000 paid + 1500 open > 5000 earned
    const res = await request(app).post(`/api/admin/withdrawals/${w.id}/approve`).set(as(USERS.admin)).send({});
    assert.equal(res.status, 409);
  });

  test('bank-details is refused when the stored account no longer matches the request snapshot', async () => {
    const w = withdrawal('approved');
    t.banks.rows[0].account_last4 = '0000';
    const res = await request(app).get(`/api/admin/withdrawals/${w.id}/bank-details`).set(as(USERS.admin));
    assert.equal(res.status, 409);
    assert.ok(!JSON.stringify(res.body).includes(FULL_NUMBER));
    assert.equal(audit.length, 0);
  });

  test('the list and detail flag a recently changed payout destination', async () => {
    const fresh = withdrawal('pending', { bank: bankFor({ destination_changed_at: new Date(Date.now() - 2 * HOUR) }) });
    const week = withdrawal('pending', { bank: bankFor({ destination_changed_at: new Date(Date.now() - 3 * 24 * HOUR) }) });
    const old = withdrawal('pending', { bank: bankFor({ destination_changed_at: new Date(Date.now() - 30 * 24 * HOUR) }) });
    const list = await request(app).get('/api/admin/withdrawals').set(as(USERS.admin));
    const flag = (w) => list.body.items.find((i) => i.id === w.id).bank_change_flag;
    assert.deepEqual([flag(fresh), flag(week), flag(old)], ['under_24h', 'under_7d', null]);
    const detail = await request(app).get(`/api/admin/withdrawals/${fresh.id}`).set(as(USERS.admin));
    assert.equal(detail.body.bank_change_flag, 'under_24h');
    assert.ok(detail.body.bank_changed_at);
  });

  test('balance breakdown lists the approved commission rows that back the request', async () => {
    t.commissions.add({ advisor_id: PROFILE.id, status: 'approved', amount: 250, reference_id: 'pay_9', metadata: { gross_amount: 312.5, platform_fee: 62.5 } });
    t.commissions.add({ advisor_id: PROFILE.id, status: 'pending', amount: 40 });
    t.commissions.add({ advisor_id: 'someone-else', status: 'approved', amount: 99999 });
    const w = withdrawal('pending');
    const res = await request(app).get(`/api/admin/withdrawals/${w.id}/balance`).set(as(USERS.admin));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.earned, 5250);
    assert.equal(res.body.reserved_by_open_requests, 1500);
    assert.equal(res.body.covered, true);
    assert.equal(res.body.commissions.length, 2);
    assert.ok(res.body.commissions.every((c) => c.status === 'approved'));
    assert.equal(res.body.commissions.find((c) => c.payment_reference === 'pay_9').gross_amount, 312.5);
    assert.equal(res.body.pending_commissions_amount, 40);
    assert.equal(res.body.pending_commissions_count, 1);
  });

  test('balance breakdown is admin-only', async () => {
    const w = withdrawal('pending');
    assert.equal((await request(app).get(`/api/admin/withdrawals/${w.id}/balance`).set(as(ADV))).status, 403);
    assert.equal((await request(app).get(`/api/admin/withdrawals/${w.id}/balance`)).status, 401);
  });
});

describe('legacy payout entities and staff updates (BE-11 review)', () => {
  const OWNER = USERS.user;
  const FIN = { id: 'f0000000-0000-4000-8000-00000000000f', user_id: OWNER.id };
  const setup = () => {
    mock.method(db.RevenueTransaction, 'sum', async () => 1000);
    mock.method(db.User, 'findOne', async () => ({}));
    t.fin = fakeTable([FIN]).install(mock, db.FinInfluencer);
    t.fin.rows[0].id = FIN.id;
  };

  test('a finfluencer payout is stamped with the caller\'s own finfluencer row, never a client id', async () => {
    setup();
    const res = await request(app).post('/api/revenue/payouts').set(as(OWNER)).send({
      amount: 100, payment_method: 'bank_transfer', entity_type: 'finfluencer', entity_id: 'd0000000-0000-4000-8000-0000000000dd',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const row = t.payouts.rows[0];
    assert.equal(row.entity_type, 'finfluencer');
    assert.equal(row.entity_id, FIN.id);
    assert.equal(row.user_id, OWNER.id);
  });

  test('no finfluencer profile, or a type users may not file under, is 403', async () => {
    setup();
    const noProfile = await request(app).post('/api/revenue/payouts').set(as(USERS.admin)).send({ amount: 10, payment_method: 'upi', entity_type: 'finfluencer' });
    const event = await request(app).post('/api/revenue/payouts').set(as(OWNER)).send({ amount: 10, payment_method: 'upi', entity_type: 'event', entity_id: 'x' });
    const advisor = await request(app).post('/api/revenue/payouts').set(as(OWNER)).send({ amount: 10, payment_method: 'upi', entity_type: 'advisor' });
    assert.deepEqual([noProfile.status, event.status, advisor.status], [403, 403, 403]);
    assert.equal(t.payouts.rows.length, 0);
  });

  test('staff PUT: "processed" and other unknown statuses are 400', async () => {
    const legacy = t.payouts.add({ user_id: OWNER.id, entity_type: 'finfluencer', amount: 100, status: 'approved' });
    for (const status of ['processed', 'processing', 'completed', 'failed', 'bogus']) {
      const res = await request(app).put(`/api/revenue/payouts/${legacy.id}`).set(as(USERS.admin)).send({ status });
      assert.equal(res.status, 400, status);
    }
    assert.equal(legacy.status, 'approved');
  });

  test('staff PUT follows the state machine, writes an audit row and records the reference', async () => {
    const legacy = t.payouts.add({ user_id: OWNER.id, entity_type: 'finfluencer', amount: 100, status: 'pending' });
    const skip = await request(app).put(`/api/revenue/payouts/${legacy.id}`).set(as(USERS.admin)).send({ status: 'paid' });
    assert.equal(skip.status, 409, 'pending cannot jump to paid');
    const ok1 = await request(app).put(`/api/revenue/payouts/${legacy.id}`).set(as(USERS.admin)).send({ status: 'approved', admin_notes: 'ok' });
    const ok2 = await request(app).put(`/api/revenue/payouts/${legacy.id}`).set(as(USERS.admin)).send({ status: 'paid', reference_number: 'UTR1', amount: 1 });
    assert.deepEqual([ok1.status, ok2.status], [200, 200]);
    assert.equal(legacy.status, 'paid');
    assert.equal(legacy.reference_number, 'UTR1');
    assert.equal(Number(legacy.amount), 100);
    assert.ok(legacy.paid_at);
    assert.deepEqual(audit.map((a) => a.action), ['payout.approved', 'payout.paid']);
    assert.equal(notifs.length, 0, 'legacy screens send their own notification');
  });

  test('staff notes-only update is transactional and audited', async () => {
    const legacy = t.payouts.add({ user_id: OWNER.id, entity_type: null, amount: 100, status: 'pending' });
    const res = await request(app).put(`/api/revenue/payouts/${legacy.id}`).set(as(USERS.admin)).send({ admin_notes: 'checking' });
    assert.equal(res.status, 200);
    assert.equal(legacy.admin_notes, 'checking');
    assert.equal(audit[0].action, 'payout.update_notes');
    const empty = await request(app).put(`/api/revenue/payouts/${legacy.id}`).set(as(USERS.admin)).send({});
    assert.equal(empty.status, 400);
  });
});
