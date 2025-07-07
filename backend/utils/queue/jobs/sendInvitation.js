const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");

const sendInvitationEmail = async (job) => {
  try {
    const { recipient, link, name } = job.data;
    logger.debug(`in worker for invitation with link:${link}`);

    const mailOptions = {
      from: "invitations@fatimanaqvi.com",
      to: recipient,
      subject: "Invitation to join Fatima's Clinic!",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "invite",
      context: {
        link,
        name,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Invitation email sent to ${recipient}`);
  } catch (error) {
    logger.error(
      `Error sending invitation email to ${job.data.recipient}: ${error}`
    );
    throw error;
  }
};

module.exports = sendInvitationEmail;
