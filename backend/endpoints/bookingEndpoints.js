const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { verifyJWT } = require("../middleware/verifyJWT");
const { redisCaching } = require("../middleware/redisCaching");

router
  .route("/calendly")
  .get(verifyJWT, bookingController.getNewBookingLink)
  .post(bookingController.handleCalendlyWebhook);

router.use(verifyJWT);

router.route("/").get(redisCaching(), bookingController.getActiveBookings);

router.route("/:bookingId").get(redisCaching(), bookingController.getBooking);

module.exports = router;
