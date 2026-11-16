const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require("../middleware/auth");
const { ADS_ENABLED_KEY, coerceBoolean, isAdsEnabled, writeAdsEnabled } = require("../utils/adsSetting");
const PlatformSettings = require("../services/PlatformSettingsService");
const { effectiveRole } = require("../utils/roles");

// Platform Settings
const settingsRouter = express.Router();

/**
 * Settings whose values must never reach a non-staff caller.
 *
 * platform_settings started as a catalogue of harmless site copy — name,
 * contact address, social links — and is read anonymously by the footer and
 * the contact page, so the collection is public. It is now also where the
 * admin panel stores the payment gateway credentials, which means the
 * Razorpay *secret* key and webhook secret were being served to anyone who
 * asked for `GET /api/platform/settings`. Verified before this change:
 * an anonymous request returned the secret in full.
 *
 * Matching is on the key name rather than a fixed list, so a credential added
 * later is covered by default. Note `razorpay_key_id` is deliberately NOT
 * secret: it is the publishable key and the checkout needs it in the browser.
 */
// Secret by default: anything named like a credential (…secret, …password,
// …token, …credentials, …webhook_url, or any …key / …Key) is blanked for
// non-staff. Only the publishable values the browser checkout needs are
// exempt. A new credential screen is therefore covered without remembering to
// update this list.
const SECRET_KEY_PATTERN = /(secret|password|passwd|token|credentials?|webhook_?url|_key|apikey)$|(^|_)(secret|password)(_|$)/i;
const PUBLIC_SETTING_KEYS = new Set(['razorpay_key_id', 'stripe_publishable_key']);

const isSecretKey = (key) => {
  const name = String(key || '');
  return !PUBLIC_SETTING_KEYS.has(name.toLowerCase()) && SECRET_KEY_PATTERN.test(name);
};

/** Managed settings that are not meant for the browser (lockout thresholds, notification defaults, ...). */
const isPrivateManagedKey = (key) => {
  const def = PlatformSettings.definitionFor(key);
  return Boolean(def && !def.public);
};

// sub_admin is not implicit staff: it gets only what Roles & Permissions grants (middleware/permissions.js).
const isStaffRequest = (req) =>
  ['admin', 'super_admin'].includes(req.user?.app_role || req.user?.role);

/**
 * Blank out secret values for anyone who is not staff. Keys that belong in the
 * server environment only (payment secrets, the retired API Credentials
 * screen) are blanked for staff too: no screen needs them, and a value left
 * over from the old screens must not travel to any browser.
 */
const redactForCaller = (req, rows) => {
  const staff = isStaffRequest(req);
  const hide = (row) => {
    const plain = typeof row?.toJSON === 'function' ? row.toJSON() : { ...row };
    if ((!staff && (isSecretKey(plain.key) || isPrivateManagedKey(plain.key))) || PlatformSettings.isEnvOnlyKey(plain.key)) {
      plain.value = null;
      plain.redacted = true;
    }
    return plain;
  };
  return Array.isArray(rows) ? rows.map(hide) : hide(rows);
};

const settingsController = createCrudController(db.PlatformSetting, {
  defaultOrderBy: 'key',
  defaultOrder: 'ASC'
});

/**
 * Redacting wrapper around the generated list/get.
 *
 * Done here rather than inside the CRUD factory because the rule is specific
 * to this collection: it is the only public catalogue that also holds
 * credentials.
 */
const listWithRedaction = async (req, res) => {
  const send = res.json.bind(res);
  res.json = (body) => send(Array.isArray(body) ? redactForCaller(req, body) : body);
  return settingsController.list(req, res);
};

const getWithRedaction = async (req, res) => {
  const send = res.json.bind(res);
  res.json = (body) =>
    send(body && body.key !== undefined ? redactForCaller(req, body) : body);
  return settingsController.get(req, res);
};

