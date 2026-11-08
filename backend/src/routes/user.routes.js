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
// Reads go through AdvisorDirectoryController: anonymous callers get approved
// advisors only, without the private SEBI document or review outcome; an
// applicant can read their own row whatever its status; staff see everything.
//
// There are no write routes here. Applicants apply through
// POST /api/advisors/apply, edit their profile through PUT /api/advisors/me, and
// staff approve / reject / suspend / delete through POST /api/advisors/:id/review
// and DELETE /api/advisors/:id, which keep the advisor row and the user's role
// in step. This router used to expose generic create/update/delete, which let
// any signed-in user write advisor rows directly (and, before that, anyone at
// all) and let staff change a status without the role following.
const advisorRouter = express.Router();
const Directory = require("../controllers/AdvisorDirectoryController");

advisorRouter.get("/", optionalAuthenticate, Directory.list);
advisorRouter.get("/:id", optionalAuthenticate, Directory.get);
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
