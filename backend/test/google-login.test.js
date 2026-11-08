const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const { app, db } = require('./helpers');
const SubscriptionService = require('../src/services/SubscriptionService');
const AuthService = require('../src/services/AuthService');

// POST /api/auth/google takes a Google ID token (GIS `credential`), verifies it
// against GOOGLE_CLIENT_ID and opens a session. Google itself is mocked.
const PAYLOAD = { email: 'Pat.Person@Gmail.com', email_verified: true, name: 'Pat Person', sub: 'google-sub-1', picture: 'https://img.example/p.png' };
const ORIGINAL_HASH = '$2a$10$attackerchosenpasswordhashxxxxxxxxxxxxxxxxxxxxxxxxxxx';

let verifyCalls;
let created;
let saved;
let revoked;
let codesConsumed;
let rows;

const verifyWith = (payload) =>
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async (opts) => {
    verifyCalls.push(opts);
    if (payload instanceof Error) throw payload;
    return { getPayload: () => payload };
  });

/** Users table stand-in that honours `where: { google_id }` and `where: { email }`. */
const withUsers = (...list) => {
  rows = list.map((fields) => ({
    id: 'u-existing',
    role: 'user',
    password: ORIGINAL_HASH,
    ...fields,
    async save() { saved.push({ ...this }); },
  }));
  mock.method(db.User, 'findOne', async ({ where }) =>
    rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) || null);
};
const post = (body) => request(app).post('/api/auth/google').send(body);

beforeEach(() => {
  verifyCalls = [];
  created = [];
  saved = [];
  revoked = [];
  codesConsumed = [];
  process.env.GOOGLE_CLIENT_ID = 'test-google-client';
  mock.method(db.OauthToken, 'create', async () => ({}));
  mock.method(db.User, 'create', async (data) => {
    created.push(data);
    return { id: 'u-new', ...data };
  });
  mock.method(SubscriptionService, 'ensureFreeSubscriptionSafely', async () => {});
  mock.method(AuthService, 'revokeAllForUser', async (id) => { revoked.push(id); });
  mock.method(db.VerificationCode, 'update', async (values, opts) => { codesConsumed.push(opts.where); return [1]; });
});
afterEach(() => {
  mock.restoreAll();
  process.env.GOOGLE_CLIENT_ID = 'test-google-client';
});

describe('POST /api/auth/google: input and verification', () => {
  test('missing, non-string or oversized token is a 400 and Google is not called', async () => {
    verifyWith(PAYLOAD);
    for (const body of [{}, { token: '' }, { token: 123 }, { token: { a: 1 } }, { token: 'x'.repeat(5000) }, { accessToken: 'ya29.abc' }]) {
      const res = await post(body);
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 40));
      assert.ok(res.body.error);
    }
    assert.equal(verifyCalls.length, 0);
  });

  test('a token Google rejects is a generic 401 with no library message', async () => {
    verifyWith(new Error('Wrong recipient, payload audience != requiredAudience'));
    const res = await post({ token: 'forged' });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'GOOGLE_TOKEN_INVALID');
    assert.doesNotMatch(JSON.stringify(res.body), /audience|recipient|stack/i);
    assert.equal(res.body.accessToken, undefined);
  });

  test('fails closed (503) without GOOGLE_CLIENT_ID instead of skipping the audience check', async () => {
    verifyWith(PAYLOAD);
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 503);
    assert.equal(verifyCalls.length, 0);
  });

  test('verifies against the configured audience', async () => {
    verifyWith(PAYLOAD);
    withUsers();
    await post({ token: 'id-token' });
    assert.deepEqual(verifyCalls[0], { idToken: 'id-token', audience: 'test-google-client' });
  });

  test('an unverified Google email cannot open or link an account', async () => {
    verifyWith({ ...PAYLOAD, email_verified: false });
    withUsers({ email: 'pat.person@gmail.com' });
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'GOOGLE_EMAIL_UNVERIFIED');
    assert.equal(db.User.findOne.mock.callCount(), 0);
    assert.equal(created.length, 0);
  });
});

