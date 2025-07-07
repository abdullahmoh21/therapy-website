const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const Config = require("../../../models/Config");

const sendContactMeEmail = async (job) => {
  try {
    const { type, name, email, phone, message } = job.data;

    const adminEmail = await Config.getValue("adminEmail");
    if (!adminEmail) {
      logger.error(
        "Admin email not found in config, cannot forward contact request"
      );
      throw new Error("Admin email configuration not found");
    }
    logger.debug(`sending email to admin: ${adminEmail}`);

    const userMailOptions = {
      from: "inquiries@fatimanaqvi.com",
      to: email,
      subject: "Thank you for contacting me",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "contactMeConfirmation",
      context: {
        name,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    const adminMailOptions = {
      from: "inquiries@fatimanaqvi.com",
      to: adminEmail,
      subject: `Inquiry from ${name}`,
      replyTo: email,
      template: "contactMe",
      context: {
        name,
        email,
        type,
        phone,
        message,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    logger.info(
      `Contact Me forwarded to admin (${adminEmail}) and confirmation sent to ${email}`
    );
  } catch (error) {
    logger.error(`[EMAIL] Error sending Contact Me email: ${error}`);
    throw error;
  }
};

module.exports = sendContactMeEmail;
