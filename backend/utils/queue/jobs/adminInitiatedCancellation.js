const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");

const sendAdminInitiatedCancellationEmail = async (job) => {
  try {
    const {
      recipient,
      name,
      bookingId,
      eventDate,
      eventTime,
      reason,
      cancellationDate,
    } = job.data;

    if (!recipient) {
      logger.error(
        "Cannot send admin initiated cancellation email: no recipient provided"
      );
      return;
    }

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: recipient,
      subject: "Session Cancellation Notice",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "adminInitiatedCancellation",
      context: {
        name,
        bookingId,
        eventDate,
        eventTime,
        reason,
        cancellationDate,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Admin initiated cancellation email sent to ${recipient}`);
    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending admin initiated cancellation email to ${job.data.recipient}: ${error}`
    );
    throw error;
  }
};

module.exports = sendAdminInitiatedCancellationEmail;
