const bcrypt = require("bcryptjs");
const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { User, OauthToken } = require("../models");

class AuthService {
  static async getUser(email, role) {
    const where = { email };
    if (role) {
      where.role = role;
    }
    return User.findOne({ where });
  }

  static async register({ name, email, password, role, phone }) {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      phone: phone || null,
      verify_step: 0,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  }

  static async login(email, password, role) {
    const user = await this.getUser(email, role);
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid =
      (user.password.length === 32 && md5(password) === user.password) ||
      (await bcrypt.compare(password, user.password));

    if (!isPasswordValid) {
      throw new Error("Incorrect password");
    }

    const accessToken = jwt.sign(
      { id: user.id, role, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role, email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    await OauthToken.create({
      user_id: user.id,
      refresh_token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role || user.role,
        step: user.verify_step,
      },
    };
  }
}

module.exports = AuthService;
