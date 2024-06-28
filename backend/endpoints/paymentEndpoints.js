const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')
const verifyJWT = require('../middleware/verifyJWT')
const { redisCaching } = require('../middleware/redisCaching')


router.route('/safepay')
    .post(paymentController.handleSafepayWebhook)                    //create a new payment

router.use(verifyJWT)    //all payment routes are protected

router.route('/')
    .get(redisCaching(), paymentController.getMyPayments)           //get users payments
    .post(paymentController.createPayment)          //create a new payment

router.route('/refund')
    .post(paymentController.refundRequest)          //request a refund

router.route('/admin')
    .get(paymentController.getAllPayments)          //get all paymnets


module.exports = router