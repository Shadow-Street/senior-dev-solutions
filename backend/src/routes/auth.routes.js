const express = require("express");
const AuthController = require("../controllers/AuthController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/google", AuthController.googleLogin);
router.get("/me", authenticate, AuthController.me);

module.exports = router;
