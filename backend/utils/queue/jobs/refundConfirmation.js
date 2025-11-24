const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Booking = require("../../../models/Booking");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");

/**
 * Handle sending payment refund confirmation to user
 * Fetches all required data and formats dates inside the job
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.paymentId - MongoDB ID of the payment
 */
const handlePaymentRefundConfirmation = async (job) => {
  try {
    const { paymentId } = job.data;

    if (!paymentId) {
      throw new Error("Missing paymentId for refund confirmation email");
    }

    // Fetch all required data in parallel (moved from call site)
    const payment = await Payment.findById(paymentId).lean().exec();

    if (!payment) {
      logger.error(`Payment ${paymentId} not found for refund confirmation`);
      throw new Error(`Payment not found for refund confirmation`);
    }

    const [user, booking, adminEmail] = await Promise.all([
      User.findById(payment.userId, "name email").lean().exec(),
      Booking.findById(payment.bookingId, "bookingId eventStartTime")
        .lean()
        .exec(),
      Config.getValue("adminEmail"),
    ]);

    if (!user) {
      logger.error(`User not found for payment ${paymentId}`);
      throw new Error(`User not found for refund confirmation`);
    }

    // Format dates (moved from call site)
    const eventDate = booking?.eventStartTime
      ? new Date(booking.eventStartTime).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "N/A";

    const eventTime = booking?.eventStartTime
      ? new Date(booking.eventStartTime).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "N/A";

    const paymentCompletedDate = payment.paymentCompletedDate
      ? new Date(payment.paymentCompletedDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }) +
        " " +
        new Date(payment.paymentCompletedDate).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "N/A";

    const mailOptions = {
      from: "admin@fatimanaqvi.com",
      to: user.email,
      subject: "Refund Confirmation",
      replyTo: adminEmail || "no-reply@fatimanaqvi.com",
      template: "user_payment_refund_confirmation",
      context: {
        name: user.name,
        userEmail: user.email,
        bookingId: booking?.bookingId || "Unknown",
        eventDate,
        eventTime,
        paymentAmount: payment.amount,
        paymentStatus: payment.transactionStatus,
        paymentCompleted: paymentCompletedDate,
        transactionReferenceNumber: payment.transactionReferenceNumber,
        adminEmail: adminEmail || "admin@fatimanaqvi.com",
        currentYear: new Date().getFullYear(),
        frontend_url: process.env.FRONTEND_URL,
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Refund confirmation email sent to ${user.email}`);
  } catch (error) {
    logger.error(
      `[EMAIL] Error processing refund confirmation: ${error.message}`
    );
    throw error;
  }
};

module.exports = handlePaymentRefundConfirmation;
