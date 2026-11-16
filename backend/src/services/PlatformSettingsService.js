/**
 * Managed platform settings: one registry, one validator, one writer.
 *
 * platform_settings is a free-form key/value table that grew from Base44: any
 * admin screen could write any key with any value, nothing was validated on
 * the server, and most of the values the Platform Settings screen saved were
 * read by nothing. This module is the contract for the keys the platform
 * actually acts on:
 *
 *   - every managed key has a type, bounds, a safe default and the role that
 *     may change it (super_admin for security-critical ones);
 *   - writes are validated here, so the generic CRUD path and the dedicated
 *     endpoint enforce the same rules;
 *   - every change is audited (old -> new, secrets masked);
 *   - reads are cached for a few seconds, because the maintenance gate and the
 *     login guard consult settings on hot paths, and degrade to the defaults
 *     when the table cannot be read (a fresh database, an outage), so a
 *     settings problem never takes the platform down or opens it up.
 *
 * Values are stored as text, as before ('true' / '42' / JSON), so existing
 * rows and other readers keep working.
 */
const db = require('../models');
const { effectiveRole } = require('../utils/roles');

const ADMIN = 'admin';
const SUPER_ADMIN = 'super_admin';

/**
 * Keys that must never be stored in platform_settings. Payment secrets live in
 * the server environment only (RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET);
 * the old Payment Gateway screen wrote them into this table, which every
 * admin could read back and which nothing on the server used.
 */
const ENV_ONLY_KEYS = new Set([
  'razorpay_key_secret',
  'razorpay_webhook_secret',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'stock_data_api_key',
  'news_api_key',
  'google_maps_api_key',
]);

const NAV_KEY_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,19}$/;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;

/** Admin sidebar tabs that may never be hidden: hiding them would lock the panel. */
const ADMIN_NAV_LOCKED = new Set(['settings', 'dashboard']);

function validateNavConfig(value, { locked = new Set() } = {}) {
  let parsed = value;
  if (typeof value === 'string') {
    if (value.trim() === '') return { value: { items: [] } };
    try { parsed = JSON.parse(value); } catch { return { error: 'must be valid JSON' }; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: 'must be an object with an items list' };
  const items = parsed.items === undefined ? [] : parsed.items;
  if (!Array.isArray(items)) return { error: 'items must be a list' };
  if (items.length > 60) return { error: 'too many items (max 60)' };
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') return { error: 'each item must be an object' };
    const key = String(raw.key || '');
    if (!NAV_KEY_PATTERN.test(key)) return { error: `invalid item key "${key.slice(0, 40)}"` };
    if (seen.has(key)) return { error: `duplicate item "${key}"` };
    seen.add(key);
    const item = { key };
    if (raw.visible !== undefined) {
      if (typeof raw.visible !== 'boolean') return { error: `${key}: visible must be true or false` };
      if (!raw.visible && locked.has(key)) return { error: `${key} cannot be hidden` };
      item.visible = raw.visible;
    }
    if (raw.label !== undefined && raw.label !== null) {
      if (typeof raw.label !== 'string') return { error: `${key}: label must be text` };
      const label = raw.label.trim();
      if (label.length > 40) return { error: `${key}: label must be 40 characters or fewer` };
      if (/[<>]/.test(label)) return { error: `${key}: label cannot contain < or >` };
      if (label) item.label = label;
    }
    if (raw.order !== undefined && raw.order !== null) {
      if (!Number.isInteger(raw.order) || raw.order < 0 || raw.order > 999) return { error: `${key}: order must be a whole number from 0 to 999` };
      item.order = raw.order;
    }
    out.push(item);
  }
  return { value: { items: out } };
}

/**
 * The registry. `public: true` values are served to anyone by
 * GET /platform/settings/public-config (the footer, document head, sign-up
 * page and maintenance screen need them before sign-in).
 */
