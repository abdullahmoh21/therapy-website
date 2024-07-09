const React = require('react')
const asyncHandler = require('express-async-handler')
const { Safepay } = require('@sfpy/node-sdk')
const ShortUniqueId = require('short-unique-id');
const Joi = require('joi');
const axios = require('axios')
const User = require('../models/User')
const Payment = require('../models/Payment')
const Booking = require('../models/Booking')
const logger = require('../logs/logger');
const { myQueue } = require('../utils/myQueue');
const { invalidateCache } = require('../middleware/redisCaching');

const safepay = new Safepay({
    environment: 'sandbox',
    apiKey: process.env.SAFEPAY_API_KEY,
    v1Secret: process.env.SAFEPAY_API_KEY,
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET,
  })


//@desc marks payment as completed or refunded based on webhook data
//@param valid webhook
//@route POST /safepay
//@access Public
const handleSafepayWebhook = asyncHandler(async (req, res) => {
    console.log('APG Webhook received: ', req.body);
    const valid = await safepay.verify.webhook(req);
    if (!valid) {
        console.error('Invalid webhook received');
        return res.sendStatus(403);
    }

    console.log('Valid webhook received. Processing...');
    const { data } = req.body;
    const { type, notification } = data;

    const tracker = notification?.tracker;
    if (!tracker) {
        console.error('No tracker found in webhook data');
        return res.sendStatus(400); // Bad Request
    }

    const payment = await Payment.findOne({ tracker });
    if (!payment) {
        console.error(`No payment found for tracker: ${tracker}`);
        return res.sendStatus(404); // Not Found
    }

    // Update the payment document based on the webhook type
    switch (type) {
        case 'payment:created':{
            if(notification.state === 'PAID'){
                payment.transactionStatus = 'Completed';
                payment.netAmountReceived = notification.net;
                payment.feePaid = notification.fee;
                payment.paymentCompletedDate = new Date();
            }
            break;
        }
        case 'refund:created':
            if(notification.state === 'PARTIALLY_REFUNDED'){
                payment.transactionStatus = 'Partially Refunded';
                payment.netAmountReceived = notification.balance;
                payment.paymentRefundedDate = new Date();
            } else if(notification.state === 'REFUNDED'){
                payment.transactionStatus = 'Refunded';
                payment.netAmountReceived = notification.balance;
                payment.paymentRefundedDate = new Date();
            }
            break;
        case 'error:occurred':
            payment.transactionStatus = 'Cancelled';
            payment.errorMessage = notification.message;
            break;
        default:
            console.error(`Unhandled webhook type: ${type}`);
            return res.sendStatus(400); // Bad Request
    }

    await payment.save();
    // Invalidate the cache for the user's bookings since the payment status has changed
    invalidateCache(`bookings:${payment.userId}`);
    console.log(`Payment document updated for tracker: ${tracker}/n ${JSON.stringify(payment, null, 2)}`);

    return res.sendStatus(200);
});

//@desc creates and returns a payment link
//@param valid user jwt token and payment details
//@route POST /payments
//@access Private
const createPayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) return res.sendStatus(400); // Bad Request

    // Initialize id generator
    const uid = new ShortUniqueId({ length: 5 });
    const transactionReferenceNumber = `T-${uid.rnd()}`;

    try {
        // Find the corresponding Payment document
        const payment = await Payment.findOne({ bookingId }).exec();
        if (!payment) return res.sendStatus(404); // Not Found

        // Create payment and generate URL in parallel if possible
        const createPaymentPromise = safepay.payments.create({
            amount: payment.amount,
            currency: payment.currency,
        });

        const [{ token }] = await Promise.all([createPaymentPromise]);

        const url = safepay.checkout.create({
            token,
            orderId: transactionReferenceNumber,
            cancelUrl: 'https://cattle-tender-mosquito.ngrok-free.app/dash',
            redirectUrl: 'https://cattle-tender-mosquito.ngrok-free.app/dash',
            webhooks: true
        });

        if (!url) {
            return res.sendStatus(500).json({ 'message': 'Error: no url found' });
        }

        // Update payment document
        payment.tracker = token;
        payment.transactionReferenceNumber = transactionReferenceNumber;
        payment.linkGeneratedDate = new Date();
        await payment.save();

        return res.status(200).json({ url });
    } catch (error) {
        console.error(`Error in createPayment: ${error.response ? JSON.stringify(error.response.data) : JSON.stringify(error)}`);
        return res.sendStatus(500);
    }
});