describe('POST /api/auth/google: accounts', () => {
  test('new account: verified plain user (client role ignored), bounded profile fields, session issued', async () => {
    verifyWith({ ...PAYLOAD, email: 'Someone@Yahoo.example', name: 'N'.repeat(300), picture: 'http://insecure.example/p.png' });
    withUsers();
    const res = await post({ token: 'id-token', role: 'super_admin' });
    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);
    assert.equal(created.length, 1);
    assert.equal(created[0].email, 'someone@yahoo.example');
    assert.equal(created[0].role, 'user');
    assert.equal(created[0].email_verified, true);
    assert.equal(created[0].google_id, 'google-sub-1');
    assert.equal(created[0].name.length, 100);
    assert.equal(created[0].profile_image_url, null);
    assert.equal(res.body.user.password, undefined);
    assert.ok(res.headers['set-cookie']);
  });

  test('an account already linked is found by Google subject, even after the Google email changed', async () => {
    verifyWith({ ...PAYLOAD, email: 'new-address@gmail.com' });
    withUsers({ id: 'u-linked', email: 'old-address@gmail.com', google_id: 'google-sub-1', email_verified: true });
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, 'u-linked');
    assert.equal(created.length, 0);
  });

  test('an account linked to a different Google identity is refused', async () => {
    verifyWith(PAYLOAD);
    withUsers({ email: 'pat.person@gmail.com', google_id: 'someone-else' });
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'GOOGLE_ACCOUNT_MISMATCH');
    assert.equal(res.body.accessToken, undefined);
    assert.equal(saved.length, 0);
  });

  test('verified Gmail account: linked once, password and sessions kept', async () => {
    verifyWith(PAYLOAD);
    withUsers({ email: 'pat.person@gmail.com', google_id: null, email_verified: true });
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, 'u-existing');
    assert.equal(saved.length, 1);
    assert.equal(saved[0].google_id, 'google-sub-1');
    assert.equal(saved[0].password, ORIGINAL_HASH);
    assert.deepEqual(revoked, []);
  });

  test('pre-registered unverified account: linking replaces the password, ends sessions and voids codes', async () => {
    verifyWith(PAYLOAD);
    withUsers({ email: 'pat.person@gmail.com', google_id: null, email_verified: false });
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 200);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].email_verified, true);
    assert.notEqual(saved[0].password, ORIGINAL_HASH);
    assert.match(saved[0].password, /^\$2[aby]\$10\$/);
    assert.deepEqual(revoked, ['u-existing']);
    assert.deepEqual(codesConsumed, [{ user_id: 'u-existing', consumed_at: null }]);
  });

  test('Workspace address with matching hd may link; consumer Google on a non-Google address may not', async () => {
    verifyWith({ ...PAYLOAD, email: 'pat@company.example', hd: 'company.example' });
    withUsers({ email: 'pat@company.example', google_id: null, email_verified: true });
    assert.equal((await post({ token: 'id-token' })).status, 200);

    mock.restoreAll();
    saved = [];
    mock.method(db.OauthToken, 'create', async () => ({}));
    verifyWith({ ...PAYLOAD, email: 'pat@company.example' }); // no hd: consumer account on that address
    withUsers({ email: 'pat@company.example', google_id: null, email_verified: true });
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'GOOGLE_LINK_NOT_ALLOWED');
    assert.equal(res.body.accessToken, undefined);
    assert.equal(saved.length, 0);
  });

  test('staff, advisor and portfolio-manager accounts are never auto-linked', async () => {
    verifyWith(PAYLOAD);
    for (const fields of [{ app_role: 'super_admin' }, { app_role: 'admin' }, { role: 'sub_admin' }, { app_role: 'advisor' }, { role: 'portfolio_manager' }]) {
      withUsers({ email: 'pat.person@gmail.com', google_id: null, email_verified: true, ...fields });
      const res = await post({ token: 'id-token' });
      assert.equal(res.status, 409, JSON.stringify(fields));
      assert.equal(res.body.accessToken, undefined);
      db.User.findOne.mock.restore();
    }
    assert.equal(saved.length, 0);
  });

  test('an unexpected failure is a generic 500', async () => {
    verifyWith(PAYLOAD);
    mock.method(db.User, 'findOne', async () => { throw new Error('ER_ACCESS_DENIED for user root@10.0.0.5'); });
    mock.method(console, 'error', () => {});
    const res = await post({ token: 'id-token' });
    assert.equal(res.status, 500);
    assert.doesNotMatch(JSON.stringify(res.body), /ER_ACCESS|root|10\.0\.0/);
  });
});
