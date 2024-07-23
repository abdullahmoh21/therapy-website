const express = require('express')
const router = express.Router()
const bookingController = require('../controllers/bookingController')
const verifyJWT = require('../middleware/verifyJWT')
const { redisCaching } = require('../middleware/redisCaching')


router.route('/calendly')
    .post(bookingController.handleCalendlyWebhook)                             // Webhook endpoint for Calendly events
    .get(verifyJWT, redisCaching(), bookingController.getNewBookingLink)       // Generate a new booking link

router.use(verifyJWT)    //all booking routes are protected

router.route('/')
    .get(redisCaching(), bookingController.getMyBookings)                       //get users active bookings
    

module.exports = router
