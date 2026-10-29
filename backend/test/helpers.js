/**
 * Shared test setup. Must be required before anything under src/.
 *
 * The app loads backend/.env through dotenv, which never overrides variables
 * that are already set. Setting them here first means tests use throwaway
 * secrets, an unresolvable database host (any query that slips past a stub
 * fails instead of touching a real database), and local-disk storage.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DB_HOST = 'db.invalid';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.AWS_ACCESS_KEY_ID = '';
process.env.AWS_SECRET_ACCESS_KEY = '';
process.env.AWS_S3_BUCKET = '';
process.env.PUBLIC_APP_URL = 'https://app.example.test';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.AWS_BUCKET_NAME = '';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'test-razorpay-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client';
process.env.GEMINI_API_KEY = '';
process.env.FINNHUB_API_KEY = '';
process.env.REDIS_URL = '';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

const jwt = require('jsonwebtoken');
const { mock } = require('node:test');

// Quieten the per-request logger and expected error logs.
for (const level of ['log', 'info', 'warn', 'error']) mock.method(console, level, () => {});

const db = require('../src/models');
const { app } = require('../src/app');

const USERS = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'user@example.test', app_role: 'user', role: 'user', status: 'active' },
  admin: { id: '22222222-2222-4222-8222-222222222222', email: 'admin@example.test', app_role: 'admin', role: 'admin', status: 'active' },
  superAdmin: { id: '33333333-3333-4333-8333-333333333333', email: 'sa@example.test', app_role: 'super_admin', role: 'admin', status: 'active' },
};

/** Bearer header for one of USERS. */
function bearer(user) {
  return `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
}

/**
 * Makes the auth middleware resolve tokens to USERS without a database.
 * `extra` maps id → record for other lookups through User.findByPk.
 */
function stubUserLookup(extra = {}) {
  const records = { ...extra };
  for (const u of Object.values(USERS)) records[u.id] = records[u.id] || { ...u };
  return mock.method(db.User, 'findByPk', async (id) => (records[id] ? { ...records[id] } : null));
}

module.exports = { app, db, USERS, bearer, stubUserLookup };