const DEFINITIONS = [
  // Site
  { key: 'site_name', section: 'site', type: 'string', label: 'Platform name', min: 1, max: 80, default: 'Protocall', public: true },
  { key: 'site_description', section: 'site', type: 'string', label: 'Platform description', max: 300, default: "India's largest retail investor community", public: true },
  { key: 'contact_email', section: 'site', type: 'email', label: 'Contact email', default: 'support@protocall.in', public: true },
  { key: 'contact_phone', section: 'site', type: 'phone', label: 'Contact phone', default: '+91-80-4567-8900', public: true },
  { key: 'company_address', section: 'site', type: 'string', label: 'Company address', max: 300, default: 'Bangalore, Karnataka - 560001, India', public: true },
  { key: 'facebook_url', section: 'site', type: 'url', label: 'Facebook page', default: '', public: true },
  { key: 'twitter_url', section: 'site', type: 'url', label: 'Twitter / X profile', default: '', public: true },
  { key: 'instagram_url', section: 'site', type: 'url', label: 'Instagram profile', default: '', public: true },
  { key: 'linkedin_url', section: 'site', type: 'url', label: 'LinkedIn page', default: '', public: true },
  { key: 'youtube_url', section: 'site', type: 'url', label: 'YouTube channel', default: '', public: true },
  // Dashboard "Traders" card: the real member count, but never below this
  // floor (the client asked for 670 while the community is being seeded).
  // 0 shows the real count only. Served through GET /platform/community-stats.
  { key: 'community_traders_display_min', section: 'site', type: 'integer', label: 'Traders count shown on the dashboard (minimum)', min: 0, max: 10000000, default: 670, public: false },

  // SEO
  { key: 'seo_meta_title', section: 'seo', type: 'string', label: 'Default page title', max: 70, default: 'Protocall - The Ultimate Social Trading Platform', public: true },
  { key: 'seo_meta_description', section: 'seo', type: 'string', label: 'Default meta description', max: 160, default: '', public: true },
  { key: 'seo_meta_keywords', section: 'seo', type: 'string', label: 'Default meta keywords', max: 255, default: 'social trading, stocks, finance, community, investing', public: true },

  // Support
  { key: 'support_email', section: 'support', type: 'email', label: 'Support email', default: 'support@protocall.in', public: true },
  { key: 'support_phone', section: 'support', type: 'phone', label: 'Support phone', default: '+91-80-4567-8900', public: true },

  // Monetization
  { key: 'global_commission_rate', section: 'monetization', type: 'number', label: 'Default advisor commission (%)', min: 0, max: 100, default: 20, public: false },
  { key: 'subscription_refund_enabled', section: 'monetization', type: 'boolean', label: 'Refund on subscription cancellation', default: true, public: true },

  // Referrals
  { key: 'referral_system_enabled', section: 'referral', type: 'boolean', label: 'Referral programme enabled', default: true, public: true },
  { key: 'referral_inviter_bonus', section: 'referral', type: 'number', label: 'Inviter reward (INR)', min: 0, max: 100000, default: 100, public: true },
  { key: 'referral_conditions', section: 'referral', type: 'string', label: 'Reward conditions shown to members', max: 1000, default: 'Rewards are reviewed and credited by the Protocall team after the person you invite signs up with your code and verifies their email.', public: true },

  // Access & security (super_admin only)
  { key: 'registration_enabled', section: 'security', type: 'boolean', label: 'New sign-ups open', default: true, public: true, role: SUPER_ADMIN },
  { key: 'maintenance_mode', section: 'security', type: 'boolean', label: 'Maintenance mode', default: false, public: true, role: SUPER_ADMIN },
  { key: 'maintenance_message', section: 'security', type: 'string', label: 'Maintenance message', max: 500, default: 'Protocall is undergoing scheduled maintenance. Please check back shortly.', public: true, role: SUPER_ADMIN },
  { key: 'session_idle_timeout_minutes', section: 'security', type: 'integer', label: 'Idle sign-out (minutes, 0 = off)', min: 0, max: 1440, default: 0, public: true, role: SUPER_ADMIN },
  { key: 'login_max_failed_attempts', section: 'security', type: 'integer', label: 'Failed sign-ins before lockout (0 = off)', min: 0, max: 20, default: 0, public: false, role: SUPER_ADMIN,
    check: (n) => (n !== 0 && n < 3 ? 'must be 0 (off) or between 3 and 20' : null) },
  { key: 'login_lockout_minutes', section: 'security', type: 'integer', label: 'Lockout duration (minutes)', min: 1, max: 1440, default: 15, public: false, role: SUPER_ADMIN },

  // Notifications
  { key: 'notification_default_email', section: 'notifications', type: 'boolean', label: 'New members: email notifications on', default: true, public: false },
  { key: 'notification_default_push', section: 'notifications', type: 'boolean', label: 'New members: push notifications on', default: true, public: false },
  { key: 'notification_default_sms', section: 'notifications', type: 'boolean', label: 'New members: SMS notifications on', default: false, public: false },
  { key: 'notification_reminder_emails_enabled', section: 'notifications', type: 'boolean', label: 'Send subscription renewal reminder emails', default: true, public: false },

  // Alerts
  // super_admin: a low value is a way to erase resolved alert history.
  { key: 'alert_retention_days', section: 'alerts', type: 'integer', label: 'Delete resolved alerts after (days, 0 = keep)', min: 0, max: 3650, default: 0, public: false, role: SUPER_ADMIN,
    check: (n) => (n !== 0 && n < 30 ? 'must be 0 (keep everything) or at least 30 days' : null) },

  // Navigation (replaces the unused Entity Configuration)
  { key: 'nav_config_user', section: 'navigation', type: 'json', label: 'Member sidebar', default: { items: [] }, public: true,
    validateJson: (v) => validateNavConfig(v) },
  { key: 'nav_config_admin', section: 'navigation', type: 'json', label: 'Admin sidebar', default: { items: [] }, public: true,
    validateJson: (v) => validateNavConfig(v, { locked: ADMIN_NAV_LOCKED }) },
];

