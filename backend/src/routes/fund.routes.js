const express = require("express");
const db = require("../models");
const FundController = require("../controllers/FundController");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authenticate, authMiddleware, adminMiddleware, optionalAuthenticate } =
  require("../middleware/auth");

const router = express.Router();

/**
 * Fund manager module.
 *
 * The FundPlan, FundAllocation and FundWallet models already existed but no
 * routes were ever mounted, so /api/funds/plans, /allocations and /wallets all
 * returned 404 and the Fund Manager and Investor dashboards could not load.
 * Each resource is mounted with the access rule its data deserves.
 */

// --- Fund plans -------------------------------------------------------------
// A catalogue investors browse before committing money: readable by anyone,
// writable only by staff. Nothing here is per-user.
const planRouter = express.Router();
createCrudRoutes(
  planRouter,
  createCrudController(db.FundPlan, {
    defaultOrderBy: "created_at",
    defaultOrder: "DESC",
  }),
  { read: [optionalAuthenticate], write: [authMiddleware, adminMiddleware] }
);
router.use("/plans", planRouter);

// --- Fund allocations -------------------------------------------------------
// The composition of a plan (symbol and percentage). Investors need to see what
// a fund holds, so reads are authenticated rather than owner-scoped — the rows
// belong to a fund, not to a person — while only staff may change a holding.
const allocationRouter = express.Router();
createCrudRoutes(
  allocationRouter,
  createCrudController(db.FundAllocation, {
    defaultOrderBy: "created_at",
    defaultOrder: "DESC",
  }),
  { read: [authMiddleware], write: [authMiddleware, adminMiddleware] }
);
router.use("/allocations", allocationRouter);

// --- Fund wallets -----------------------------------------------------------
// Real balances, one row per user. Owner-scoped: a signed-in user sees and
// touches only their own wallet, staff see all. `balance` and `status` are
// staff-only fields — a client must never be able to credit itself.
const walletRouter = express.Router();
createCrudRoutes(
  walletRouter,
  createCrudController(db.FundWallet, {
    defaultOrderBy: "created_at",
    defaultOrder: "DESC",
    ownership: "user_id",
    protectedFields: ["balance", "status"],
  }),
  [authMiddleware]
);
router.use("/wallets", walletRouter);

/**
 * Four more entities that had a model and a table but no route. The investor
 * withdrawal, payout and payment modals, the superadmin withdrawal screen and
 * the profit-distribution panel all called endpoints that returned 404.
 *
 * Everything here is money, so the pattern is the same throughout: a caller
 * sees only their own rows, and the fields that decide whether money has
 * actually moved are staff-only. Without that split, anyone able to request a
 * withdrawal could also mark it processed in the same request.
 */

// --- Notifications ----------------------------------------------------------
const notificationRouter = express.Router();
createCrudRoutes(
  notificationRouter,
  createCrudController(db.FundNotification, { ownership: "user_id" }),
  { read: [authenticate], write: [authenticate] }
);
router.use("/notifications", notificationRouter);

// --- Withdrawal requests ----------------------------------------------------
const withdrawalRouter = express.Router();
createCrudRoutes(
  withdrawalRouter,
  createCrudController(db.FundWithdrawalRequest, {
    ownership: "user_id",
    protectedFields: ["status", "processed_at"],
  }),
  { read: [authenticate], write: [authenticate] }
);
router.use("/withdrawals", withdrawalRouter);

// --- Payout requests --------------------------------------------------------
const payoutRouter = express.Router();
createCrudRoutes(
  payoutRouter,
  createCrudController(db.FundPayoutRequest, {
    ownership: "user_id",
    protectedFields: ["status", "processed_at"],
  }),
  { read: [authenticate], write: [authenticate] }
);
router.use("/payouts", payoutRouter);

// --- Invoices ---------------------------------------------------------------
// An invoice is issued to the user, not written by them: the amount, its
// identifier and whether it is paid are all staff-only, so a recipient cannot
// restate what they owe or mark their own invoice settled.
const invoiceRouter = express.Router();
createCrudRoutes(
  invoiceRouter,
  createCrudController(db.FundInvoice, {
    ownership: "user_id",
    protectedFields: ["status", "amount", "invoice_number", "paid_at"],
  }),
  { read: [authenticate], write: [authenticate, adminMiddleware] }
);
router.use("/invoices", invoiceRouter);

// --- Transactions -----------------------------------------------------------
// `listTransactions` filters only on query parameters, so without authenticate
// it served every investor's transaction history to anonymous callers.
router.post("/transactions", authenticate, FundController.createTransaction);
router.get("/transactions", authenticate, FundController.listTransactions);
router.put("/transactions/:id", authenticate, FundController.updateTransaction);

module.exports = router;
