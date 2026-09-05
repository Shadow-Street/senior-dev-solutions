const express = require("express");
const router = express.Router();
const WatchlistController = require("../controllers/WatchlistController");
const { authenticate } = require("../middleware/auth");

// Apply auth middleware to all routes
router.use(authenticate);

router.get("/", WatchlistController.getWatchlist);
router.post("/", WatchlistController.addToWatchlist);
router.delete("/:symbol", WatchlistController.removeFromWatchlist);

module.exports = router;
