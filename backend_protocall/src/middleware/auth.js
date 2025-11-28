const jwt = require("jsonwebtoken");
const { User } = require("../models");

async function authenticate(req, res, next) {
  try {
    // Check for token in headers or cookies
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
