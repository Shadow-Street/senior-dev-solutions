const jwt = require("jsonwebtoken");
const { User } = require("../models");

async function authenticate(req, res, next) {
  try {
    // Check for token in headers or cookies
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies?.accessToken;

    if (!token) {
      console.log("Auth Fail: No token provided");
      return res.status(401).json({ error: "No authentication token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Auth Decoded:", decoded);

    // Get user
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      console.log("Auth Fail: User not found for ID:", decoded.id);
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "Please log in to access this resource"
    });
  }

  // Standardized role checking with priority: app_role > role > is_admin
  const userRole = req.user.app_role || req.user.role;
  const isAdmin =
    req.user.is_admin === true ||
    userRole === 'admin' ||
    userRole === 'super_admin';

  if (!isAdmin) {
    return res.status(403).json({
      error: "Admin access required",
      message: "You don't have permission to perform this action"
    });
  }

  next();
}

/**
 * Attaches req.user when a valid token is present, but never rejects.
 *
 * For endpoints that are readable by anyone yet behave differently for a
 * signed-in caller (a public catalogue where the owner also sees drafts).
 * A malformed or expired token is treated exactly like no token — it must not
 * grant access, and it must not 500.
 */
async function optionalAuthenticate(req, _res, next) {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") || req.cookies?.accessToken;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    if (user) req.user = user;
  } catch {
    // Anonymous is a valid outcome here.
  }
  return next();
}

module.exports = { authenticate, authMiddleware: authenticate, optionalAuthenticate, adminMiddleware };
