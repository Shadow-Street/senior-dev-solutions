const express = require("express");
const FeatureController = require("../controllers/FeatureController");

const router = express.Router();

router.get("/", FeatureController.listFeatures);
router.get("/:key", FeatureController.getFeature);
router.put("/:key", FeatureController.updateFeature);

module.exports = router;
