const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db } = require('./helpers');
const AuthService = require('../src/services/AuthService');
const VerificationService = require('../src/services/VerificationService');

afterEach(() => mock.restoreAll());

test('login gives the same answer for unknown email and wrong password', async () => {
  mock.method(AuthService, 'getUser', async (email) =>
    email === 'known@example.test' ? { id: 'u1', email, password: '$2a$10$abcdefghijklmnopqrstuuK2v5b2V2a0oI1Kq1vC8b0y0aVq2Wm' } : null);

  const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.test', password: 'x' });
  const wrong = await request(app).post('/api/auth/login').send({ email: 'known@example.test', password: 'wrong' });

  assert.equal(unknown.status, wrong.status);
  assert.deepEqual(unknown.body, wrong.body);
  assert.doesNotMatch(JSON.stringify(unknown.body), /not found|incorrect password/i);
});

test('forgot-password builds the link from PUBLIC_APP_URL, never the Origin header', async () => {
  mock.method(db.User, 'findOne', async () => ({ id: 'u1', email: 'victim@example.test' }));
  const send = mock.method(VerificationService, 'sendPasswordReset', async () => {});

  const res = await request(app)
    .post('/api/auth/forgot-password')
    .set('Origin', 'https://attacker.example')
    .send({ email: 'victim@example.test' });

  assert.equal(res.status, 200);
  assert.equal(send.mock.callCount(), 1);
  assert.equal(send.mock.calls[0].arguments[1], 'https://app.example.test');
});

test('register ignores a client-supplied role', async () => {
  const register = mock.method(AuthService, 'register', async () => ({ user: { id: 'u1', email: 'n@example.test' } }));
  mock.method(VerificationService, 'sendRegistrationOtp', async () => {});
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'n@example.test', password: 'Passw0rd!x', name: 'N', role: 'admin' });
  assert.equal(res.status, 201);
  assert.equal(register.mock.callCount(), 1);
  assert.equal(register.mock.calls[0].arguments[3], 'user');
});

test('malformed JSON gets a JSON error without a stack trace', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email": ');
  assert.equal(res.status, 400);
  assert.match(res.headers['content-type'], /json/);
  assert.doesNotMatch(res.text, /at .*\.js:\d+/);
});

test('forgot-password ignores the Origin header even when PUBLIC_APP_URL is unset', async () => {
  const saved = process.env.PUBLIC_APP_URL;
  delete process.env.PUBLIC_APP_URL;
  try {
    mock.method(db.User, 'findOne', async () => ({ id: 'u1', email: 'victim@example.test' }));
    const send = mock.method(VerificationService, 'sendPasswordReset', async () => {});
    await request(app)
      .post('/api/auth/forgot-password')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'victim@example.test' });
    // NODE_ENV is "test" here, so the development fallback applies.
    assert.equal(send.mock.callCount(), 1);
    assert.equal(send.mock.calls[0].arguments[1], 'http://localhost:5173');
  } finally {
    process.env.PUBLIC_APP_URL = saved;
  }
});
