const bcrypt = require("bcryptjs");

// A valid bcrypt hash (cost 10) of a random string nobody knows; used only to
// spend the same time on unknown accounts as on real ones.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(require("crypto").randomBytes(16).toString("hex"), 10);
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, OauthToken, VerificationCode } = require("../models");
const { effectiveRole } = require("../utils/roles");
const SubscriptionService = require("./SubscriptionService");

/**
 * Token lifetimes.
 *
 * The access token used to live 7 days, which meant a stolen one was useful for
 * a week and there was nothing a refresh token could add. It is now short, and
 * the refresh token — which can be revoked server-side — carries the session.
 * Both are overridable so deployments can tune them without a code change.
 */
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || "30d";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Refresh tokens are stored only as a hash; see the OauthToken model. */
const hashToken = (raw) =>
  crypto.createHash("sha256").update(String(raw)).digest("hex");

const userPayload = (user) => ({
  id: user.id,
  name: user.name,
  display_name: user.display_name,
  email: user.email,
  role: user.role,
  app_role: user.app_role,
  is_premium: user.is_premium,
  profile_image_url: user.profile_image_url,
});

const GOOGLE_ERRORS = {
  GOOGLE_NOT_CONFIGURED: 'Google sign-in is not available right now.',
  GOOGLE_TOKEN_INVALID: 'Google sign-in failed. Please try again.',
  GOOGLE_EMAIL_UNVERIFIED: 'Your Google account email is not verified. Verify it with Google, or sign in with email.',
  GOOGLE_ACCOUNT_MISMATCH: 'This email is linked to a different Google account. Sign in with email instead.',
  GOOGLE_LINK_NOT_ALLOWED: 'An account with this email already exists. Sign in with your email and password instead.',
};
const googleError = (code) => Object.assign(new Error(GOOGLE_ERRORS[code]), { code });

// Accounts that hold money, KYC or admin power never gain Google sign-in by
// auto-linking: a Google account is a weaker credential than their password.
const NO_GOOGLE_AUTOLINK_ROLES = new Set(['super_admin', 'admin', 'sub_admin', 'advisor', 'portfolio_manager']);

/**
 * Google is authoritative for an address only for Gmail and for Workspace
 * accounts whose hosted domain (`hd`) is the address's own domain. A consumer
 * Google account registered on another address was checked once and may have
 * outlived the mailbox, so it may create a new account but not take over an
 * existing one.
 */
const googleOwnsAddress = (email, hd) => {
  const domain = email.split('@')[1] || '';
  return domain === 'gmail.com' || domain === 'googlemail.com' || (typeof hd === 'string' && hd.toLowerCase() === domain);
};

// One client for the process, so Google's signing certificates are cached
// instead of fetched on every attempt (forged ones included).
let googleClient = null;
let googleClientFor = null;
const getGoogleClient = (clientId) => {
  if (!googleClient || googleClientFor !== clientId) {
    const { OAuth2Client } = require('google-auth-library');
    googleClient = new OAuth2Client(clientId);
    googleClientFor = clientId;
  }
  return googleClient;
};

const unusablePassword = () => bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

