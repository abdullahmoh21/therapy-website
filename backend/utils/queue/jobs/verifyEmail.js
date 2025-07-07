const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");

const sendVerificationEmail = async (job) => {
  try {
    const { name, recipient, link } = job.data;

    const mailOptions = {
      from: "verification@fatimanaqvi.com",
      to: recipient,
      subject: "Verify Account",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "verifyEmail",
      context: {
        name,
        link,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${recipient}`);
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending verification email to ${job.data.recipient}: ${error}`
    );
    throw error;
  }
};

module.exports = sendVerificationEmail;
