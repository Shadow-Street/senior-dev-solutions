const express = require("express");
const FeatureController = require("../controllers/FeatureController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

router.get("/", FeatureController.listFeatures);
// Feature gating is platform configuration: reads are public (the SPA needs
// them before sign-in), writes were unauthenticated and are now admin-only.
router.post("/", authMiddleware, adminMiddleware, FeatureController.createFeature);
router.get("/:key", FeatureController.getFeature);
router.put("/:key", authMiddleware, adminMiddleware, FeatureController.updateFeature);
router.delete("/:id", authMiddleware, adminMiddleware, FeatureController.deleteFeature);

module.exports = router;
