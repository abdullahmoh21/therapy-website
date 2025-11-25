const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const Config = require("../../../models/Config");

/**
 * Handle sending unauthorized booking notification
 * Used when someone tries to book without being a registered user
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.email - Email of unauthorized booker
 * @param {string} job.data.userName - Name of unauthorized booker (optional)
 */
const handleUnauthorizedBookingNotification = async (job) => {
  try {
    const { email, userName } = job.data;

    if (!email) {
      logger.error("Cannot send unauthorized booking email: no email provided");
      throw new Error(
        "No email provided for unauthorized booking notification"
      );
    }

    // Fetch admin email (moved from call site)
    const adminEmail = await Config.getValue("adminEmail");
    const clientName = userName || "Client";

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: email,
      subject: "Booking Request Canceled",
      replyTo: adminEmail || "no-reply@fatimanaqvi.com",
      template: "user_unauthorized_booking_notice",
      context: {
        adminEmail: adminEmail || "admin@fatimanaqvi.com",
        clientName,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(
      `Unauthorized booking email sent to ${email} for ${clientName}`
    );
    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending unauthorized booking email: ${error.message}`
    );
    throw error;
  }
};

module.exports = handleUnauthorizedBookingNotification;
