const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware, optionalAuthenticate } = require("../middleware/auth");

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
const SECRET_KEY_PATTERN = /(secret|password|passwd|private_key|api_secret|access_token|refresh_token|_pass)$|(^|_)(secret|password)(_|$)/i;

const isSecretKey = (key) => SECRET_KEY_PATTERN.test(String(key || ''));

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

// Upsert setting
settingsRouter.put('/key/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

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

// Redacting reads are registered ahead of the generated CRUD so they take
// precedence; writes stay staff-only through the factory below.
settingsRouter.get('/', optionalAuthenticate, listWithRedaction);
settingsRouter.get('/:id', optionalAuthenticate, getWithRedaction);

createCrudRoutes(settingsRouter, settingsController, { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] });
router.use('/settings', settingsRouter);

module.exports = router;
