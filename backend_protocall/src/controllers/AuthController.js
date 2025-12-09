const jwt = require("jsonwebtoken");
const AuthService = require("../services/AuthService");
const { validateRequiredFields } = require("../utils/validation");

class AuthController {
  static async login(req, res) {
    try {
      const { email, password, role, recaptchaToken } = req.body;
      console.log(`login ${email} req.body`, req.body);

      const requiredFields = ["email", "password", "role"];

      const errorMessage = validateRequiredFields(requiredFields, req.body);
      if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
      }

      const { accessToken, refreshToken, user } = await AuthService.login(
        email,
        password,
        role
      );

      AuthController.setAuthCookies(res, accessToken, refreshToken);

      req.session.user = { email, accessToken };

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
      const { name, email, password, role, phone } = req.body;
      console.log(`register ${email} req.body`, req.body);

      const requiredFields = ["name", "email", "password"];

      const errorMessage = validateRequiredFields(requiredFields, req.body);
      if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
      }

      const user = await AuthService.register({
        name,
        email,
        password,
        role: role || 'user',
        phone
      });

      return res
        .status(201)
        .json({ message: "Registration successful", user });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(400).json({ error: error.message });
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
