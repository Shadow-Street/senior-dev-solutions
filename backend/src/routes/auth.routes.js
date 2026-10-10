const express = require("express");
const AuthController = require("../controllers/AuthController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/google", AuthController.googleLogin);
router.get("/me", authenticate, AuthController.me);

// Token lifecycle. /refresh is deliberately not behind `authenticate`: it is
// called precisely when the access token has expired.
// Email verification (registration OTP)
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/resend-otp", AuthController.resendOtp);

// Password reset
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.post("/logout-all", authenticate, AuthController.logoutAll);

module.exports = router;