const REGISTRY = new Map(DEFINITIONS.map((d) => [d.key, { role: ADMIN, ...d }]));
const MANAGED_KEYS = [...REGISTRY.keys()];

/**
 * Keys are compared in a canonical form. platform_settings.key is UNIQUE under
 * a case- and trailing-space-insensitive collation, so `MAINTENANCE_MODE ` is
 * the same row to MySQL as `maintenance_mode`; checks done on the raw string
 * could be stepped around with a variant spelling.
 */
const canonicalKey = (key) => String(key ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const isManagedKey = (key) => REGISTRY.has(String(key));
const isEnvOnlyKey = (key) => ENV_ONLY_KEYS.has(canonicalKey(key));
const definitionFor = (key) => REGISTRY.get(String(key)) || null;
const PROTECTED_CANONICAL = new Set([...MANAGED_KEYS, 'ads_enabled', ...ENV_ONLY_KEYS]);
/** A spelling variant (case, spaces, accents) of a managed, ads or env-only key. */
const isVariantOfProtectedKey = (key) => {
  const raw = String(key ?? '');
  const canon = canonicalKey(raw);
  return PROTECTED_CANONICAL.has(canon) && raw !== canon;
};

/**
 * Validates one value against its definition.
 * Returns { value } (the normalised, typed value) or { error }.
 */
function validateValue(def, raw) {
  if (raw === undefined) return { error: 'is required' };
  switch (def.type) {
    case 'boolean': {
      if (raw === true || raw === 'true') return { value: true };
      if (raw === false || raw === 'false') return { value: false };
      return { error: 'must be true or false' };
    }
    case 'integer':
    case 'number': {
      if (raw === null || raw === '' || typeof raw === 'boolean' || Array.isArray(raw) || typeof raw === 'object') return { error: 'must be a number' };
      const n = Number(raw);
      if (!Number.isFinite(n)) return { error: 'must be a number' };
      if (def.type === 'integer' && !Number.isInteger(n)) return { error: 'must be a whole number' };
      if (def.min !== undefined && n < def.min) return { error: `must be at least ${def.min}` };
      if (def.max !== undefined && n > def.max) return { error: `must be at most ${def.max}` };
      if (def.type === 'number' && Math.round(n * 100) !== n * 100) return { error: 'must have at most 2 decimal places' };
      const custom = def.check ? def.check(n) : null;
      if (custom) return { error: custom };
      return { value: n };
    }
    case 'json':
      return def.validateJson(raw);
    default: {
      if (raw === null) raw = '';
      if (typeof raw !== 'string' && typeof raw !== 'number') return { error: 'must be text' };
      const s = String(raw).trim();
      if (def.min && s.length < def.min) return { error: def.min === 1 ? 'cannot be empty' : `must be at least ${def.min} characters` };
      if (s.length > (def.max || 2000)) return { error: `must be ${def.max || 2000} characters or fewer` };
      if (/[<>]/.test(s)) return { error: 'cannot contain < or >' };
      if (s === '') return { value: '' };
      if (def.type === 'email' && !EMAIL_PATTERN.test(s)) return { error: 'must be a valid email address' };
      if (def.type === 'phone' && !PHONE_PATTERN.test(s)) return { error: 'must be a valid phone number (digits, spaces, +, -, brackets)' };
      if (def.type === 'url') {
        let u;
        try { u = new URL(s); } catch { return { error: 'must be a full https:// address' }; }
        if (u.protocol !== 'https:' || s.length > 500) return { error: 'must be a full https:// address' };
      }
      return { value: s };
    }
  }
}

/** Text form stored in platform_settings.value. */
function serialise(def, value) {
  if (def.type === 'json') return JSON.stringify(value);
  return String(value);
}

/** Typed value from a stored row; anything unreadable falls back to the default. */
function parseStored(def, raw) {
  if (raw === undefined || raw === null) return def.default;
  if (def.type === 'json') {
    const r = validateValue(def, String(raw));
    return r.error ? def.default : r.value;
  }
  if (raw === '' && def.type !== 'string' && def.type !== 'email' && def.type !== 'phone' && def.type !== 'url') return def.default;
  const r = validateValue(def, raw);
  return r.error ? def.default : r.value;
}

function defaults() {
  const out = {};
  for (const def of REGISTRY.values()) out[def.key] = def.default;
  return out;
}

// ---- cached reads ---------------------------------------------------------

const CACHE_TTL_MS = 10 * 1000;
const FAILED_LOAD_TTL_MS = 2 * 1000;
let cache = null;
let cacheAt = 0;
let cacheTtl = CACHE_TTL_MS;
let lastGood = null;
let pending = null;
// Bumped by every write: a load that started before the write must not put
// the pre-write values back into the cache when it finishes.
let generation = 0;

function invalidate() {
  generation += 1;
  cache = null;
  cacheAt = 0;
  pending = null;
}

/** Test hook: forget everything, including the last values read successfully. */
function __reset() {
  invalidate();
  lastGood = null;
}

async function load() {
  const { Op } = db.Sequelize;
  const values = defaults();
  const rows = await db.PlatformSetting.findAll({ where: { key: { [Op.in]: MANAGED_KEYS } } });
  for (const row of rows) {
    // Exact key only: a variant spelling is not the setting (and can no
    // longer be written; see isVariantOfProtectedKey).
    const def = REGISTRY.get(row.key);
    if (def) values[row.key] = parseStored(def, row.value);
  }
  return values;
}

/** All managed values (typed), cached for CACHE_TTL_MS. */
async function getAll() {
  if (cache && Date.now() - cacheAt < cacheTtl) return cache;
  if (!pending) {
    const gen = generation;
    const p = load().then((values) => {
      if (gen === generation) {
        cache = values;
        lastGood = values;
        cacheAt = Date.now();
        cacheTtl = CACHE_TTL_MS;
      }
      return values;
    }, (error) => {
      // Keep the last values read successfully; a transient database error
      // must not reopen sign-ups or lift maintenance. Only with nothing read
      // yet do the defaults apply (the platform's pre-settings behaviour), and
      // that is retried after a short delay rather than cached for long.
      console.error('[PlatformSettingsService] settings read failed:', error.message);
      const fallback = lastGood || defaults();
      if (gen === generation) {
        cache = fallback;
        cacheAt = Date.now();
        cacheTtl = lastGood ? CACHE_TTL_MS : FAILED_LOAD_TTL_MS;
      }
      return fallback;
    }).finally(() => { if (pending === p) pending = null; });
    pending = p;
  }
  return pending;
}

async function getValue(key) {
  const def = definitionFor(key);
  if (!def) throw new Error(`Unknown platform setting: ${key}`);
  const all = await getAll();
  return all[key];
}

async function getPublicConfig() {
  const all = await getAll();
  const out = {};
  for (const def of REGISTRY.values()) if (def.public) out[def.key] = all[def.key];
  return out;
}

/** Registry metadata for the admin screen (no values, no functions). */
function describe() {
  return DEFINITIONS.map((d) => {
    const def = REGISTRY.get(d.key);
    const meta = { key: def.key, section: def.section, type: def.type, label: def.label, role: def.role, default: def.default, public: Boolean(def.public) };
    if (def.min !== undefined) meta.min = def.min;
    if (def.max !== undefined) meta.max = def.max;
    return meta;
  });
}

// ---- writes ---------------------------------------------------------------

const canWrite = (user, def) => {
  const role = effectiveRole(user);
  if (def.role === SUPER_ADMIN) return role === SUPER_ADMIN;
  return role === ADMIN || role === SUPER_ADMIN;
};

class SettingsError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || undefined;
  }
}

