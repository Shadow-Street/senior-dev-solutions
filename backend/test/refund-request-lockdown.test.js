const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');

// SEC-9: a customer could set status/amount/gateway ids on their own refund
// request and the Financials lists and stats showed the forged values.
let created;
let updated;
let row;
beforeEach(() => {
  stubUserLookup();
  created = [];
  updated = [];
  row = { id: 'rr1', user_id: USERS.user.id, status: 'pending', reason: 'x' };
  mock.method(db.RefundRequest, 'create', async (data) => { created.push(data); return { id: 'rr-new', ...data, toJSON() { return this; } }; });
  mock.method(db.RefundRequest, 'findOne', async () => ({ ...row, update: async (v) => { updated.push(v); return { ...row, ...v }; }, toJSON() { return row; } }));
  mock.method(db.RefundRequest, 'findByPk', async () => ({ ...row, update: async (v) => { updated.push(v); return { ...row, ...v }; }, toJSON() { return row; } }));
});
afterEach(() => mock.restoreAll());

const asUser = (r) => r.set('Authorization', bearer(USERS.user));

test('a customer cannot set the outcome fields when filing a request', async () => {
  const res = await asUser(request(app).post('/api/events/refunds')).send({
    reason: 'Not useful', transaction_type: 'subscription',
    status: 'completed', refund_amount: 99999, razorpay_refund_id: 'rfnd_fake', processed_by: USERS.user.id,
  });
  assert.ok([200, 201].includes(res.status), String(res.status));
  for (const f of ['status', 'refund_amount', 'razorpay_refund_id', 'processed_by']) {
    assert.equal(created[0][f], undefined, `${f} must be stripped`);
  }
  assert.equal(created[0].reason, 'Not useful');
});

test('a customer cannot change a request once it is being handled', async () => {
  row.status = 'approved';
  const res = await asUser(request(app).put('/api/events/refunds/rr1')).send({ reason: 'edited' });
  assert.equal(res.status, 409);
  const del = await asUser(request(app).delete('/api/events/refunds/rr1'));
  assert.equal(del.status, 409);
});
