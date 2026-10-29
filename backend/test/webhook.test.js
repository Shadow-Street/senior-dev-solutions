const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');
const { app } = require('./helpers');

afterEach(() => mock.restoreAll());

const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });
const sign = (raw, secret = process.env.RAZORPAY_WEBHOOK_SECRET) =>
  crypto.createHmac('sha256', secret).update(raw).digest('hex');

test('webhook answers 503 instead of crashing when the secret is missing', async () => {
  const saved = process.env.RAZORPAY_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  try {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', 'x')
      .send(body);
    assert.equal(res.status, 503);
  } finally {
    process.env.RAZORPAY_WEBHOOK_SECRET = saved;
  }
});

test('webhook rejects a bad signature', async () => {
  const res = await request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', sign(body, 'wrong-secret'))
    .send(body);
  assert.equal(res.status, 400);
});

test('webhook verifies the signature over the raw body bytes', async () => {
  // Whitespace that JSON.stringify(req.body) would not reproduce.
  const raw = body.replace(':', ': ');
  const res = await request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', sign(raw))
    .send(raw);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('webhook rejects malformed signatures without hanging', async () => {
  const valid = sign(body);
  const malformed = [
    valid.slice(0, 63),                 // wrong length
    `${valid.slice(0, 63)}z`,           // not hex
    `${valid.slice(0, 62)}\u00e9`,      // non-ASCII: 64 chars but 65 bytes
    valid.toUpperCase().replace(/[0-9A-F]$/, 'G'),
  ];
  for (const signature of malformed) {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', signature)
      .timeout({ response: 2000 })
      .send(body);
    assert.equal(res.status, 400, `signature ${JSON.stringify(signature)}`);
  }
});

test('webhook path matching is case-insensitive for raw-body capture', async () => {
  const res = await request(app)
    .post('/api/Payments/Webhook')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', sign(body))
    .send(body);
  assert.equal(res.status, 200);
});