/**
 * Global advertisement switch.
 *
 * GET is public on purpose: signed-out visitors and every client need it to
 * decide whether to render sponsored content, and it exposes one boolean.
 * PUT is admin / super_admin only and takes exactly `{ enabled: boolean }`.
 * Registered before `/key/:key` and the generated CRUD so nothing shadows it.
 */
settingsRouter.get('/ads-status', async (_req, res) => {
  try {
    const enabled = await isAdsEnabled();
    res.set('Cache-Control', 'no-store');
    res.json({ enabled });
  } catch (error) {
    console.error('[platform.routes.js] ads-status read failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

settingsRouter.put('/ads-status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const enabled = coerceBoolean(body.enabled);
    if (enabled === null) {
      return res.status(400).json({ error: '`enabled` must be true or false' });
    }

    const { previous, setting } = await writeAdsEnabled(enabled, req.user.id);

    // Audit trail: who flipped it, from what to what. A failed audit write
    // must not undo or hide a successful change.
    try {
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'ads_enabled_changed',
        entity_type: 'platform_setting',
        entity_id: setting && setting.id ? setting.id : null,
        old_data: { enabled: previous },
        new_data: { enabled },
        description: `Advertisements ${enabled ? 'enabled' : 'disabled'}`,
        ip_address: req.ip ? String(req.ip).slice(0, 45) : null,
        user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null
      });
    } catch (auditError) {
      console.error('[platform.routes.js] ads audit write failed:', auditError.message);
    }

    res.set('Cache-Control', 'no-store');
    res.json({ enabled });
  } catch (error) {
    console.error('[platform.routes.js] ads-status update failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Public configuration: the managed settings the browser needs before (or
 * without) sign-in — site identity, SEO defaults, support contact, referral
 * rules, sign-up / maintenance state, sidebar configuration. Typed values,
 * defaults filled in, never a secret (only registry keys marked public).
 */
settingsRouter.get('/public-config', async (_req, res) => {
  try {
    const config = await PlatformSettings.getPublicConfig();
    res.set('Cache-Control', 'no-store');
    res.json(config);
  } catch (error) {
    console.error('[platform.routes.js] public-config failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const sendSettingsError = (res, error, where) => {
  if (error instanceof PlatformSettings.SettingsError) {
    return res.status(error.status).json({ error: error.message, ...(error.fields ? { fields: error.fields } : {}) });
  }
  console.error(`[platform.routes.js] ${where} failed:`, error);
  return res.status(500).json({ error: 'Internal server error' });
};

/**
 * Admin view of every managed setting: registry metadata plus current values.
 * admin / super_admin only; security settings are listed for admins too but
 * flagged so the screen shows them read-only.
 */
settingsRouter.get('/managed', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const values = await PlatformSettings.getAll();
    res.set('Cache-Control', 'no-store');
    res.json({
      definitions: PlatformSettings.describe(),
      values,
      can_edit_security: effectiveRole(req.user) === 'super_admin',
    });
  } catch (error) {
    sendSettingsError(res, error, 'managed read');
  }
});

/**
 * Validated, audited batch save: `{ settings: { key: value, ... } }`.
 * Unknown keys, env-only secrets and invalid values are rejected (400, with a
 * per-field message); security keys need super_admin (403). All-or-nothing.
 */
settingsRouter.put('/managed', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { settings } = req.body || {};
    const result = await PlatformSettings.saveSettings(settings, { user: req.user, req });
    res.set('Cache-Control', 'no-store');
    res.json({ changed: result.changed, values: await PlatformSettings.getAll() });
  } catch (error) {
    sendSettingsError(res, error, 'managed save');
  }
});

/**
 * Which server-side integrations are configured. Booleans and the Razorpay
 * mode only (derived from the publishable key id prefix) — never a value.
 * Credentials are set in the server environment, not from the browser.
 */
const isSet = (name) => typeof process.env[name] === 'string' && process.env[name].trim() !== '';
settingsRouter.get('/integrations-status', authMiddleware, adminMiddleware, (_req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const mode = keyId.startsWith('rzp_live_') ? 'live' : keyId.startsWith('rzp_test_') ? 'test' : null;
  res.set('Cache-Control', 'no-store');
  res.json({
    razorpay: { configured: isSet('RAZORPAY_KEY_ID') && isSet('RAZORPAY_KEY_SECRET'), mode, webhook_configured: isSet('RAZORPAY_WEBHOOK_SECRET') },
    integrations: [
      { id: 'google_signin', name: 'Google sign-in', configured: isSet('GOOGLE_CLIENT_ID'), env: ['GOOGLE_CLIENT_ID'] },
      { id: 'email', name: 'Email (SMTP)', configured: isSet('SMTP_USER') && isSet('SMTP_PASS'), env: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'] },
      { id: 'storage', name: 'File storage (S3)', configured: isSet('AWS_S3_BUCKET') || isSet('AWS_BUCKET_NAME'), env: ['AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] },
      { id: 'news', name: 'Market news (Marketaux)', configured: isSet('MARKETAUX_API_KEY'), env: ['MARKETAUX_API_KEY'] },
      { id: 'fundamentals', name: 'Company data (Finnhub)', configured: isSet('FINNHUB_API_KEY'), env: ['FINNHUB_API_KEY'] },
      { id: 'ai', name: 'AI assistant (Gemini)', configured: isSet('GEMINI_API_KEY'), env: ['GEMINI_API_KEY'] },
      { id: 'cache', name: 'Cache (Redis)', configured: isSet('REDIS_URL'), env: ['REDIS_URL'] },
    ],
  });
});

// Get setting by key
settingsRouter.get('/key/:key', optionalAuthenticate, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await db.PlatformSetting.findOne({
      where: { key }
    });
    if (!setting) return res.json({ key, value: null });
    res.json(redactForCaller(req, setting));
  } catch (error) {
    console.error('[platform.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk get settings
settingsRouter.post('/bulk-get', optionalAuthenticate, async (req, res) => {
  try {
    const { keys } = req.body || {};
    if (!Array.isArray(keys) || keys.length > 200 || !keys.every((k) => typeof k === 'string')) {
      return res.status(400).json({ error: '`keys` must be a list of setting names' });
    }
    const settings = await db.PlatformSetting.findAll({
      where: { key: { [db.Sequelize.Op.in]: keys } }
    });

    const staff = isStaffRequest(req);
    const result = {};
    settings.forEach((s) => {
      result[s.key] = (!staff && (isSecretKey(s.key) || isPrivateManagedKey(s.key))) || PlatformSettings.isEnvOnlyKey(s.key) ? null : s.value;
    });
    res.json(result);
  } catch (error) {
    console.error('[platform.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upsert setting. Admin-only: any signed-in user could previously rewrite
// settings such as advisorApprovalRequired or razorpay_key_id.
// Managed keys are validated and role-checked exactly as PUT /managed does.
settingsRouter.put('/key/:key', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body || {};

    // ads_enabled has a dedicated, validated, audited endpoint (/ads-status).
    if (key === ADS_ENABLED_KEY) {
      return res.status(400).json({ error: 'Use PUT /platform/settings/ads-status to change this setting' });
    }
    const refusal = refuseKey(key);
    if (refusal) return res.status(refusal.status).json({ error: refusal.error });
    if (PlatformSettings.isManagedKey(key)) {
      await PlatformSettings.saveSettings({ [key]: value }, { user: req.user, req });
      const setting = await db.PlatformSetting.findOne({ where: { key } });
      return res.json(setting);
    }

    const [setting] = await db.PlatformSetting.upsert({
      key,
      value,
      updated_by: req.user.id,
      updated_at: new Date()
    });

    res.json(setting);
  } catch (error) {
    sendSettingsError(res, error, 'key upsert');
  }
});

/** Every `key` named anywhere in a request body (bounded walk). */
const keysIn = (node, out = new Set(), depth = 0) => {
  if (!node || typeof node !== 'object' || depth > 4) return out;
  if (Array.isArray(node)) { node.forEach((n) => keysIn(n, out, depth + 1)); return out; }
  if (node.key !== undefined) out.add(String(node.key));
  Object.values(node).forEach((v) => keysIn(v, out, depth + 1));
  return out;
};

const KEY_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

/**
 * Keys no generic write may name: the ads switch (own endpoint), env-only
 * secrets, any spelling variant of a protected key (the column is UNIQUE
 * under a case-insensitive collation, so `MAINTENANCE_MODE` *is* the
 * maintenance row to MySQL), and anything that is not a plain key name.
 * Returns { status, error } or null.
 */
function refuseKey(key) {
  const raw = String(key ?? '');
  if (!KEY_PATTERN.test(raw)) return { status: 400, error: 'Setting keys may only contain letters, digits, _ . and -' };
  if (PlatformSettings.isVariantOfProtectedKey(raw)) return { status: 400, error: 'Use the exact lower-case setting name' };
  if (raw === ADS_ENABLED_KEY) return { status: 403, error: 'The advertisement setting can only be changed from Ad Management' };
  if (PlatformSettings.isEnvOnlyKey(raw)) return { status: 403, error: 'This value is configured in the server environment and cannot be stored here' };
  return null;
}

/**
 * Guard for the generated CRUD writes (create, update/delete by id, bulk).
 *
 *  - ads_enabled, env-only secrets, variant spellings: refused (refuseKey).
 *  - a write by id must name a row that exists (the id is decoded the way the
 *    route will decode it, so a percent-encoded id cannot slip past the
 *    lookup), and may not rename the row.
 *  - managed keys: bulk writes refused (they would skip validation); creating
 *    a second row for one refused; single create/update validated and
 *    role-checked by the settings registry, and audited once it succeeds —
 *    other admin screens that still write through the generic API
 *    (commission rate, for one) keep working but cannot store a bad value.
 */
const guardGenericWrites = async (req, res, next) => {
  try {
    const rawSegment = req.path.split('/').filter(Boolean)[0];
    let segment;
    try {
      segment = rawSegment === undefined ? undefined : decodeURIComponent(rawSegment);
    } catch {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const isBulk = segment === 'bulk';
    const pathId = segment && !isBulk ? segment : null;
    const ids = pathId ? [pathId] : [];
    const body = req.body;
    if (body && typeof body === 'object' && body.ids !== undefined && body.ids !== null) {
      // A single id is accepted by Sequelize in the bulk routes too, so
      // normalise rather than only checking arrays.
      ids.push(...[].concat(body.ids));
    }

    const bodyKeys = keysIn(body);
    for (const k of bodyKeys) {
      const refusal = refuseKey(k);
      if (refusal) return res.status(refusal.status).json({ error: refusal.error });
    }

    let rows = [];
    if (ids.length) {
      rows = await db.PlatformSetting.findAll({
        where: { id: { [db.Sequelize.Op.in]: ids.map(String) } }
      });
      // Fail closed: a by-id write whose row we cannot see is not let through.
      if (pathId && !rows.length) return res.status(404).json({ error: 'Record not found' });
    }
    for (const row of rows) {
      const refusal = refuseKey(row.key);
      if (refusal) {
        return res.status(refusal.status === 400 ? 403 : refusal.status).json({ error: refusal.status === 400 ? 'This setting can only be changed from Platform Settings' : refusal.error });
      }
    }
    if (pathId && body && typeof body === 'object' && body.key !== undefined && String(body.key) !== rows[0].key) {
      return res.status(400).json({ error: 'A setting cannot be renamed' });
    }

    const allKeys = new Set([...bodyKeys, ...rows.map((r) => r.key)]);
    const managed = [...allKeys].filter((k) => PlatformSettings.isManagedKey(k));
    if (!managed.length) return next();

    if (isBulk || managed.length > 1) {
      return res.status(403).json({ error: 'Use PUT /platform/settings/managed to change platform settings' });
    }

    const key = managed[0];
    const def = PlatformSettings.definitionFor(key);
    if (!PlatformSettings.canWrite(req.user, def)) {
      return res.status(403).json({ error: `Only a super admin can change ${key}` });
    }

    let row = rows[0] || null;
    if (!pathId && req.method === 'POST') {
      row = await db.PlatformSetting.findOne({ where: { key } });
      if (row) return res.status(409).json({ error: `${key} already exists; update it instead` });
    }
    const previous = row ? PlatformSettings.parseStored(def, row.value) : def.default;
    let nextValue = previous;
    if (req.method !== 'DELETE') {
      const raw = body && Object.prototype.hasOwnProperty.call(body, 'value') ? body.value : row ? row.value : undefined;
      const checked = PlatformSettings.validateValue(def, raw);
      if (checked.error) {
        return res.status(400).json({ error: 'Some settings are invalid', fields: { [key]: `${def.label} ${checked.error}` } });
      }
      // Store the normalised text so every reader sees the same form.
      if (body && Object.prototype.hasOwnProperty.call(body, 'value')) body.value = PlatformSettings.serialise(def, checked.value);
      nextValue = checked.value;
    } else {
      nextValue = def.default;
    }

    res.on('finish', () => {
      if (res.statusCode >= 300) return;
      PlatformSettings.invalidate();
      PlatformSettings.writeAudit({
        user: req.user, req, action: 'platform_settings_updated',
        oldData: { [key]: previous }, newData: { [key]: nextValue },
        description: `Platform setting ${req.method === 'DELETE' ? 'reset' : 'changed'}: ${key}`,
      });
    });
    next();
  } catch (error) {
    console.error('[platform.routes.js] settings write guard failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
settingsRouter.use((req, res, next) => {
  if (READ_METHODS.has(req.method)) return next();
  authMiddleware(req, res, (err) => {
    if (err) return next(err);
    adminMiddleware(req, res, (err2) => (err2 ? next(err2) : guardGenericWrites(req, res, next)));
  });
});

// Redacting reads are registered ahead of the generated CRUD so they take
// precedence; writes stay staff-only through the factory below.
settingsRouter.get('/', optionalAuthenticate, listWithRedaction);
settingsRouter.get('/:id', optionalAuthenticate, getWithRedaction);

createCrudRoutes(settingsRouter, settingsController, { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] });
router.use('/settings', settingsRouter);

/**
 * Community figures for the member dashboard. Before this the dashboard
 * counted `GET /users`, which a member may only read for themself, so every
 * member saw "Active Traders: 1". `traders` is the number of active member
 * accounts, raised to the admin-set floor (Platform Settings > Site,
 * `community_traders_display_min`). Aggregates only; cached for a minute.
 */
let communityCache = { at: 0, value: null };
router.get('/community-stats', async (_req, res) => {
  try {
    if (!communityCache.value || Date.now() - communityCache.at > 60_000) {
      const { Op } = require('sequelize');
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const active = { status: 'active', email: { [Op.notLike]: '%@deleted.protocall.invalid' } };
      const [members, joinedThisWeek, floor] = await Promise.all([
        db.User.count({ where: active }),
        db.User.count({ where: { ...active, created_at: { [Op.gte]: weekAgo } } }),
        PlatformSettings.getValue('community_traders_display_min'),
      ]);
      const min = Number.isInteger(Number(floor)) && Number(floor) > 0 ? Number(floor) : 0;
      communityCache = { at: Date.now(), value: { traders: Math.max(members, min), joined_this_week: joinedThisWeek } };
    }
    res.set('Cache-Control', 'no-store');
    res.json(communityCache.value);
  } catch (error) {
    console.error('[platform.routes.js] community-stats failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.resetCommunityCache = () => { communityCache = { at: 0, value: null }; };

module.exports = router;
module.exports.isSecretKey = isSecretKey;
