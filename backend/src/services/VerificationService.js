const crypto = require("crypto");
const { Op } = require("sequelize");
const db = require("../models");
const EmailService = require("./EmailService");

/**
 * One-time codes for registration OTP and password reset.
 *
 * Design follows the refresh-token handling already in this codebase: the raw
 * value goes to the user's inbox, only a SHA-256 hash is stored, and a code is
 * single-use. Three further rules matter:
 *
 *  - Issuing a new code invalidates the outstanding ones for that purpose, so
 *    a resend cannot leave several valid codes in flight.
 *  - Verification counts attempts and burns the code after a handful of wrong
 *    guesses; a six-digit OTP with unlimited tries is not a barrier.
 *  - Nothing here reveals whether an address is registered. That is the
 *    caller's job too, and the password-reset route is written to match.
 */

const OTP_TTL_MINUTES = 10;
const RESET_TTL_MINUTES = 30;
const MAX_ATTEMPTS = 5;

const PURPOSE = {
  EMAIL: "email_verification",
  RESET: "password_reset",
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

/** Six digits, uniformly distributed — Math.random() is not used for secrets. */
const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

/** A long opaque token for reset links, where there is no need to type it. */
const generateResetToken = () => crypto.randomBytes(32).toString("hex");

/**
 * Replace any outstanding codes for this user+purpose and store the new hash.
 * Returns the raw value, which is the only moment it exists in plaintext.
 */
async function issue(user, purpose) {
  await db.VerificationCode.update(
    { consumed_at: new Date() },
    {
      where: {
        user_id: user.id,
        purpose,
        consumed_at: null,
      },
    }
  );

  const raw = purpose === PURPOSE.RESET ? generateResetToken() : generateOtp();
  const ttl = purpose === PURPOSE.RESET ? RESET_TTL_MINUTES : OTP_TTL_MINUTES;

  await db.VerificationCode.create({
    user_id: user.id,
    email: user.email,
    purpose,
    code_hash: sha256(raw),
    expires_at: new Date(Date.now() + ttl * 60 * 1000),
  });

  return raw;
}

/**
 * Check a submitted code.
 *
 * Returns `{ ok: true, record }` or `{ ok: false, reason }`. Reasons are
 * deliberately coarse ('invalid' | 'expired' | 'too_many_attempts') so the
 * caller can be helpful without describing the stored state precisely.
 */
async function verify(email, purpose, rawCode) {
  const record = await db.VerificationCode.findOne({
    where: {
      email: String(email || "").toLowerCase().trim(),
      purpose,
      consumed_at: null,
    },
    order: [["created_at", "DESC"]],
  });

  if (!record) return { ok: false, reason: "invalid" };

  if (record.attempts >= MAX_ATTEMPTS) {
    await record.update({ consumed_at: new Date() });
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.expires_at.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // Constant-time compare so a wrong code cannot be narrowed down by timing.
  const submitted = Buffer.from(sha256(rawCode), "utf8");
  const stored = Buffer.from(record.code_hash, "utf8");
  const match =
    submitted.length === stored.length && crypto.timingSafeEqual(submitted, stored);

  if (!match) {
    await record.increment("attempts");
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, record };
}

/** Mark a verified code used, so it cannot be replayed. */
async function consume(record) {
  await record.update({ consumed_at: new Date() });
}

/** Housekeeping: drop codes that expired long ago. */
async function prune() {
  await db.VerificationCode.destroy({
    where: { expires_at: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}

// --- Delivery ---------------------------------------------------------------

async function sendRegistrationOtp(user) {
  const code = await issue(user, PURPOSE.EMAIL);
  await EmailService.sendEmail(
    user.email,
    "Your Protocall verification code",
    EmailService.getOtpTemplate(user.display_name || user.name || "there", code, OTP_TTL_MINUTES)
  );
  return code;
}

async function sendPasswordReset(user, resetBaseUrl) {
  const token = await issue(user, PURPOSE.RESET);
  const link = `${String(resetBaseUrl).replace(/\/$/, "")}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  await EmailService.sendEmail(
    user.email,
    "Reset your Protocall password",
    EmailService.getPasswordResetTemplate(
      user.display_name || user.name || "there",
      link,
      RESET_TTL_MINUTES
    )
  );
  return token;
}

module.exports = {
  PURPOSE,
  OTP_TTL_MINUTES,
  RESET_TTL_MINUTES,
  MAX_ATTEMPTS,
  issue,
  verify,
  consume,
  prune,
  sendRegistrationOtp,
  sendPasswordReset,
};
