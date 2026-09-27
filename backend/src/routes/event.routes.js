const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Main Events CRUD
const eventController = createCrudController(db.Event);
// Main Events CRUD - Manual Route Definition for Auth Control
router.get('/', eventController.list);
router.post('/', authMiddleware, eventController.create);
// createCrudRoutes(router, eventController); // Removed automatic generation to allow custom middleware

// Event Tickets
const ticketRouter = express.Router();
const ticketController = createCrudController(db.EventTicket);
createCrudRoutes(ticketRouter, ticketController);
router.use('/tickets', ticketRouter);

// Event Attendees
const attendeeRouter = express.Router();
const attendeeController = createCrudController(db.EventAttendee);
createCrudRoutes(attendeeRouter, attendeeController);
router.use('/attendees', attendeeRouter);

// Event Reviews
const reviewRouter = express.Router();
const reviewController = createCrudController(db.EventReview);
createCrudRoutes(reviewRouter, reviewController);
router.use('/reviews', reviewRouter);

// Event Commissions
const commissionRouter = express.Router();
const commissionController = createCrudController(db.EventCommissionTracking);
createCrudRoutes(commissionRouter, commissionController);
router.use('/commissions', commissionRouter);

// Refund Requests
const refundRouter = express.Router();
const refundController = createCrudController(db.RefundRequest);
createCrudRoutes(refundRouter, refundController);
router.use('/refunds', refundRouter);

// Check-ins
const checkinRouter = express.Router();
const checkinController = createCrudController(db.EventCheckIn);
createCrudRoutes(checkinRouter, checkinController);
router.use('/check-ins', checkinRouter);

// Promo Codes
const promoRouter = express.Router();
const promoController = createCrudController(db.EventPromoCode);
createCrudRoutes(promoRouter, promoController);
router.use('/promo-codes', promoRouter);

// Reminders
const reminderRouter = express.Router();
const reminderController = createCrudController(db.EventReminder);
createCrudRoutes(reminderRouter, reminderController);
router.use('/reminders', reminderRouter);

// Feedback
const feedbackRouter = express.Router();
const feedbackController = createCrudController(db.EventFeedback);
createCrudRoutes(feedbackRouter, feedbackController);
router.use('/feedback', feedbackRouter);

// Organizers
const organizerRouter = express.Router();
const organizerController = createCrudController(db.EventOrganizer);
createCrudRoutes(organizerRouter, organizerController);
router.use('/organizers', organizerRouter);

// Parameterised routes LAST: '/:id' would otherwise swallow '/tickets',
// '/attendees', '/refunds' and every other sub-router mounted above.
router.get('/:id', eventController.get);
router.put('/:id', authMiddleware, eventController.update);
router.delete('/:id', authMiddleware, eventController.delete);

module.exports = router;