const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User, OauthToken } = require("../models");

class SocialAuthService {
  static async verifyGoogleToken(accessToken) {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      return {
        id: response.data.sub,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
        email_verified: response.data.email_verified,
      };
    } catch (error) {
      console.error("Google token verification failed:", error);
      throw new Error("Invalid Google access token");
    }
  }

  static async verifyFacebookToken(accessToken) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
      );
      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture?.data?.url,
      };
    } catch (error) {
      console.error("Facebook token verification failed:", error);
      throw new Error("Invalid Facebook access token");
    }
  }

  static async handleSocialLogin(provider, socialUser, role = 'user') {
    // Check if user exists with this email
    let user = await User.findOne({ where: { email: socialUser.email } });

    if (!user) {
      // Create new user
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await User.create({
        name: socialUser.name,
        email: socialUser.email,
        password: randomPassword,
        role: role,
        avatar: socialUser.picture,
        email_verified: true,
        verify_step: 1,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
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
        avatar: user.avatar,
      },
    };
  }

  static async googleLogin(accessToken, role) {
    const googleUser = await this.verifyGoogleToken(accessToken);
    if (!googleUser.email) {
      throw new Error("Email not provided by Google");
    }
    return this.handleSocialLogin('google', googleUser, role);
  }

  static async facebookLogin(accessToken, role) {
    const facebookUser = await this.verifyFacebookToken(accessToken);
    if (!facebookUser.email) {
      throw new Error("Email not provided by Facebook. Please allow email access.");
    }
    return this.handleSocialLogin('facebook', facebookUser, role);
  }
}

module.exports = SocialAuthService;
