const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Booking = require("../../../models/Booking");
const Config = require("../../../models/Config");

const sendRefundConfirmation = async (job) => {
  try {
    const { payment } = job.data;
    if (!payment) {
      throw new Error("Missing required data for refund request email");
    }

    let user, booking, adminEmail;

    try {
      // Use Promise.all but handle potential failures
      const results = await Promise.allSettled([
        User.findOne({ _id: payment.userId }, "name email").lean().exec(),
        Booking.findOne({ _id: payment.bookingId }).select("").lean().exec(),
        Config.getValue("adminEmail"),
      ]);

      user = results[0].status === "fulfilled" ? results[0].value : null;
      booking = results[1].status === "fulfilled" ? results[1].value : null;
      adminEmail = results[2].status === "fulfilled" ? results[2].value : null;

      if (!user) {
        logger.error(`User not found for payment ${payment._id}`);
        throw new Error(`User not found for payment`);
      }

      if (!booking) {
        logger.error(`Booking not found for payment ${payment._id}`);
        booking = { bookingId: "Unknown" };
      }
    } catch (err) {
      logger.error(
        `Error fetching data for refund confirmation: ${err.message}`
      );
      throw err;
    }

    const eventDate = new Date(booking.eventStartTime).toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "long", year: "numeric" }
    );
    const eventTime = new Date(booking.eventStartTime).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit", hour12: true }
    );
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
      template: "refundConfirmation",
      context: {
        name: user.name,
        userEmail: user.email,
        bookingId: booking.bookingId,
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
    logger.info(`Refund Confirmation email sent to ${user.email}`);
  } catch (error) {
    logger.error(`[EMAIL] Error processing refund request: ${error}`);
    throw error;
  }
};

module.exports = sendRefundConfirmation;
