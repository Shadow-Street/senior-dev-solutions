const express = require("express");
const PledgeController = require("../controllers/PledgeController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Pledge routes
router.post("/pledges", authenticate, PledgeController.createPledge);
router.get("/pledges", PledgeController.listPledges);
router.put("/pledges/:id", authenticate, PledgeController.updatePledge);

// Session routes
router.post("/sessions", authenticate, PledgeController.createSession);
router.get("/sessions", PledgeController.listSessions);
router.put("/sessions/:id", authenticate, PledgeController.updateSession);

// Execution record routes
router.post("/executions", authenticate, PledgeController.createExecutionRecord);
router.get("/executions", PledgeController.listExecutionRecords);

// Access request routes
router.post("/access-requests", authenticate, PledgeController.createAccessRequest);
router.get("/access-requests", PledgeController.listAccessRequests);

module.exports = router;