//@desc returns all payments of a user in past 30 days
//@param valid user jwt token
//@route GET /payments
//@access Private
const getMyPayments = asyncHandler( async (req, res) => {
    const{ email } = req; //from verifyJWT
    const user = await User.findOne({ "email": email }).lean().exec();
    if (!user) return res.status(404).json({ 'message': 'User not found' });

    const payments = await Payment.find({ 
        userId: user._id
    }).lean().exec();
    if (payments?.length === 0) return res.status(204).end();


    console.log(`Payment data sent: ${JSON.stringify(payments, null, 2)}`);
    res.json(payments);
})

const refundSchema = Joi.object({
    paymentId: Joi.string().required(),
    bookingId: Joi.string().required(),
    reason: Joi.string().required().min(10).max(500).trim(),
});

//@desc sends a refund request to admin for approval
//@param valid tracker token
//@route POST /payments/refund
//@access Private
const refundRequest = asyncHandler( async (req, res) => {
    const { paymentId, reason, bookingId } = req.body;
    
    const { error } = refundSchema.validate(req.body);
    if (error) return res.status(400).json({ 'message': error.details[0].message });

    // Find the corresponding Payment and Booking documents
    const [payment, booking] = await Promise.all([
        Payment.findOne({_id: paymentId}).lean().exec(),
        Booking.findOne({ _id: bookingId }).lean().exec()
    ]); 

    // Check if booking's paymentId and payment's _id exist and match
    if (!booking.paymentId || !payment._id || booking.paymentId.toString() !== payment._id.toString()) {
        logger.debug(`Invalid or mismatched paymentId: ${booking.paymentId} and _id: ${payment._id}.`);
        return res.status(400).end(); // Bad Request
    }

    // Check if booking's paymentId matches payment's _id
    if (booking.paymentId.toString() !== payment._id.toString()) {
        logger.debug(`Payment's bookingId: ${booking.paymentId} and Booking's paymentId: ${payment._id} do not match.`);
        return res.status(400).end(); // Bad Request
    }
    
    if(payment.transactionStatus === 'Refunded') return res.status(400).json({ 'message': 'Payment already refunded' });
    if(payment.transactionStatus === 'Partially Refunded') return res.status(400).json({ 'message': 'Payment already partially refunded' });
    if(payment.transactionStatus !== 'Completed') return res.status(400).json({ 'message': 'Payment not completed' });

    
    const currentTime = new Date();
    const twentyFourHoursBeforeBooking = new Date(booking.eventStartTime.getTime() - 24 * 60 * 60 * 1000);
    // Check if the current time is 24 hours before the booking's start time
    if (currentTime >= twentyFourHoursBeforeBooking) {
        return res.status(400).json({ 'message': 'Refunds can only be processed if cancellation is made 24 hours before the booking start time' });
    }
        
    const emailJobData = { 
        // pass fetched data to email job
        reason,
        payment: payment, 
        booking: booking,
        recipient: process.env.ADMIN_EMAIL
    };
    
    await myQueue.add('refundRequest', emailJobData);
    return res.status(200).json({ 'message': 'Refund request has been added to the queue ' });
})

//@desc returns all payments 
//@param valid admin jwt token
//@route GET /payments/admin
//@access Private(admin)
const getAllPayments = asyncHandler( async (req, res) => {
    if (req?.role !== ROLES_LIST.Admin) return res.sendStatus(401);

    //find all active payments
    const payments = await Payment.find({}).lean().exec();

    if (payments.length === 0) return res.status(204).end();
    console.log(`Admin booking data sent: ${JSON.stringify(payments, null, 2)}`);
    res.json(payments);

})



module.exports = {
    handleSafepayWebhook,
    createPayment,
    getMyPayments,
    getAllPayments,
    refundRequest
}