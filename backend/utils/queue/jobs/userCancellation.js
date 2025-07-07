const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");

const sendUserCancellationEmail = async (job) => {
  try {
    const {
      recipient,
      name,
      bookingId,
      eventDate,
      eventTime,
      cancelledBy,
      cancelledByDisplay,
      reason,
      cancellationDate,
      isUnpaid,
      isRefundEligible,
      isRefundIneligible,
      isAdminCancelled,
      cancelCutoffDays,
    } = job.data;

    if (!recipient) {
      logger.error(
        "Cannot send user cancellation email: no recipient provided"
      );
      return;
    }

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: recipient,
      subject: "Booking Cancellation Confirmation",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "userCancellationNotif",
      context: {
        name,
        bookingId,
        eventDate,
        eventTime,
        cancelledBy,
        cancelledByDisplay,
        reason,
        cancellationDate,
        isUnpaid,
        isRefundEligible,
        isRefundIneligible,
        isAdminCancelled,
        cancelCutoffDays,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`User cancellation email sent to ${recipient}`);
    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending user cancellation email to ${job.data.recipient}: ${error}`
    );
    throw error;
  }
};

module.exports = sendUserCancellationEmail;
