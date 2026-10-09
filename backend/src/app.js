const express = require("express");
const path = require("path");
const session = require("express-session");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const routes = require("./routes");
const WebSocketService = require("./services/WebSocketService");
require("dotenv").config();

const app = express();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Security response headers. crossOriginResourcePolicy is relaxed because the
// SPA on another origin loads avatars and documents from /api/files/view.
app.use(helmet({
  contentSecurityPolicy: false, // the SPA is served separately; CSP belongs there
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

/**
 * Brute-force protection on credential endpoints.
 *
 * Login, register and password reset had no throttle at all, so an attacker
 * could try passwords as fast as the network allowed. Counted per IP; successful
 * logins are not counted, so a legitimate user is never locked out by their own
 * activity.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:5173", "http://localhost:8081","http://192.168.31.128:5173", "http://98.87.150.151"],
  credentials: true,
}));


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Static files for uploads.
//
// Only the `public/` prefix is served directly. `private/` documents (SEBI
// certificates, KYC, invoices) are reachable only through
// GET /api/files/view/<key>, which checks ownership before serving — without
// this split, the local-disk fallback would publish every private document.
/**
 * Legacy flat uploads.
 *
 * Files written before the key layout existed live directly at uploads/<name>.
 * Restricting the mount to uploads/public made every one of them 404 — poll
 * visuals and profile images among them — so they are served here.
 *
 * Deliberately only a single path segment: anything containing a slash falls
 * through, which keeps uploads/invoices and uploads/private unreachable by
 * this route. The resolved path is also checked to be inside the uploads
 * directory, so an encoded traversal cannot climb out.
 */
const UPLOADS_ROOT = path.resolve('uploads');

app.use('/uploads', (req, res, next) => {
  let rel;
  try {
    rel = decodeURIComponent(req.path).replace(/^\/+/, '');
  } catch {
    return next(); // malformed percent-encoding
  }
  if (!rel || rel.includes('/') || rel.includes('\\') || rel.includes('..')) {
    return next();
  }
  const target = path.resolve(UPLOADS_ROOT, rel);
  if (!target.startsWith(UPLOADS_ROOT + path.sep)) return next();
  return res.sendFile(target, (err) => (err ? next() : undefined));
});

// Only the public/ prefix of the new layout is served directly; private/
// documents go through GET /api/files/view/<key>, which checks ownership.
app.use('/uploads/public', express.static(path.join('uploads', 'public')));

// Throttle only the credential endpoints; the rest of the API is unaffected.
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Start heartbeat checking
wsService.startHeartbeat();

// Make wsService available globally for use in controllers
app.set('wsService', wsService);

// Export both app and server
module.exports = { app, server, wsService };
