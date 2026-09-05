const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { authenticate, adminMiddleware } = require("../middleware/auth");

// All admin routes require authentication and admin role
router.use(authenticate, adminMiddleware);

router.get("/dashboard-stats", AdminController.getDashboardStats);
router.get("/users", AdminController.listUsers);
router.get("/subscription-analytics", AdminController.getSubscriptionAnalytics);
router.put("/users/:id", AdminController.updateUserStatus);

module.exports = router;
