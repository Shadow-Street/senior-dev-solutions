const jwt = require("jsonwebtoken");
const AuthService = require("../services/AuthService");
const { validateRequiredFields } = require("../utils/validation");
const { User } = require("../models");
const bcrypt = require("bcryptjs");
const VerificationService = require("../services/VerificationService");
const EmailService = require("../services/EmailService");

class AuthController {
  static async login(req, res) {
    try {
      const { email, password, role, recaptchaToken } = req.body;
      // Not logged: req.body carries the plaintext password.

      const requiredFields = [
        "email",
        "password",
        // "role",
        // "recaptchaToken",
      ];

      const errorMessage = validateRequiredFields(requiredFields, req.body);
      if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
      }

      // If you have recaptcha verification, place it here:
      // await AuthController.validateRecaptcha(recaptchaToken);

      const { accessToken, refreshToken, user } = await AuthService.login(
        email,
        password,
        { userAgent: req.get("user-agent"), ip: req.ip }
      );

      AuthController.setAuthCookies(res, accessToken, refreshToken);

      req.session.user = { email, accessToken };
      // Not logged: this printed both tokens in clear text.

      return res
        .status(200)
        .json({ message: "Login successful", accessToken, refreshToken, user });
    } catch (error) {
      // An unverified account is not a credentials failure: the client needs
      // to know to show the code step rather than "wrong password".
      if (error.code === "EMAIL_NOT_VERIFIED") {
        return res.status(403).json({
          error: error.message,
          requiresVerification: true,
          email: error.email,
        });
      }
      console.error("Login error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async register(req, res) {
    try {
      const { email, password, name, role } = req.body;
      const requiredFields = ["email", "password", "name"];
      const errorMessage = validateRequiredFields(requiredFields, req.body);
      if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
      }

      const { user } = await AuthService.register(email, password, name, role);

      /**
       * No session is issued here any more.
       *
       * Registration now has a second step: the address has to be confirmed
       * with an emailed code before the account can be used. Returning tokens
       * at this point would make that step optional, since the client would
       * already be signed in. The response says what the client must do next
       * rather than handing it a session.
       */
      await VerificationService.sendRegistrationOtp(user);

      return res.status(201).json({
        message: "Check your email for the verification code.",
        requiresVerification: true,
        email: user.email,
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async googleLogin(req, res) {
    try {
      const { token, role } = req.body;
      if (!token) return res.status(400).json({ message: "Token is required" });

      const { accessToken, refreshToken, user } = await AuthService.googleLogin(token, role);
      AuthController.setAuthCookies(res, accessToken, refreshToken);

      // Also set session
      req.session.user = { email: user.email, accessToken };

      return res.status(200).json({ message: "Google login successful", accessToken, refreshToken, user });
    } catch (error) {
      console.error("Google login error:", error);
      return res.status(400).json({ error: error.message });
    }
  }


static async me(req, res) {
  try {
    // req.user is set by auth middleware (JWT)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await User.findOne({
      where: { id: req.user.id },
      attributes: [
        "id",
        "name",
        // The UI reads display_name everywhere; omitting it here meant the
        // session user arrived without the field the whole app renders.
        "display_name",
        "email",
        "role",
        "app_role",
        "status",
        "is_premium",
        "verify_step",
        "profile_image_url",
        "created_at"
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Optional security checks
    if (user.status === "banned") {
      return res.status(403).json({ error: "Account is banned" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ error: "Account is inactive" });
    }

    return res.json(user);
  } catch (error) {
    console.error("ME API ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}



  /**
   * Exchanges a refresh token for a new pair.
   *
   * The token is read from the httpOnly cookie first and the body second, so a
   * cookie-based client never has to put it in JavaScript's reach, while the
   * SPA (which keeps tokens in localStorage) can still refresh.
   *
   * Always 401 on failure, with the cookies cleared, so a client that has been
   * revoked stops retrying and falls back to the login screen.
   */
  static async refresh(req, res) {
    try {
      const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!rawToken) {
        return res.status(401).json({ error: "Refresh token required" });
      }

      const { accessToken, refreshToken, user } =
        await AuthService.rotateRefreshToken(rawToken, {
          userAgent: req.get("user-agent"),
          ip: req.ip,
        });

      AuthController.setAuthCookies(res, accessToken, refreshToken);
      return res.status(200).json({ accessToken, refreshToken, user });
    } catch (error) {
      // Reuse detection is worth recording; the token value itself is not.
      console.warn("Refresh failed:", error.message);
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(401).json({ error: error.message });
    }
  }

  /** Ends this session by revoking its refresh token server-side. */
  static async logout(req, res) {
    try {
      const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await AuthService.revokeRefreshToken(rawToken);
      if (req.session) req.session.destroy(() => {});
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(200).json({ message: "Logged out" });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(200).json({ message: "Logged out" });
    }
  }

  /** Signs the user out of every device. */
  static async logoutAll(req, res) {
    try {
      await AuthService.revokeAllForUser(req.user.id);
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(200).json({ message: "All sessions revoked" });
    } catch (error) {
      console.error("Logout-all error:", error);
      return res.status(500).json({ error: "Could not revoke sessions" });
    }
  }

  static setAuthCookies(res, accessToken, refreshToken) {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  // --- Email verification --------------------------------------------------

  /**
   * Confirm a registration OTP and start the session.
   *
   * The code is checked against a stored hash with an attempt ceiling; see
   * VerificationService. Only on success is the account marked verified and a
   * token pair issued.
   */
  static async verifyOtp(req, res) {
    try {
      const email = String(req.body?.email || "").toLowerCase().trim();
      const code = String(req.body?.code || "").trim();
      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }

      const result = await VerificationService.verify(
        email,
        VerificationService.PURPOSE.EMAIL,
        code
      );

      if (!result.ok) {
        const messages = {
          expired: "That code has expired. Request a new one.",
          too_many_attempts: "Too many incorrect attempts. Request a new code.",
          invalid: "That code is not correct.",
        };
        return res.status(400).json({ error: messages[result.reason] || messages.invalid });
      }

      const user = await User.findByPk(result.record.user_id);
      if (!user) return res.status(400).json({ error: "That code is not correct." });

      await VerificationService.consume(result.record);
      await user.update({ email_verified: true, verify_step: 2 });

      const { accessToken, refreshToken } = await AuthService.issueTokens(user, {
        userAgent: req.get("user-agent"),
        ip: req.ip,
      });
      AuthController.setAuthCookies(res, accessToken, refreshToken);

      // Welcome mail is best-effort: EmailService swallows its own failures,
      // and a mail problem must not fail a verification that already succeeded.
      EmailService.sendEmail(
        user.email,
        "Welcome to Protocall",
        EmailService.getWelcomeEmailTemplate(user.display_name || user.name || "there")
      );

      return res.status(200).json({
        message: "Email verified",
        accessToken,
        refreshToken,
        user: AuthController.publicUser(user),
      });
    } catch (error) {
      console.error("[auth] verifyOtp failed:", error);
      return res.status(500).json({ error: "Could not verify that code" });
    }
  }

  /** Issue a fresh OTP, invalidating any still outstanding. */
  static async resendOtp(req, res) {
    try {
      const email = String(req.body?.email || "").toLowerCase().trim();
      if (!email) return res.status(400).json({ error: "Email is required" });

      const user = await User.findOne({ where: { email } });
      // Same response either way: this endpoint must not report which
      // addresses are registered.
      if (user && !user.email_verified) {
        await VerificationService.sendRegistrationOtp(user);
      }
      return res.status(200).json({ message: "If that account needs verifying, a new code is on its way." });
    } catch (error) {
      console.error("[auth] resendOtp failed:", error);
      return res.status(500).json({ error: "Could not send a new code" });
    }
  }

  // --- Password reset ------------------------------------------------------

  /**
   * Start a reset.
   *
   * Always answers the same way. Reporting "no such account" here would turn
   * the endpoint into a membership oracle — paste a list of addresses, learn
   * which ones hold accounts on a financial platform.
   */
  static async forgotPassword(req, res) {
    const sameAnswer = {
      message: "If an account exists for that address, a reset link is on its way.",
    };
    try {
      const email = String(req.body?.email || "").toLowerCase().trim();
      if (!email) return res.status(400).json({ error: "Email is required" });

      const user = await User.findOne({ where: { email } });
      if (user) {
        const base =
          process.env.PUBLIC_APP_URL ||
          req.get("origin") ||
          `${req.protocol}://${req.get("host")}`;
        await VerificationService.sendPasswordReset(user, base);
      }
      return res.status(200).json(sameAnswer);
    } catch (error) {
      console.error("[auth] forgotPassword failed:", error);
      // Still the same answer: an internal failure must not leak existence.
      return res.status(200).json(sameAnswer);
    }
  }

  /** Complete a reset, then end every existing session for that account. */
  static async resetPassword(req, res) {
    try {
      const email = String(req.body?.email || "").toLowerCase().trim();
      const token = String(req.body?.token || "").trim();
      const password = String(req.body?.password || "");

      if (!email || !token || !password) {
        return res.status(400).json({ error: "Email, token and a new password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Use at least 8 characters for your new password." });
      }

      const result = await VerificationService.verify(
        email,
        VerificationService.PURPOSE.RESET,
        token
      );
      if (!result.ok) {
        return res.status(400).json({
          error:
            result.reason === "expired"
              ? "That reset link has expired. Request a new one."
              : "That reset link is not valid. Request a new one.",
        });
      }

      const user = await User.findByPk(result.record.user_id);
      if (!user) return res.status(400).json({ error: "That reset link is not valid." });

      await user.update({ password: await bcrypt.hash(password, 10) });
      await VerificationService.consume(result.record);

      /**
       * Revoke every refresh token for the account.
       *
       * Resetting a password is what someone does when they believe it is
       * compromised. Leaving existing sessions alive would let whoever had
       * access keep it, which defeats the point of the reset.
       */
      try {
        await AuthService.revokeAllForUser(user.id);
      } catch (revokeError) {
        console.error("[auth] could not revoke sessions after reset:", revokeError);
      }

      EmailService.sendEmail(
        user.email,
        "Your Protocall password was changed",
        `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
           <h2 style="color:#6D28D9;">Your password was changed</h2>
           <p>If this was you, there is nothing to do. You have been signed out everywhere and will need to sign in again.</p>
           <p><strong>If this was not you, contact support immediately.</strong></p>
         </div>`
      );

      return res.status(200).json({ message: "Password updated. You can sign in now." });
    } catch (error) {
      console.error("[auth] resetPassword failed:", error);
      return res.status(500).json({ error: "Could not reset the password" });
    }
  }

  /** Response-safe projection of a user record. */
  static publicUser(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      display_name: user.display_name,
      role: user.role,
      app_role: user.app_role,
      profile_image_url: user.profile_image_url,
      is_premium: user.is_premium,
      email_verified: user.email_verified,
    };
  }
}

module.exports = AuthController;
