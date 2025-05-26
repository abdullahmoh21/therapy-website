const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { verifyJWT } = require("../middleware/verifyJWT");
const { redisCaching } = require("../middleware/redisCaching");
const mongoose = require("mongoose");

// Middleware to validate bookingId is a valid ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.bookingId)) {
    return res.status(404).json({ message: "Invalid booking ID format" });
  }
  next();
};

router
  .route("/calendly")
  .get(verifyJWT, bookingController.getNewBookingLink)
  .post(bookingController.handleCalendlyWebhook);

router.use(verifyJWT);

router.route("/").get(redisCaching(), bookingController.getActiveBookings);
router
  .route("/noticePeriod")
  .get(redisCaching(), bookingController.getNoticePeriod);
router
  .route("/:bookingId")
  .get(validateObjectId, redisCaching(), bookingController.getBooking);

module.exports = router;
