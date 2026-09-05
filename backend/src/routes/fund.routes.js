const express = require("express");
const FundController = require("../controllers/FundController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/transactions", authenticate, FundController.createTransaction);
router.get("/transactions", FundController.listTransactions);
router.put("/transactions/:id", authenticate, FundController.updateTransaction);

module.exports = router;
