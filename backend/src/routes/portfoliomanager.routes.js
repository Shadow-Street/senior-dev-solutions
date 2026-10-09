const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, optionalAuthenticate } = require("../middleware/auth");

// Create controller using standard utility
const controller = createCrudController(db.PortfolioManager, {
  ownership: { field: 'user_id', publicRead: true },
  protectedFields: ['status', 'total_aum', 'active_clients'],
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC'
});

// Create standard routes (GET /, POST /, GET /:id, PUT /:id, DELETE /:id)

// PM Client Routes
const clientRouter = express.Router();
const clientController = createCrudController(db.PMClient, {
    defaultOrderBy: 'joined_at',
    defaultOrder: 'DESC'
});
createCrudRoutes(clientRouter, clientController, [authMiddleware]);
router.use('/clients', clientRouter);

// PM Holding Routes
const holdingRouter = express.Router();
const holdingController = createCrudController(db.PMHolding, {
    defaultOrderBy: 'unrealized_pnl',
    defaultOrder: 'DESC'
});
createCrudRoutes(holdingRouter, holdingController, [authMiddleware]);
router.use('/holdings', holdingRouter);

// PM Invoice Routes
const invoiceRouter = express.Router();
const invoiceController = createCrudController(db.PMInvoice, {
    defaultOrderBy: 'generated_at',
    defaultOrder: 'DESC'
});
createCrudRoutes(invoiceRouter, invoiceController, [authMiddleware]);
router.use('/invoices', invoiceRouter);

// PM Strategy Routes
const strategyRouter = express.Router();
const strategyController = createCrudController(db.PMStrategy, {
    defaultOrderBy: 'total_aum',
    defaultOrder: 'DESC'
});
createCrudRoutes(strategyRouter, strategyController, [authMiddleware]);
router.use('/strategies', strategyRouter);

// PM Trade Order Routes
const orderRouter = express.Router();
const orderController = createCrudController(db.PMTradeOrder, {
    defaultOrderBy: 'created_at',
    defaultOrder: 'DESC'
});
createCrudRoutes(orderRouter, orderController, [authMiddleware]);
router.use('/trade-orders', orderRouter);


// CRUD LAST — the generated '/:id' route must not shadow the sub-routers
// mounted above. Registered earlier, '/clients', '/participants' and the
// like were matched as an id and answered 404 'Record not found'.
createCrudRoutes(router, controller, { read: [optionalAuthenticate], write: [authMiddleware] });

module.exports = router;
