const express = require("express");
const FeatureController = require("../controllers/FeatureController");

const router = express.Router();

router.get("/", FeatureController.listFeatures);
router.post("/", FeatureController.createFeature);
router.get("/:key", FeatureController.getFeature);
router.put("/:key", FeatureController.updateFeature);
router.delete("/:id", FeatureController.deleteFeature);

module.exports = router;
