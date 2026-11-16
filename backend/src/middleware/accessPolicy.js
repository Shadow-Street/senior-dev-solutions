/**
 * Sign-up and sign-in policy from the platform's Access & Security settings.
 *
 *   registration_enabled          -> POST /auth/register refused (403) while closed.
 *                                    (New Google accounts are refused in AuthService.)
 *   login_max_failed_attempts     -> per-account lockout after N consecutive
 *   login_lockout_minutes            failed password sign-ins (0 = off).
 *
 * The lockout complements the per-IP auth rate limiter in app.js: that one
 * stops one address hammering many accounts, this one stops many addresses
 * (a botnet) guessing one account's password.
 *
 * Counters are kept in memory, so they are per API process and reset on
 * restart. That is deliberate for now (no Redis requirement); with several API
 * instances the effective limit is N per instance. A successful sign-in clears
 * the counter (a password reset does not). Concurrent requests that arrive
 * before the first failure is counted are not all blocked. Note the usual trade-off: anyone who knows an address can lock
 * that account for the lockout period, which is why the setting defaults off.
 */
const PlatformSettings = require('../services/PlatformSettingsService');

async function registrationGate(_req, res, next) {
  let open = true;
  try { open = (await PlatformSettings.getValue('registration_enabled')) !== false; } catch { open = true; }
  if (open) return next();
  return res.status(403).json({
    error: 'New sign-ups are currently closed. Please check back later.',
    code: 'REGISTRATION_CLOSED',
  });
}

const failures = new Map(); // email -> { count, firstAt, lockedUntil }
const MAX_TRACKED = 50000;

// Folded the way the users.email collation compares (case, accents, outer
// spaces), so a variant spelling of the address shares the account's counter.
const normaliseEmail = (email) => (typeof email === 'string'
  ? email.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().slice(0, 254)
  : '');

async function lockoutPolicy() {
  try {
    const max = await PlatformSettings.getValue('login_max_failed_attempts');
    const minutes = await PlatformSettings.getValue('login_lockout_minutes');
    return { max: Number(max) || 0, windowMs: (Number(minutes) || 15) * 60 * 1000 };
  } catch {
    return { max: 0, windowMs: 15 * 60 * 1000 };
  }
}

function recordFailure(email, policy, now = Date.now()) {
  if (!email || !policy.max) return;
  let entry = failures.get(email);
  if (!entry || now - entry.firstAt > policy.windowMs) entry = { count: 0, firstAt: now, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= policy.max) entry.lockedUntil = now + policy.windowMs;
  if (!failures.has(email) && failures.size >= MAX_TRACKED) {
    // Bounded memory: drop the oldest entry (Map keeps insertion order).
    failures.delete(failures.keys().next().value);
  }
  failures.set(email, entry);
}

/**
 * Runs before AuthController.login. Refuses a locked account with 429, and
 * watches the response to count failures / clear the counter on success.
 */
async function loginLockout(req, res, next) {
  const rawEmail = req.body && req.body.email;
  // Only a single address string is a valid sign-in. An array would become an
  // IN (...) query further down and skip the per-account counter.
  if (rawEmail !== undefined && rawEmail !== null && typeof rawEmail !== 'string') {
    return res.status(400).json({ message: 'email must be a string' });
  }
  const email = normaliseEmail(rawEmail);
  const policy = await lockoutPolicy();
  if (!email || !policy.max) return next();

  const now = Date.now();
  const entry = failures.get(email);
  if (entry && entry.lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((entry.lockedUntil - now) / 60000));
    res.set('Retry-After', String(Math.ceil((entry.lockedUntil - now) / 1000)));
    return res.status(429).json({
      error: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      code: 'LOGIN_LOCKED',
    });
  }

  const send = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) failures.delete(email);
    else if (res.statusCode === 400 && body && body.error === 'Invalid email or password') recordFailure(email, policy);
    return send(body);
  };
  return next();
}

/** Test hook. */
function resetLoginFailures() {
  failures.clear();
}

module.exports = { registrationGate, loginLockout, resetLoginFailures };
