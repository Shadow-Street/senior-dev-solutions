/**
 * Throttles for endpoints where a *failed* request is the abuse signal: guessing
 * promo codes through /subscriptions/promo-codes/validate or /payments/create-order.
 * Only responses with status >= 400 count, so a customer who gets their code
 * right is never slowed down by it.
 *
 * Two budgets, as a pair:
 *   ip   - runs before authentication, so floods of unauthenticated or
 *          throwaway-account traffic from one address are counted too;
 *   user - runs after authentication and is keyed by the account, so rotating
 *          IPs does not reset an attacker's allowance, and, behind a proxy
 *          without `trust proxy` where every caller shares one IP, one person
 *          cannot use up everyone else's budget.
 *
 * Call once per route: each call creates its own counters.
 */
const rateLimit = require('express-rate-limit');

function failureLimiters({ windowMs = 15 * 60 * 1000, perIp = 100, perUser = 20, message = 'Too many attempts. Please try again later.' } = {}) {
  const base = {
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    // skipSuccessfulRequests only skips status < 400; that is the behaviour wanted here.
    message: { error: message },
  };
  return {
    ip: rateLimit({ ...base, max: perIp }),
    user: rateLimit({ ...base, max: perUser, keyGenerator: (req) => `user:${req.user && req.user.id ? req.user.id : req.ip}` }),
  };
}

/**
 * A plain per-account budget (every request counts). For endpoints where each call
 * costs something even when it succeeds, e.g. /payments/verify makes two gateway
 * calls. Must run after authentication.
 */
function userLimiter({ windowMs = 15 * 60 * 1000, max = 60, message = 'Too many requests. Please try again later.' } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    keyGenerator: (req) => `user:${req.user && req.user.id ? req.user.id : req.ip}`,
  });
}

module.exports = { failureLimiters, userLimiter };
