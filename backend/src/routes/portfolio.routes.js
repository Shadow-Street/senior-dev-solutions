const express = require("express");
const router = express.Router();
const PortfolioController = require("../controllers/PortfolioControllerV2");
const { authenticate } = require("../middleware/auth"); // Assuming auth middleware exists

// Apply auth middleware to all routes
router.use(authenticate);

router.get("/", PortfolioController.getPortfolio);
router.post("/", PortfolioController.addToPortfolio); // Add or Update
router.delete("/:symbol", PortfolioController.removeFromPortfolio);

module.exports = router;
