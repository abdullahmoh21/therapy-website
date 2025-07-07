const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");

const sendResetPasswordEmail = async (job) => {
  try {
    const { name, recipient, link } = job.data;

    const mailOptions = {
      from: "reset@fatimanaqvi.com",
      to: recipient,
      subject: "Reset Password",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "resetPassword",
      context: {
        name,
        link,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Reset password email sent to ${recipient}`);
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending Reset Password link to ${job.data.recipient}: ${error}`
    );
    throw error;
  }
};

module.exports = sendResetPasswordEmail;
