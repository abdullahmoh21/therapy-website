const asyncHandler = require("express-async-handler");
const { Safepay } = require("@sfpy/node-sdk");
const Joi = require("joi");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const logger = require("../logs/logger");
const Config = require("../models/Config"); // Import Config model
const { myQueue } = require("../utils/myQueue");
const { invalidateCache } = require("../middleware/redisCaching");

//production: change to main api
const safepay = new Safepay({
  environment: "sandbox",
  apiKey: process.env.SAFEPAY_API_KEY,
  v1Secret: process.env.SAFEPAY_API_KEY,
  webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET,
});

//@desc marks payment as completed or refunded based on webhook data
//@param valid webhook
//@route POST /safepay
//@access Public
const handleSafepayWebhook = asyncHandler(async (req, res) => {
  // Verify the webhook using the Safepay SDK
  const valid = await safepay.verify.webhook(req);
  if (!valid) {
    console.error("Invalid webhook received");
    return res.sendStatus(403);
  }

  // Extract the webhook data
  const { data } = req.body;
  const { type, notification } = data;

  // Extract the tracker token from the webhook data
  const tracker = notification?.tracker;
  if (!tracker) {
    console.error("No tracker found in webhook data");
    return res.sendStatus(400); // Bad Request
  }

  // Find corresponding Payment document
  const payment = await Payment.findOne({ tracker });
  if (!payment) {
    console.error(`No payment found for tracker: ${tracker}`);
    return res.sendStatus(404); // Not Found
  }

  // Update the payment document based on the webhook type
  switch (type) {
    case "payment:created": {
      if (notification.state === "PAID") {
        payment.transactionStatus = "Completed";
        payment.netAmountReceived = notification.net;
        payment.feePaid = notification.fee;
        payment.paymentCompletedDate = new Date();
        if (payment?.errorMessage) {
          payment.errorMessage = "";
        }
      }
      break;
    }
    case "refund:created":
      if (notification.state === "PARTIALLY_REFUNDED") {
        payment.transactionStatus = "Partially Refunded";
        payment.netAmountReceived = notification.balance;
        payment.paymentRefundedDate = new Date();
      } else if (notification.state === "REFUNDED") {
        payment.transactionStatus = "Refunded";
        payment.netAmountReceived = notification.balance;
        payment.paymentRefundedDate = new Date();
      }
      break;
    case "error:occurred":
      payment.errorMessage = notification.message;
      payment.transactionStatus = "Error";
      break;
    default:
      console.error(`Unhandled webhook type: ${type}`);
      return res.sendStatus(400); // Bad Request
  }
  payment.paymentMethod = "Credit Card";
  await payment.save();

  //send email to user on refund
  if (payment.transactionStatus === "Refunded") {
    try {
      await myQueue.add("refundConfirmation", { payment });
    } catch (error) {
      logger.error("Error sending refund confirmation email.");
      return res.sendStatus(500);
    }
  }

  invalidateCache("/bookings", payment.userId);

  console.log(
    `Payment document updated for tracker: ${tracker}/n ${JSON.stringify(
      payment,
      null,
      2
    )}`
  );

  return res.sendStatus(200);
});

//@desc creates and returns a payment link
//@param valid user jwt token and payment details
//@route POST /payments
//@access Private
const createPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId)
    return res.status(400).json({ message: "BookingId is required" }); // Bad Request

  try {
    // Find the corresponding Payment document
    const payment = await Payment.findOne({ bookingId }).exec();
    if (!payment) return res.sendStatus(404); // Not Found

    // Use the amount stored in the payment document itself
    const paymentAmount = payment.amount;
    if (paymentAmount === undefined || paymentAmount <= 0) {
      logger.error(
        `Invalid or missing amount (${paymentAmount}) found in payment document for booking ${bookingId}. Aborting payment creation.`
      );
      return res
        .status(500)
        .json({ message: "Server error: Invalid payment amount recorded." });
    }

    let token;
    try {
      const result = await safepay.payments.create({
        amount: paymentAmount,
        currency: payment.currency,
      });
      token = result.token;
    } catch (e) {
      return res
        .status(503)
        .json({ message: "Payment service is temporarily unavailable" });
    }

    let url;
    try {
      url = safepay.checkout.create({
        token,
        orderId: payment.transactionReferenceNumber,
        cancelUrl: `${process.env.FRONTEND_URL}/dash`,
        redirectUrl: `${process.env.FRONTEND_URL}/dash`,
        webhooks: true,
      });
    } catch (e) {
      return res
        .status(503)
        .json({ message: "Payment service is temporarily unavailable" });
    }

    if (!url) {
      return res.status(500).json({ message: "Error: no url found" });
    }

    // Update payment document
    payment.tracker = token;
    payment.linkGeneratedDate = new Date();
    await payment.save();

    return res.status(200).json({ url });
  } catch (error) {
    console.error(`Error in createPayment: ${error}`);
    return res.sendStatus(500);
  }
});

