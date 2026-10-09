const express = require("express");
const { Op } = require("sequelize");
const db = require("../models");
const PledgeController = require("../controllers/PledgeController");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authenticate, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// Pledge routes
/**
 * Three entities below had a model and a table but no route, so the UI called
 * endpoints that did not exist. The pages using them (the audit logger, the
 * pledge portfolio, and the advisor's access screens) read as empty rather
 * than erroring, which is why rendering checks never caught it.
 *
 * Mounted before any "/:param" route so a sub-path cannot be swallowed.
 */

// --- Audit log --------------------------------------------------------------
// A trail is only evidence if its subject cannot edit it: reads are confined to
// the caller's own entries, and writing is staff-only.
const auditRouter = express.Router();
createCrudRoutes(
  auditRouter,
  createCrudController(db.PledgeAuditLog, { ownership: "user_id" }),
  { read: [authenticate], write: [authenticate, adminMiddleware] }
);
router.use("/audit-logs", auditRouter);

// --- Payments ---------------------------------------------------------------
// Money: the caller may record their own payment, but settlement state is not
// theirs to assert, so status and the gateway reference are staff-only.
const paymentRouter = express.Router();
createCrudRoutes(
  paymentRouter,
  createCrudController(db.PledgePayment, {
    ownership: "user_id",
    protectedFields: ["status", "transaction_id"],
  }),
  { read: [authenticate], write: [authenticate] }
);
router.use("/payments", paymentRouter);

// --- Advisor access requests ------------------------------------------------
// Two-sided by nature: the advisor who asked and the investor who was asked
// must both see the row. Plain user_id ownership would hide every request from
// the advisor who created it, so the membership hook expresses the real rule.
const accessReqRouter = express.Router();
createCrudRoutes(
  accessReqRouter,
  createCrudController(db.AdvisorPledgeAccessRequest, {
    scope: {
      listWhere: async (req) => ({
        [Op.or]: [{ user_id: req.user.id }, { advisor_id: req.user.id }],
      }),
      allows: async (req, record) =>
        record.user_id === req.user.id || record.advisor_id === req.user.id,
    },
    // Only the investor side resolves a request, and that goes through the
    // existing controller endpoints rather than a generic PUT.
    protectedFields: ["status", "responded_at"],
  }),
  { read: [authenticate], write: [authenticate] }
);
router.use("/advisor-access-requests", accessReqRouter);

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
