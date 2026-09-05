const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, OauthToken } = require("../models");

class AuthService {
  static async getUser(email) {
    const where = { email };
    // if (role) {
    //   where.role = role;
    // }
    return User.findOne({ where });
  }

  static async login(email, password) {
    const user = await this.getUser(email);
    console.log("User found", user);
    if (!user) {
      console.log("User not found");
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Incorrect password");
     
      throw new Error("Incorrect password");
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );

    await OauthToken.create({
      user_id: user.id,
      refresh_token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    console.log("Login successful", accessToken, refreshToken, user);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
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
      role,
      verify_step: 1
    });

    return this.login(email, password, role);
  }

  static async googleLogin(token, role = 'user') {
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
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, email },
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
        role: user.role,
        app_role: user.app_role,
        is_premium: user.is_premium,
        profile_image_url: user.profile_image_url,
      },
    };
  }
}

module.exports = AuthService;