/**
 * Checks a batch of changes without writing.
 * Returns { normalised: {key: typedValue} } or throws SettingsError.
 */
function checkChanges(changes, user) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new SettingsError(400, '`settings` must be an object of key: value pairs');
  }
  const entries = Object.entries(changes);
  if (entries.length === 0) throw new SettingsError(400, 'Nothing to save');
  if (entries.length > MANAGED_KEYS.length) throw new SettingsError(400, 'Too many settings in one request');

  const fields = {};
  const forbidden = [];
  const normalised = {};
  for (const [key, raw] of entries) {
    if (isEnvOnlyKey(key)) { fields[key] = 'is configured in the server environment and cannot be stored here'; continue; }
    if (key === 'ads_enabled') { fields[key] = 'is changed from Ad Management'; continue; }
    const def = definitionFor(key);
    if (!def) { fields[key] = 'is not a recognised setting'; continue; }
    if (!canWrite(user, def)) { forbidden.push(key); continue; }
    const r = validateValue(def, raw);
    if (r.error) fields[key] = `${def.label} ${r.error}`;
    else normalised[key] = r.value;
  }
  if (forbidden.length) {
    throw new SettingsError(403, `Only a super admin can change: ${forbidden.join(', ')}`);
  }
  if (Object.keys(fields).length) throw new SettingsError(400, 'Some settings are invalid', fields);
  return { normalised };
}

