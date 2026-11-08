const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require("../middleware/auth");
const { ADS_ENABLED_KEY, coerceBoolean, isAdsEnabled, writeAdsEnabled } = require("../utils/adsSetting");

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

const isStaffRequest = (req) =>
  ['admin', 'super_admin', 'sub_admin'].includes(req.user?.app_role || req.user?.role);

/** Blank out secret values for anyone who is not staff. */
const redactForCaller = (req, rows) => {
  if (isStaffRequest(req)) return rows;
  const hide = (row) => {
    const plain = typeof row?.toJSON === 'function' ? row.toJSON() : { ...row };
    if (isSecretKey(plain.key)) {
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
    const { keys } = req.body;
    const settings = await db.PlatformSetting.findAll({
      where: { key: { [db.Sequelize.Op.in]: keys } }
    });

    const staff = isStaffRequest(req);
    const result = {};
    settings.forEach((s) => {
      result[s.key] = !staff && isSecretKey(s.key) ? null : s.value;
    });
    res.json(result);
  } catch (error) {
    console.error('[platform.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upsert setting. Admin-only: any signed-in user could previously rewrite
// settings such as advisorApprovalRequired or razorpay_key_id.
settingsRouter.put('/key/:key', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // ads_enabled has a dedicated, validated, audited endpoint (/ads-status).
    if (key === ADS_ENABLED_KEY) {
      return res.status(400).json({ error: 'Use PUT /platform/settings/ads-status to change this setting' });
    }

    const [setting] = await db.PlatformSetting.upsert({
      key,
      value,
      updated_by: req.user.id,
      updated_at: new Date()
    });

    res.json(setting);
  } catch (error) {
    console.error('[platform.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ads_enabled may only change through PUT /ads-status (validated + audited).
 * The generated CRUD below would otherwise let an admin create, rewrite or
 * delete the row unvalidated and unaudited; deleting it re-enables ads.
 * Applied to every non-read request that reaches the generated routes
 * (create, update/delete by id, bulk). Runs after auth so anonymous callers
 * get 401/403 without a database lookup.
 */
const namesAdsKey = (node, depth = 0) => {
  if (!node || typeof node !== 'object' || depth > 4) return false;
  if (Array.isArray(node)) return node.some((n) => namesAdsKey(n, depth + 1));
  if (node.key === ADS_ENABLED_KEY) return true;
  return Object.values(node).some((v) => namesAdsKey(v, depth + 1));
};

const refuseAdsKeyWrites = async (req, res, next) => {
  try {
    const segment = req.path.split('/').filter(Boolean)[0];
    const ids = [];
    if (segment && segment !== 'bulk') ids.push(segment);
    const body = req.body;
    if (body && typeof body === 'object') {
      // A single id is accepted by Sequelize in the bulk routes too, so
      // normalise rather than only checking arrays.
      if (body.ids !== undefined && body.ids !== null) ids.push(...[].concat(body.ids));
    }

    let blocked = namesAdsKey(body);
    if (!blocked && ids.length) {
      const hit = await db.PlatformSetting.findOne({
        where: { id: { [db.Sequelize.Op.in]: ids.map(String) }, key: ADS_ENABLED_KEY }
      });
      blocked = Boolean(hit);
    }
    if (blocked) {
      return res.status(403).json({ error: 'The advertisement setting can only be changed from Ad Management' });
    }
    next();
  } catch (error) {
    console.error('[platform.routes.js] ads key guard failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
settingsRouter.use((req, res, next) => {
  if (READ_METHODS.has(req.method)) return next();
  authMiddleware(req, res, (err) => {
    if (err) return next(err);
    adminMiddleware(req, res, (err2) => (err2 ? next(err2) : refuseAdsKeyWrites(req, res, next)));
  });
});

// Redacting reads are registered ahead of the generated CRUD so they take
// precedence; writes stay staff-only through the factory below.
settingsRouter.get('/', optionalAuthenticate, listWithRedaction);
settingsRouter.get('/:id', optionalAuthenticate, getWithRedaction);

createCrudRoutes(settingsRouter, settingsController, { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] });
router.use('/settings', settingsRouter);

module.exports = router;
module.exports.isSecretKey = isSecretKey;
