const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('./helpers');
const { fakeTable } = require('./fakeModels');
const C = require('../src/services/CommissionService');

const PLAN = { id: 'p1', advisor_id: 'adv-1' };
let t;
beforeEach(() => {
  t = {
    advisors: fakeTable([{ id: 'adv-1', user_id: 'user-adv' }]).install(mock, db.Advisor),
    commissions: fakeTable().install(mock, db.CommissionTracking),
    settings: fakeTable().install(mock, db.CommissionSettings),
    platform: fakeTable().install(mock, db.PlatformSetting),
  };
  t.advisors.rows[0].id = 'adv-1';
});
afterEach(() => mock.restoreAll());

const pay = (over = {}) => C.recordAdvisorCommission({ plan: PLAN, payerUserId: 'payer', paidAmount: 1000, paymentId: 'pay_1', subscriptionId: 's1', ...over });

test('creates a pending row with a server-computed net amount (default 20%)', async () => {
  const row = await pay();
  assert.equal(row.status, 'pending');
  assert.equal(row.amount, 800);
  assert.equal(row.advisor_id, 'adv-1');
  assert.equal(row.user_id, 'user-adv');
  assert.equal(row.reference_id, 'pay_1');
  assert.deepEqual([row.metadata.gross_amount, row.metadata.platform_fee, row.metadata.platform_commission_rate], [1000, 200, 20]);
});

test('commission_settings overrides the global setting and the default; junk rates fall back', async () => {
  t.platform.add({ key: 'global_commission_rate', value: '30' });
  assert.equal((await pay({ paymentId: 'a' })).amount, 700);
  t.settings.add({ entity_type: 'advisor', is_active: true, commission_percent: '10' });
  assert.equal((await pay({ paymentId: 'b' })).amount, 900);
  t.settings.rows[0].commission_percent = '250';
  assert.equal((await pay({ paymentId: 'c' })).amount, 700, 'out-of-range falls through to the global setting');
});

test('idempotent on the payment id, including the unique-violation race', async () => {
  const first = await pay();
  const second = await pay();
  assert.equal(first.id, second.id);
  assert.equal(t.commissions.rows.length, 1);

  // Lost the race: the first lookup finds nothing, the insert hits the unique
  // reference, and the winner's row is returned instead of a duplicate.
  const winner = t.commissions.rows[0];
  let lookups = 0;
  mock.method(db.CommissionTracking, 'findOne', async () => (++lookups === 1 ? null : winner));
  mock.method(db.CommissionTracking, 'create', async () => { const e = new Error('dup'); e.name = 'SequelizeUniqueConstraintError'; throw e; });
  const raced = await pay({ paymentId: 'pay_2' });
  assert.equal(raced, winner);
});

test('non-advisor plans, missing payment ids and zero amounts create nothing', async () => {
  assert.equal(await pay({ plan: { id: 'x', advisor_id: null } }), null);
  assert.equal(await pay({ paymentId: '' }), null);
  assert.equal(await pay({ paidAmount: 0 }), null);
  assert.equal(await pay({ plan: { id: 'x', advisor_id: 'missing-advisor' } }), null);
  assert.equal(t.commissions.rows.length, 0);
});

test('the safe wrapper never throws into a verified payment', async () => {
  mock.method(db.Advisor, 'findByPk', async () => { throw new Error('db down'); });
  assert.equal(await C.recordAdvisorCommissionSafely({ plan: PLAN, paidAmount: 100, paymentId: 'p' }), null);
});
