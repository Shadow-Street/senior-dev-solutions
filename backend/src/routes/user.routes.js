const express = require("express");
const db = require("../models");
const UserController = require("../controllers/UserController");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authenticate, optionalAuthenticate } = require("../middleware/auth");

const router = express.Router();
const userCrud = createCrudController(db.User);

router.get("/me", authenticate, UserController.me);
router.put("/me", authenticate, UserController.update);

// Sub-resources — mounted before '/:id' so they are not shadowed.
// Advisor profiles.
//
// The directory is public (the /Advisors page lists it anonymously), but the
// writes are not: this router previously had no authentication at all, so an
// anonymous POST could create an advisor with status 'approved', verified true
// and any SEBI registration number, and an anonymous PUT/DELETE could rewrite
// or remove someone else's. Reads stay open; writes are confined to the row's
// own user, and the approval/verification fields are staff-only so an applicant
// can submit their SEBI details but cannot approve themselves.
const advisorRouter = express.Router();

/**
 * Initial application status, decided here rather than by the applicant.
 *
 * `status` is a protected field, so the value the registration form sends is
 * stripped — correctly, since an applicant must not be able to submit
 * themselves as 'approved'. But nothing then supplied a status, so new rows
 * landed with NULL: the registration page read `newAdvisor.status`, got
 * undefined, and crashed on `.replace()` the moment an application was
 * submitted. The upload had already succeeded, which is why this looked like a
 * broken file upload rather than a broken status.
 *
 * Whether approval is required is a platform setting, so it is read from the
 * server's own store and never trusted from the request. Anything other than an
 * explicit "false" means approval is required: an unreadable or missing setting
 * must not silently auto-approve advisors.
 */
const initialAdvisorStatus = async () => {
  try {
    const setting = await db.PlatformSetting.findOne({
      where: { key: 'advisorApprovalRequired' },
    });
    const raw = setting?.value;
    const approvalRequired = !(raw === false || raw === 'false' || raw === 0 || raw === '0');
    return approvalRequired ? 'pending_approval' : 'approved';
  } catch {
    return 'pending_approval'; // fail closed
  }
};

createCrudRoutes(advisorRouter, createCrudController(db.Advisor, {
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC',
  ownership: { field: 'user_id', publicRead: true },
  protectedFields: [
    'status', 'verified', 'rejection_reason',
    // Trust signals shown to investors; derived or admin-set, never client-set.
    'rating', 'total_clients', 'total_earnings', 'follower_count', 'success_rate',
  ],
  beforeCreate: async (data) => {
    // Staff creating a row directly may set a status; otherwise it is ours.
    if (!data.status) data.status = await initialAdvisorStatus();
    return data;
  },
}), [optionalAuthenticate]);
router.use("/advisors", advisorRouter);

const trustLogRouter = express.Router();
createCrudRoutes(trustLogRouter, createCrudController(db.TrustScoreLog, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC'
}), [authenticate]);
router.use("/trust-score-logs", trustLogRouter);

const investmentRouter = express.Router();
createCrudRoutes(investmentRouter, createCrudController(db.UserInvestment, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC', ownership: 'user_id'
}), [authenticate]);
router.use("/investments", investmentRouter);

router.get("/", authenticate, UserController.list);
router.get("/:id", authenticate, userCrud.get);
router.put("/:id", authenticate, UserController.updateById);

module.exports = router;
