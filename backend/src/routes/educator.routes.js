const express = require("express");
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, optionalAuthenticate } = require("../middleware/auth");

const router = express.Router();

/**
 * Educators.
 *
 * The /Educators page reads this entity, but no route was ever mounted, so
 * /api/educators returned 404 on every load and the page silently rendered
 * three fabricated instructors instead.
 *
 * Access follows the same rule as advisors and finfluencers: the directory is
 * public, writes are confined to the educator's own row, and the credibility
 * fields a learner relies on — verification, student count, success rate,
 * rating — are staff-only, so an applicant can submit their profile but cannot
 * mark themselves verified or inflate their own numbers.
 */
createCrudRoutes(
  router,
  createCrudController(db.Educator, {
    defaultOrderBy: "created_at",
    defaultOrder: "DESC",
    ownership: { field: "user_id", publicRead: true },
    protectedFields: [
      "status",
      "verified",
      "rejection_reason",
      "student_count",
      "success_rate",
      "rating",
    ],
  }),
  { read: [optionalAuthenticate], write: [authMiddleware] }
);

module.exports = router;
