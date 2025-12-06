const express = require("express");
const session = require("express-session");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const routes = require("./routes");
const WebSocketService = require("./services/WebSocketService");
require("dotenv").config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8080",
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

// Static files for uploads
app.use('/uploads', express.static('uploads'));

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