const auditValue = (key, value) => (isEnvOnlyKey(key) ? '[redacted]' : value);

async function writeAudit({ user, req, action, oldData, newData, description }) {
  try {
    await db.AuditLog.create({
      user_id: user && user.id ? user.id : null,
      action,
      entity_type: 'platform_setting',
      entity_id: null,
      old_data: oldData,
      new_data: newData,
      description,
      ip_address: req && req.ip ? String(req.ip).slice(0, 45) : null,
      user_agent: req && req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
    });
  } catch (error) {
    // A failed audit write must not undo or hide a successful change.
    console.error('[PlatformSettingsService] audit write failed:', error.message);
  }
}

/**
 * Validates and persists a batch. All-or-nothing: one invalid value rejects
 * the whole batch, and the rows are written in one transaction.
 * Returns { changed: [keys], values: {key: typedValue} }.
 */
async function saveSettings(changes, { user, req } = {}) {
  const { normalised } = checkChanges(changes, user);
  const { Op } = db.Sequelize;
  const keys = Object.keys(normalised);

  const { oldData, newData } = await db.sequelize.transaction(async (transaction) => {
    const rows = await db.PlatformSetting.findAll({ where: { key: { [Op.in]: keys } }, transaction });
    // Grouped by canonical key: the IN lookup follows the column collation,
    // so a legacy variant spelling would otherwise make create() hit the
    // UNIQUE index. Such a row is updated (and its key repaired) instead.
    const byKey = new Map();
    for (const row of rows) {
      const k = canonicalKey(row.key);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(row);
    }
    const before = {};
    const after = {};
    for (const key of keys) {
      const def = definitionFor(key);
      const text = serialise(def, normalised[key]);
      const existing = byKey.get(key) || [];
      const previous = existing.length ? parseStored(def, existing[0].value) : def.default;
      if (existing.length && existing.every((r) => r.value === text && r.key === key)) continue;
      before[key] = auditValue(key, previous);
      after[key] = auditValue(key, normalised[key]);
      const patch = { value: text, updated_at: new Date() };
      if (existing.length) {
        patch.key = key;
        // Every duplicate is updated: a stale twin could otherwise be read back.
        for (const row of existing) await row.update(patch, { transaction });
      } else {
        await db.PlatformSetting.create({ key, ...patch, description: def.label }, { transaction });
      }
    }
    return { oldData: before, newData: after };
  });

  invalidate();
  const changed = Object.keys(newData);
  if (changed.length) {
    await writeAudit({
      user, req, action: 'platform_settings_updated', oldData, newData,
      description: `Platform settings changed: ${changed.join(', ')}`,
    });
  }
  return { changed, values: normalised };
}

module.exports = {
  canonicalKey,
  isVariantOfProtectedKey,
  ENV_ONLY_KEYS,
  MANAGED_KEYS,
  SettingsError,
  isManagedKey,
  isEnvOnlyKey,
  definitionFor,
  validateValue,
  validateNavConfig,
  canWrite,
  checkChanges,
  serialise,
  parseStored,
  defaults,
  getAll,
  getValue,
  getPublicConfig,
  describe,
  saveSettings,
  writeAudit,
  invalidate,
  __reset,
};
