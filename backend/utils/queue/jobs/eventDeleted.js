const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");

/**
 * Handle sending session deletion notification to user
 * Fetches user data and formats dates inside the job
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.userId - MongoDB ID of the user
 * @param {Date} job.data.eventStartTime - Booking start time
 * @param {string} job.data.reason - Reason for deletion
 */
const handleSessionDeletionNotification = async (job) => {
  try {
    const { userId, eventStartTime, reason } = job.data;

    // Fetch user data (moved from call site)
    const user = await User.findById(userId, "name email").lean().exec();

    if (!user) {
      logger.error(
        `User ${userId} not found. Cannot send session deletion email.`
      );
      throw new Error(`User not found for session deletion email`);
    }

    // Format dates (moved from call site)
    const eventDate = new Date(eventStartTime).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const eventTime = new Date(eventStartTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: user.email,
      subject: "Booking Canceled",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "user_session_deletion_notice",
      context: {
        name: user.name,
        eventDate,
        eventTime,
        reason: reason || "No reason provided",
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Session deletion email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending session deletion email: ${error.message}`
    );
    throw error;
  }
};

module.exports = handleSessionDeletionNotification;
