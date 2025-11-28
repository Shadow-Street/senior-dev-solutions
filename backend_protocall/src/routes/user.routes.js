const express = require("express");
const UserController = require("../controllers/UserController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/me", authenticate, UserController.me);
router.put("/me", authenticate, UserController.update);
router.get("/", authenticate, UserController.list);

module.exports = router;
