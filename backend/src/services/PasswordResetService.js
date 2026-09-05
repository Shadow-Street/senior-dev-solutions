const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const EmailService = require("./EmailService");

// In-memory store for password reset tokens (use Redis/DB in production)
const resetTokens = new Map();

class PasswordResetService {
  static generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  static generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async requestPasswordReset(email, frontendUrl) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Don't reveal if user exists or not
      return { success: true, message: "If the email exists, a reset link has been sent." };
    }

    const token = this.generateToken();
    const code = this.generateCode();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    // Store token with user info
    resetTokens.set(token, {
      userId: user.id,
      email: user.email,
      code,
      expiresAt,
    });

    // Also store by code for verification
    resetTokens.set(`code:${code}`, {
      userId: user.id,
      email: user.email,
      token,
      expiresAt,
    });

    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await EmailService.sendPasswordResetEmail(email, code, resetUrl);
      return { success: true, message: "Password reset email sent successfully." };
    } catch (error) {
      console.error("Failed to send reset email:", error);
      throw new Error("Failed to send password reset email. Please try again later.");
    }
  }

  static async verifyToken(token) {
    const data = resetTokens.get(token);
    
    if (!data) {
      throw new Error("Invalid or expired reset token");
    }

    if (Date.now() > data.expiresAt) {
      resetTokens.delete(token);
      throw new Error("Reset token has expired");
    }

    return { valid: true, email: data.email };
  }

  static async verifyCode(code) {
    const data = resetTokens.get(`code:${code}`);
    
    if (!data) {
      throw new Error("Invalid or expired reset code");
    }

    if (Date.now() > data.expiresAt) {
      resetTokens.delete(`code:${code}`);
      throw new Error("Reset code has expired");
    }

    return { valid: true, email: data.email, token: data.token };
  }

  static async resetPassword(token, newPassword) {
    const data = resetTokens.get(token);
    
    if (!data) {
      throw new Error("Invalid or expired reset token");
    }

    if (Date.now() > data.expiresAt) {
      resetTokens.delete(token);
      throw new Error("Reset token has expired");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await User.update(
      { password: hashedPassword, updated_at: new Date() },
      { where: { id: data.userId } }
    );

    // Clean up tokens
    resetTokens.delete(token);
    if (data.code) {
      resetTokens.delete(`code:${data.code}`);
    }

    return { success: true, message: "Password reset successfully." };
  }

  static async resetPasswordWithCode(code, newPassword) {
    const data = resetTokens.get(`code:${code}`);
    
    if (!data) {
      throw new Error("Invalid or expired reset code");
    }

    return this.resetPassword(data.token, newPassword);
  }
}

module.exports = PasswordResetService;
