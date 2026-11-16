/**
 * Columns on `users` that migration 017 adds and the User model does NOT
 * declare.
 *
 * They are kept out of the model on purpose: every authenticated request reads
 * the user through the model, so declaring a column the database does not have
 * yet would turn every request into a 500 ("Unknown column") until the
 * migration ran. Instead the admin services read and write them with
 * parameterised SQL, and only after checking here that they exist. Before 017
 * is applied, trust scores and custom-role assignment answer 503 and the rest
 * of User Management keeps working.
 *
 * The check runs once (describeTable) and is cached for the life of the
 * process; a failed lookup is retried after RETRY_MS. Apply the migration and
 * restart the API.
 */
const db = require('../models');

const OPTIONAL_COLUMNS_017 = ['trust_score', 'custom_role_id'];
// Personal-data columns that databases built from migration 001 carry but the
// model does not; deleting (anonymising) a user scrubs whichever exist.
// Optional columns that exist on some databases only; deleteUser blanks the
// ones present. Personal data or identifiers that outlive the account.
const LEGACY_PII_COLUMNS = ['full_name', 'phone', 'avatar_url', 'mobile_number', 'bio', 'metadata', 'referral_code', 'last_login_at', 'last_login_ip', 'date_of_birth', 'address', 'city', 'pan_number'];
const INSPECTED = [...OPTIONAL_COLUMNS_017, ...LEGACY_PII_COLUMNS];
const RETRY_MS = 30000;

let state = null; // { checked: true, present: Set } | { checked: false, at, present: Set }

async function userColumns() {
  if (state && (state.checked || Date.now() - state.at < RETRY_MS)) return state.present;
  try {
    const columns = await db.sequelize.getQueryInterface().describeTable('users');
    const present = new Set(INSPECTED.filter((c) => c in columns));
    const missing = OPTIONAL_COLUMNS_017.filter((c) => !present.has(c));
    if (missing.length) {
      console.warn(`[userSchema] users is missing ${missing.join(', ')}; apply migration 017 and restart the API`);
    }
    state = { checked: true, present };
  } catch (e) {
    console.error('[userSchema] could not inspect users:', e.message);
    state = { checked: false, at: Date.now(), present: new Set() };
  }
  return state.present;
}

async function hasUserColumn(name) {
  return (await userColumns()).has(name);
}

class MigrationPendingError extends Error {
  constructor(feature) {
    super(`${feature} needs a pending database update (migration 017).`);
    this.status = 503;
    this.code = 'MIGRATION_PENDING';
  }
}

module.exports = {
  userColumns,
  hasUserColumn,
  MigrationPendingError,
  OPTIONAL_COLUMNS_017,
  LEGACY_PII_COLUMNS,
  _reset: () => { state = null; },
  _set: (names) => { state = { checked: true, present: new Set(names) }; },
};
