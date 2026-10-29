const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertSafeToRun, requireEnv } = require('../scripts/lib/guard');

test('refuses to run in production', () => {
  assert.throws(() => assertSafeToRun({ env: { NODE_ENV: 'production' }, argv: [] }), /production/);
});

test('destructive scripts need --confirm=<DB_NAME>', () => {
  const env = { NODE_ENV: 'development', DB_NAME: 'dev_db' };
  assert.throws(() => assertSafeToRun({ destructive: true, env, argv: [] }), /--confirm=dev_db/);
  assert.throws(() => assertSafeToRun({ destructive: true, env, argv: ['--confirm=other_db'] }));
  assert.equal(assertSafeToRun({ destructive: true, env, argv: ['--confirm=dev_db'] }), true);
});

test('requireEnv has no literal fallback', () => {
  assert.throws(() => requireEnv('SEED_ADMIN_PASSWORD', {}), /SEED_ADMIN_PASSWORD/);
  assert.equal(requireEnv('X', { X: 'v' }), 'v');
});
