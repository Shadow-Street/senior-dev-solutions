const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, OauthToken } = require("../models");

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
    const user = await this.getUser(email);
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Incorrect password");
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

  static async googleLogin(token, role = 'user', context = {}) {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Create new user if not exists
      user = await User.create({
        email,
        name,
        google_id: googleId,
        profile_image_url: picture,
        role,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random password
        verify_step: 1
      });
    } else {
      // Update existing user with google info if missing
      if (!user.google_id) {
        user.google_id = googleId;
        if (!user.profile_image_url) user.profile_image_url = picture;
        await user.save();
      }
    }

    // Generate tokens
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