const refundSchema = Joi.object({
  paymentId: Joi.string().required(),
  bookingId: Joi.string().required(),
});

//@desc sends a refund request to admin for approval
//@param valid tracker token
//@route POST /payments/refund
//@access Private
const refundRequest = asyncHandler(async (req, res) => {
  const { paymentId, bookingId } = req.body;

  const { error } = refundSchema.validate({ paymentId, bookingId });
  if (error) return res.status(400).json({ message: error.details[0].message });

  // Fetch admin email from config
  const adminEmail = await Config.getValue("adminEmail");
  if (!adminEmail) {
    logger.error(
      "Admin email not found in config. Cannot process refund request."
    );
    return res
      .status(500)
      .json({ message: "Server configuration error: Admin email not set." });
  }

  // Find the corresponding Payment and Booking documents
  const [payment, booking] = await Promise.all([
    Payment.findOne({ _id: paymentId }).exec(),
    Booking.findOne({ _id: bookingId }).lean().exec(),
  ]);

  // Check if both documents exist and _id's match
  if (
    !booking ||
    !payment ||
    !booking.paymentId ||
    !payment._id ||
    booking.paymentId.toString() !== payment._id.toString()
  ) {
    return res.status(400).end(); // Bad Request
  }

  if (payment.transactionStatus !== "Completed") {
    return res.status(400).json({
      message: "Refunds can only be processed for completed payments",
    });
  }
  const currentTime = new Date();
  const seventyTwoHoursBeforeBooking = new Date(
    booking.eventStartTime.getTime() - 72 * 60 * 60 * 1000
  );
  const rawCutoff = await Config.getValue("cancelCutoffDays");
  const cutoffDays = parseInt(rawCutoff, 10);
  if (isNaN(cutoffDays)) {
    logger.error(`Invalid cancelCutoffDays config: ${rawCutoff}`);
    return res
      .status(500)
      .json({ message: "Server config error: invalid cutoff" });
  }
  const now = new Date();
  const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
  const cutoffDeadline = new Date(
    booking.eventStartTime.getTime() - cutoffMillis
  );

  if (now >= cutoffDeadline) {
    return res.status(400).json({
      message: `Refunds can only be requested when booking was cancelled at least ${cutoffDays} days before the booking.`,
    });
  }
  // Check if the current time is 72 hours before the booking's start time
  if (currentTime >= seventyTwoHoursBeforeBooking) {
    return res.status(400).json({
      message:
        "Refunds can only be processed if cancellation is made 72 hours before the booking start time",
    });
  }

  const emailJobData = {
    // pass fetched data to email job
    payment: payment,
    booking: booking,
    recipient: adminEmail, // Use fetched admin email
    updatePaymentStatus: true, //worker will update payment status to 'Refund Requested'
  };
  try {
    await myQueue.add("refundRequest", emailJobData);
  } catch (error) {
    logger.error(
      `Error adding refund request job to queue. Sending manually: ${error}`
    );
    return res.sendStatus(500);
  }
  payment.refundRequestedDate = new Date();
  payment.save();
  return res
    .status(200)
    .json({ message: "Refund request has been added to the queue " });
});

module.exports = {
  handleSafepayWebhook,
  createPayment,
  refundRequest,
};
