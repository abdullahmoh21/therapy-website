const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");

/**
 * Handle sending account verification email to user
 * Fetches user data and generates verification link inside the job
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.userId - MongoDB ID of the user
 * @param {string} job.data.verificationToken - Verification token
 */
const handleUserAccountVerificationEmail = async (job) => {
  try {
    const { userId, verificationToken } = job.data;

    // Fetch user data (moved from call site into handler)
    const user = await User.findById(userId, "name email").lean().exec();

    if (!user) {
      logger.error(
        `User ${userId} not found. Cannot send account verification email.`
      );
      throw new Error(`User not found for verification email`);
    }

    // Build verification link (moved from call site)
    const link = `${process.env.FRONTEND_URL}/verifyEmail?token=${verificationToken}`;

    const mailOptions = {
      from: "verification@fatimanaqvi.com",
      to: user.email,
      subject: "Verify Account",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "user_account_verification",
      context: {
        name: user.name,
        link,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Account verification email sent to ${user.email}`);
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending account verification email: ${error.message}`
    );
    throw error;
  }
};

module.exports = handleUserAccountVerificationEmail;
