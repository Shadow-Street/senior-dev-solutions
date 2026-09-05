const jwt = require("jsonwebtoken");
const AuthService = require("../services/AuthService");
const { validateRequiredFields } = require("../utils/validation");
const { User } = require("../models");

class AuthController {
  static async login(req, res) {
    try {
      const { email, password, role, recaptchaToken } = req.body;
      console.log(`login ${email} req.body`, req.body);

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
        role
      );

      AuthController.setAuthCookies(res, accessToken, refreshToken);

      req.session.user = { email, accessToken };
      console.log("Login successful", accessToken, refreshToken, user);

      return res
        .status(200)
        .json({ message: "Login successful", accessToken, refreshToken, user });
    } catch (error) {
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

      const { accessToken, refreshToken, user } = await AuthService.register(email, password, name, role);
      AuthController.setAuthCookies(res, accessToken, refreshToken);
      return res.status(201).json({ message: "Registration successful", accessToken, refreshToken, user });
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
}

module.exports = AuthController;
