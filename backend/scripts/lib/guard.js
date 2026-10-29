/**
 * Safety guard for scripts that write to the database.
 *
 * Every seed/fix/reset script acts on whatever database backend/.env points
 * at. This refuses to run in production and, for destructive scripts, demands
 * the target database name on the command line so it cannot run by accident:
 *
 *   node scripts/reset-schema.js --confirm=stock_trading_db
 */
function assertSafeToRun({ destructive = false, script = 'this script', argv = process.argv, env = process.env } = {}) {
  if (env.NODE_ENV === 'production' && env.ALLOW_PROD_SCRIPT !== 'yes') {
    return fail(`Refusing to run ${script} with NODE_ENV=production.`);
  }
  if (destructive) {
    const dbName = env.DB_NAME || 'stock_trading_db';
    if (!argv.includes(`--confirm=${dbName}`)) {
      return fail(`${script} is destructive. Re-run with --confirm=${dbName} if you really mean it.`);
    }
  }
  return true;
}

/** Reads a required env var for a seed credential; never falls back to a literal. */
function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) fail(`Set ${name} in the environment before running this script.`);
  return value;
}

function fail(message) {
  const error = new Error(message);
  error.code = 'SCRIPT_GUARD';
  throw error;
}

module.exports = { assertSafeToRun, requireEnv };
