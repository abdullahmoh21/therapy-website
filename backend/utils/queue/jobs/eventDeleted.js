const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");

const sendEventDeletedEmail = async (job) => {
  try {
    const { recipient, name, eventDate, eventTime, reason } = job.data;

    if (!recipient) {
      logger.error("Cannot send event deleted email: no recipient provided");
      return;
    }

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: recipient,
      subject: "Booking Canceled",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "eventDeleted",
      context: {
        name,
        eventDate,
        eventTime,
        reason,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Event deleted email sent to ${recipient}`);
    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending event deleted email to ${job.data.recipient}: ${error}`
    );
    throw error;
  }
};

module.exports = sendEventDeletedEmail;
