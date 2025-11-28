const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Config = require("../../../models/Config");

/**
 * Handle sending password reset email to user
 * Fetches user data and generates reset link inside the job
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.userId - MongoDB ID of the user
 * @param {string} job.data.resetToken - Password reset token
 */
const handleUserPasswordResetEmail = async (job) => {
  try {
    const { userId, resetToken } = job.data;

    // Fetch user data (moved from call site into handler)
    const user = await User.findById(userId, "name email").lean().exec();

    if (!user) {
      logger.error(
        `User ${userId} not found. Cannot send password reset email.`
      );
      throw new Error(`User not found for password reset email`);
    }

    // Build reset link (moved from call site)
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const adminEmail = await Config.getValue("adminEmail");

    const mailOptions = {
      from: "reset@fatimanaqvi.com",
      to: user.email,
      subject: "Reset Password",
      replyTo: adminEmail || "no-reply@fatimanaqvi.com",
      template: "user_password_reset",
      context: {
        name: user.name,
        link,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${user.email}`);
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending password reset email: ${error.message}`
    );
    throw error;
  }
};

module.exports = handleUserPasswordResetEmail;
