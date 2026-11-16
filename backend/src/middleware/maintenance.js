/**
 * Maintenance mode gate (platform setting `maintenance_mode`, super_admin).
 *
 * While on, API requests from anyone who is not staff get 503 with
 * `code: 'MAINTENANCE'` and the configured message. Staff (admin, super_admin,
 * sub_admin) are let through so they can work on the platform — that is the
 * admin bypass. A few paths always stay open:
 *   - /auth/* except /auth/register    so staff can sign in (and anyone can sign out);
 *   - /platform/settings/public-config the browser learns it is in maintenance;
 *   - /platform/settings/ads-status    read by every page;
 *   - /payments/webhook                Razorpay must still be able to settle payments.
 *
 * Fails open: if the setting cannot be read the request proceeds, because the
 * settings service already falls back to the default (off).
 */
const PlatformSettings = require('../services/PlatformSettingsService');
const { optionalAuthenticate } = require('./auth');

const STAFF_ROLES = new Set(['admin', 'super_admin', 'sub_admin']);
const ALWAYS_OPEN = [
  /^\/auth\/(?!register(\/|$))/i,
  /^\/platform\/settings\/public-config\/?$/,
  /^\/platform\/settings\/ads-status\/?$/,
  /^\/payments\/webhook(\/|$)/,
];

async function maintenanceGate(req, res, next) {
  let enabled = false;
  try {
    enabled = (await PlatformSettings.getValue('maintenance_mode')) === true;
  } catch {
    enabled = false;
  }
  if (!enabled) return next();
  if (ALWAYS_OPEN.some((re) => re.test(req.path))) return next();

  await optionalAuthenticate(req, res, () => {});
  const role = req.user ? req.user.app_role || req.user.role : null;
  // Same staff test as adminMiddleware (is_admin), plus sub_admin.
  if (req.user && (req.user.is_admin === true || (role && STAFF_ROLES.has(role)))) return next();

  let message = '';
  try { message = await PlatformSettings.getValue('maintenance_message'); } catch { /* default below */ }
  res.set('Retry-After', '600');
  res.set('Cache-Control', 'no-store');
  return res.status(503).json({
    error: message || 'The platform is undergoing maintenance. Please check back shortly.',
    code: 'MAINTENANCE',
    maintenance: true,
  });
}

module.exports = { maintenanceGate };
