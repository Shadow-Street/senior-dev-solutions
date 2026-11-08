/**
 * Admin control of the DhanHQ market-data credential (BE-10).
 *
 * Mounted at /api/admin/market-data. admin / super_admin only, rate-limited per
 * signed-in admin, and every change is written to the audit log.
 *
 *   GET  /dhan         status only: configured, masked client id, expiry, last
 *                      renewal, last error, whether the provider is active, and
 *                      the size/age of the NSE snapshot
 *   PUT  /dhan         { clientId, accessToken } - verified against Dhan's
 *                      profile endpoint first; a token Dhan rejects is NOT stored
 *   POST /dhan/renew   renew the stored token now (RenewToken)
 *   POST /dhan/test    check the stored token against Dhan without changing it
 *
 * The access token is write-only: no response, error message, log line or audit
 * row ever contains it.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../models');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const { dhanCredentials, CredentialError } = require('../services/DhanCredentialService');
const { FinDataService } = require('../services/FinDataService');

const router = express.Router();
router.use(authenticate, adminMiddleware);

// Keyed by the signed-in admin (not the IP): see the note in withdrawalAdmin.routes.js.
const limiter = (max) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  keyGenerator: (req) => `market-data:${req.user.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
const readLimiter = limiter(120);
const writeLimiter = limiter(10);

function audit(req, action, extra = {}) {
  return db.AuditLog.create({
    user_id: req.user.id,
    action,
    entity_type: 'provider_credential',
    entity_id: null,
    old_data: null,
    new_data: extra, // codes, masked ids and timestamps only - never the token
    description: action,
    ip_address: req.ip ? String(req.ip).slice(0, 45) : null,
    user_agent: req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null,
  }).catch((e) => console.error('[marketDataAdmin] audit write failed:', e && e.name));
}

function statusPayload() {
  const info = FinDataService.snapshot.getInfo();
  return {
    ...dhanCredentials.getStatus(),
    provider_active: FinDataService.dhanActive,
    universe_size: info.universe_size,
    quotes_in_snapshot: info.quotes_in_snapshot,
    snapshot_at: info.snapshot_at,
    snapshot_stale: info.stale,
    market_open: info.market_open,
    snapshot_error: info.last_error,
  };
}

function fail(res, err, label) {
  if (err instanceof CredentialError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error(`[marketDataAdmin] ${label} failed:`, err && err.name);
  return res.status(500).json({ error: 'Internal server error' });
}

router.get('/dhan', readLimiter, async (req, res) => {
  try {
    await dhanCredentials.load();
    res.set('Cache-Control', 'no-store');
    return res.json(statusPayload());
  } catch (err) {
    return fail(res, err, 'status');
  }
});

router.put('/dhan', writeLimiter, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (typeof body.clientId !== 'string' || typeof body.accessToken !== 'string') {
    return res.status(400).json({ error: 'clientId and accessToken are required', code: 'invalid_input' });
  }
  try {
    await dhanCredentials.setCredentials({ clientId: body.clientId, accessToken: body.accessToken, actorId: req.user.id });
    const status = statusPayload();
    await audit(req, 'market_data.dhan.update', { client_id_masked: status.client_id_masked, expires_at: status.expires_at });
    res.set('Cache-Control', 'no-store');
    return res.json(status);
  } catch (err) {
    if (err instanceof CredentialError) await audit(req, 'market_data.dhan.update_rejected', { code: err.code });
    return fail(res, err, 'update');
  }
});

router.post('/dhan/renew', writeLimiter, async (req, res) => {
  try {
    await dhanCredentials.load();
    await dhanCredentials.renew({ force: true });
    const status = statusPayload();
    await audit(req, 'market_data.dhan.renew', { status: status.status, expires_at: status.expires_at });
    res.set('Cache-Control', 'no-store');
    if (status.status === 'lapsed') {
      return res.status(409).json({
        error: 'The Dhan token has lapsed and cannot be renewed. Generate a new token at web.dhan.co and paste it here.',
        code: 'lapsed',
        ...status,
      });
    }
    return res.json(status);
  } catch (err) {
    if (err instanceof CredentialError) await audit(req, 'market_data.dhan.renew_failed', { code: err.code });
    return fail(res, err, 'renew');
  }
});

router.post('/dhan/test', writeLimiter, async (req, res) => {
  try {
    await dhanCredentials.load();
    const result = await dhanCredentials.test();
    await audit(req, 'market_data.dhan.test', { ok: result.ok, reason: result.reason || null });
    res.set('Cache-Control', 'no-store');
    return res.json({ ...result, status: statusPayload() });
  } catch (err) {
    return fail(res, err, 'test');
  }
});

module.exports = router;