class AuthService {
  /**
   * Issues an access/refresh pair and records the refresh hash.
   *
   * `context` carries a coarse client fingerprint so a user can later be shown
   * their active sessions; it is never used to make an auth decision, since
   * both values are client-controlled.
   */
  static async issueTokens(user, context = {}) {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TTL }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh", jti: crypto.randomUUID() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TTL }
    );

    await OauthToken.create({
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      user_agent: String(context.userAgent || "").slice(0, 255) || null,
      ip_address: String(context.ip || "").slice(0, 64) || null,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Exchanges a refresh token for a fresh pair, rotating it.
   *
   * Reuse is treated as theft. If a token arrives that was already rotated or
   * logged out, the value has been in two places at once, so every refresh
   * token for that user is revoked and they must sign in again — better one
   * forced login than an attacker holding a live session.
   */
  static async rotateRefreshToken(rawToken, context = {}) {
    if (!rawToken) throw new Error("Refresh token required");

    let decoded;
    try {
      decoded = jwt.verify(rawToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new Error("Invalid or expired refresh token");
    }
    if (decoded.type !== "refresh") {
      // An access token must not be usable here.
      throw new Error("Invalid or expired refresh token");
    }

    const tokenHash = hashToken(rawToken);
    const record = await OauthToken.findOne({ where: { token_hash: tokenHash } });

    if (!record) throw new Error("Invalid or expired refresh token");

    if (record.revoked_at) {
      // Distinguish theft from a stale client.
      //
      // A token that was *rotated* (so it has a successor) and then presented
      // again means the value existed in two places: revoke the whole family.
      // A token revoked by an ordinary logout is just a tab that did not get
      // the memo — refusing it is enough. Treating both the same way meant
      // logging out on one device could knock out every other device.
      if (record.replaced_by_hash) {
        await OauthToken.update(
          { revoked_at: new Date() },
          { where: { user_id: record.user_id, revoked_at: null } }
        );
        throw new Error("Refresh token reuse detected; all sessions revoked");
      }
      throw new Error("Invalid or expired refresh token");
    }

    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await User.findByPk(record.user_id);
    if (!user) throw new Error("Invalid or expired refresh token");

    const issued = await this.issueTokens(user, context);

    record.revoked_at = new Date();
    record.replaced_by_hash = hashToken(issued.refreshToken);
    await record.save();

    return { ...issued, user: userPayload(user) };
  }

  /** Revokes one session. Unknown or already-revoked tokens succeed quietly. */
  static async revokeRefreshToken(rawToken) {
    if (!rawToken) return;
    await OauthToken.update(
      { revoked_at: new Date() },
      { where: { token_hash: hashToken(rawToken), revoked_at: null } }
    );
  }

  /** Revokes every session for a user (password change, admin action). */
  static async revokeAllForUser(userId) {
    await OauthToken.update(
      { revoked_at: new Date() },
      { where: { user_id: userId, revoked_at: null } }
    );
  }

  /** Drops rows that are expired or long revoked, so the table does not grow forever. */
  static async pruneTokens() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return OauthToken.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: new Date() } },
          { revoked_at: { [Op.lt]: cutoff } },
        ],
      },
    });
  }
  static async getUser(email) {
    const where = { email };
    // if (role) {
    //   where.role = role;
    // }
    return User.findOne({ where });
  }

  static async login(email, password, context = {}) {
    // One message for both failures, so the login form cannot be used to
    // discover which addresses have accounts (forgot-password already
    // follows this rule).
    // Unknown accounts still pay for a bcrypt comparison, so response time
    // does not reveal whether the address exists.
    const user = await this.getUser(email);
    if (!user || !user.password) {
      await bcrypt.compare(String(password || ''), DUMMY_PASSWORD_HASH);
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    /**
     * Registration is a two-step flow now, so an account that never confirmed
     * its emailed code must not be able to sign in — otherwise the code is
     * decorative. Accounts created before verification existed are backfilled
     * to verified in table.sql, so nobody is locked out retroactively.
     */
    if (user.email_verified === false) {
      const error = new Error("Confirm your email address to finish signing up.");
      error.code = "EMAIL_NOT_VERIFIED";
      error.email = user.email;
      throw error;
    }

    // One place issues tokens, so lifetimes and the stored hash cannot drift
    // between the password and Google paths.
    const { accessToken, refreshToken } = await this.issueTokens(user, context);

    // Deliberately not logged: this printed both tokens in clear text, so
    // anyone with log access held live credentials.
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        app_role: user.app_role,
        is_premium: user.is_premium,
        profile_image_url: user.profile_image_url,
        step: user.verify_step,
      },
    };
  }

  static async register(email, password, name, role = 'user') {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      display_name: name,
      role,
      verify_step: 1,
      email_verified: false,
    });

    // Everyone starts on the Free plan, as a real subscription row.
    await SubscriptionService.ensureFreeSubscriptionSafely(user.id);

    /**
     * Returns the account, not a session.
     *
     * This used to end with `this.login(...)`, which signed the new account in
     * immediately. With email confirmation in the flow that is both wrong and
     * now impossible — login refuses an unverified account, so registering
     * would fail on its own last line. The caller sends the code and the
     * session is issued once the code comes back.
     */
    return { user };
  }

  /**
   * Signs in with a Google ID token (the `credential` from Google Identity
   * Services), creating the account on first use.
   *
   * Fails closed:
   *   - without GOOGLE_CLIENT_ID the audience check would be skipped, so a
   *     token minted for any other Google app would be accepted;
   *   - Google must vouch for the address (email_verified);
   *   - the account is found by Google subject first; an account linked to a
   *     different Google identity is refused;
   *   - an existing account is auto-linked only when Google owns the address
   *     (Gmail / matching Workspace domain) and the account is not staff,
   *     advisor or portfolio manager;
   *   - linking an account whose email was never verified also replaces its
   *     password and ends its sessions: nobody proved that password belongs to
   *     the mailbox owner, so it may be an attacker's pre-registration.
   *
   * Errors carry `code` and a generic message; the controller never forwards
   * library messages to the browser.
   */
  static async googleLogin(token, role = 'user', context = {}) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw googleError('GOOGLE_NOT_CONFIGURED');

    let payload;
    try {
      const ticket = await getGoogleClient(clientId).verifyIdToken({ idToken: token, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw googleError('GOOGLE_TOKEN_INVALID');
    }
    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email || !payload.sub) throw googleError('GOOGLE_TOKEN_INVALID');
    if (payload.email_verified !== true && payload.email_verified !== 'true') {
      throw googleError('GOOGLE_EMAIL_UNVERIFIED');
    }
    const googleId = String(payload.sub);
    // Bounded to the columns (name STRING(100) NOT NULL, profile_image_url STRING(255)).
    const name = String(payload.name || email.split('@')[0]).trim().slice(0, 100) || email.split('@')[0].slice(0, 100);
    const picture =
      typeof payload.picture === 'string' && payload.picture.startsWith('https://') && payload.picture.length <= 255
        ? payload.picture
        : null;

    let user = (await User.findOne({ where: { google_id: googleId } })) || (await User.findOne({ where: { email } }));

    if (!user) {
      user = await User.create({
        email,
        name,
        display_name: name,
        google_id: googleId,
        profile_image_url: picture,
        role,
        // Unusable random password: the account signs in through Google until
        // the owner sets one with "forgot password".
        password: await unusablePassword(),
        verify_step: 1,
        // Google has verified the address, so there is no OTP step.
        email_verified: true,
      });
      await SubscriptionService.ensureFreeSubscriptionSafely(user.id);
    } else if (user.google_id) {
      if (user.google_id !== googleId) throw googleError('GOOGLE_ACCOUNT_MISMATCH');
    } else {
      if (NO_GOOGLE_AUTOLINK_ROLES.has(effectiveRole(user)) || !googleOwnsAddress(email, payload.hd)) {
        throw googleError('GOOGLE_LINK_NOT_ALLOWED');
      }
      user.google_id = googleId;
      if (!user.profile_image_url && picture) user.profile_image_url = picture;
      const preRegistered = user.email_verified === false;
      if (preRegistered) {
        // Whoever created the unverified row loses every way back in. Codes
        // and sessions go first: if the save below fails, the row is still
        // unverified (its password unusable for login) and nothing is left open.
        await VerificationCode.update(
          { consumed_at: new Date() },
          { where: { user_id: user.id, consumed_at: null } }
        );
        await this.revokeAllForUser(user.id);
        user.email_verified = true;
        user.password = await unusablePassword();
      }
      await user.save();
    }

    // One place issues tokens, so lifetimes and the stored hash cannot drift
    // between the password and Google paths.
    const { accessToken, refreshToken } = await this.issueTokens(user, context);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        app_role: user.app_role,
        is_premium: user.is_premium,
        profile_image_url: user.profile_image_url,
      },
    };
  }
}

module.exports = AuthService;
