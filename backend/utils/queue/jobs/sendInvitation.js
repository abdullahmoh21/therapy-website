const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const Invitee = require("../../../models/Invitee");

/**
 * Handle sending user invitation email
 * Fetches invitee data and generates invitation link inside the job
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.inviteeId - MongoDB ID of the invitee
 * @param {string} job.data.invitationToken - Invitation token
 */
const handleUserInvitationEmail = async (job) => {
  try {
    const { inviteeId, invitationToken } = job.data;

    // Fetch invitee data (moved from call site)
    const invitee = await Invitee.findById(inviteeId, "email name")
      .lean()
      .exec();

    if (!invitee) {
      logger.error(
        `Invitee ${inviteeId} not found. Cannot send invitation email.`
      );
      throw new Error(`Invitee not found for invitation email`);
    }

    // Build invitation link (moved from call site)
    const link = `${process.env.FRONTEND_URL}/register?token=${invitationToken}`;

    logger.debug(
      `Sending invitation email to ${invitee.email} with link: ${link}`
    );

    const mailOptions = {
      from: "invitations@fatimanaqvi.com",
      to: invitee.email,
      subject: "Invitation to join Fatima's Clinic!",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "user_invitation",
      context: {
        link,
        name: invitee.name,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Invitation email sent to ${invitee.email}`);
  } catch (error) {
    logger.error(`[EMAIL] Error sending invitation email: ${error.message}`);
    throw error;
  }
};

module.exports = handleUserInvitationEmail;
