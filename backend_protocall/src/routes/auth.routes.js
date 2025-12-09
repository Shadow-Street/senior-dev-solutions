const express = require("express");
const AuthController = require("../controllers/AuthController");

const router = express.Router();

// Basic auth
router.post("/login", AuthController.login);
router.post("/register", AuthController.register);

// Password reset
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-reset-token", AuthController.verifyResetToken);
router.post("/reset-password", AuthController.resetPassword);

// Social auth
router.post("/google", AuthController.googleLogin);
router.post("/facebook", AuthController.facebookLogin);

// Token refresh
router.post("/refresh-token", AuthController.refreshToken);

module.exports = router;
