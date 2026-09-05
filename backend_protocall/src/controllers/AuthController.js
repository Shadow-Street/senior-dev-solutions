const jwt = require("jsonwebtoken");
const AuthService = require("../services/AuthService");
const SocialAuthService = require("../services/SocialAuthService");
const PasswordResetService = require("../services/PasswordResetService");
const { validateRequiredFields } = require("../utils/validation");

class AuthController {
  static async login(req, res) {
    try {
      const { email, password, role } = req.body;
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

      return res.status(200).json({ 
        message: "Login successful", 
        accessToken, 
        refreshToken, 
        user 
      });
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

      return res.status(201).json({ message: "Registration successful", user });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
      const result = await PasswordResetService.requestPasswordReset(email, frontendUrl);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async verifyResetToken(req, res) {
    try {
      const { token, code } = req.body;
      
      if (token) {
        const result = await PasswordResetService.verifyToken(token);
        return res.status(200).json(result);
      } else if (code) {
        const result = await PasswordResetService.verifyCode(code);
        return res.status(200).json(result);
      } else {
        return res.status(400).json({ message: "Token or code is required" });
      }
    } catch (error) {
      console.error("Verify reset token error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, code, password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "New password is required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      let result;
      if (token) {
        result = await PasswordResetService.resetPassword(token, password);
      } else if (code) {
        result = await PasswordResetService.resetPasswordWithCode(code, password);
      } else {
        return res.status(400).json({ message: "Token or code is required" });
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async googleLogin(req, res) {
    try {
      const { accessToken, role } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ message: "Google access token is required" });
      }

      const result = await SocialAuthService.googleLogin(accessToken, role || 'user');
      AuthController.setAuthCookies(res, result.accessToken, result.refreshToken);
      
      return res.status(200).json({ 
        message: "Google login successful", 
        ...result 
      });
    } catch (error) {
      console.error("Google login error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async facebookLogin(req, res) {
    try {
      const { accessToken, role } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ message: "Facebook access token is required" });
      }

      const result = await SocialAuthService.facebookLogin(accessToken, role || 'user');
      AuthController.setAuthCookies(res, result.accessToken, result.refreshToken);
      
      return res.status(200).json({ 
        message: "Facebook login successful", 
        ...result 
      });
    } catch (error) {
      console.error("Facebook login error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const newAccessToken = jwt.sign(
        { id: decoded.id, role: decoded.role, email: decoded.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      console.error("Refresh token error:", error);
      return res.status(401).json({ error: "Invalid refresh token" });
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
