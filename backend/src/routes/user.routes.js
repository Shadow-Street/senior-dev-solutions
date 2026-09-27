const express = require("express");
const db = require("../models");
const UserController = require("../controllers/UserController");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const userCrud = createCrudController(db.User);

router.get("/me", authenticate, UserController.me);
router.put("/me", authenticate, UserController.update);

// Sub-resources — mounted before '/:id' so they are not shadowed.
const advisorRouter = express.Router();
createCrudRoutes(advisorRouter, createCrudController(db.Advisor, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC'
}));
router.use("/advisors", advisorRouter);

const trustLogRouter = express.Router();
createCrudRoutes(trustLogRouter, createCrudController(db.TrustScoreLog, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC'
}), [authenticate]);
router.use("/trust-score-logs", trustLogRouter);

const investmentRouter = express.Router();
createCrudRoutes(investmentRouter, createCrudController(db.UserInvestment, {
  defaultOrderBy: 'created_at', defaultOrder: 'DESC'
}), [authenticate]);
router.use("/investments", investmentRouter);

router.get("/", authenticate, UserController.list);
router.get("/:id", authenticate, userCrud.get);
router.put("/:id", authenticate, UserController.updateById);

module.exports = router;
