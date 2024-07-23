const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const verifyJWT = require('../middleware/verifyJWT')

// All routes in this file are protected by JWT
router.use(verifyJWT);

router.route('/users')
    .get(adminController.getAllUsers)
    .delete(adminController.deleteUser)

router.route('/bookings')
    .get(adminController.getAllBookings)              

router.route('/payments')
    .get(adminController.getAllPayments)

router.route('/statistics')
    .get(adminController.getStatistics)

//formats any joi error into JSON for the client
router.use((err, req, res, next) => {
    if (err?.error?.isJoi) {
        console.log(`In Joi middleware: ${err.error}`)
        return res.status(400).json({
            type: err.type,
            message: err.error.details[0].message,
            context: err.error.details[0].context
        });
    } else {
        next(err);
    }
});
    
module.exports = router