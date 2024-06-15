const express = require('express')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJWT')
const bookingController = require('../controllers/bookingController')
const expressJoiValidation = require('express-joi-validation').createValidator({});

router.route('/calendly')
    .post(bookingController.handleCalendlyWebhook)  // Webhook endpoint for Calendly events
    .get(verifyJWT ,bookingController.getNewBookingLink)       // Generate a new booking link

router.use(verifyJWT)    //all booking routes are protected

router.route('/')
    .get(bookingController.getMyBookings)           //get users active bookings

router.route('/admin')
    .get(bookingController.getAllBookings)          //get all active bookings


module.exports = router
