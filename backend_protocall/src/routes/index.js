const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const pledgeRoutes = require("./pledge.routes");
const fundRoutes = require("./fund.routes");
const featureRoutes = require("./feature.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/pledges", pledgeRoutes);
router.use("/funds", fundRoutes);
router.use("/features", featureRoutes);

module.exports = router;
