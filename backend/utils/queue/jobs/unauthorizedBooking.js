const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const Config = require("../../../models/Config");

const sendUnauthorizedBookingEmail = async (job) => {
  try {
    const { recipient, calendlyEmail, name } = job.data;

    const emailTo = recipient || calendlyEmail;

    if (!emailTo) {
      logger.error(
        "Cannot send unauthorized booking email: no recipient provided"
      );
      return;
    }

    const adminEmail = await Config.getValue("adminEmail");
    const clientName = name || "Client";

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: emailTo,
      subject: "Booking Request Canceled",
      replyTo: adminEmail,
      template: "unauthorizedBooking",
      context: {
        adminEmail,
        clientName,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(
      `Unauthorized booking email sent to ${emailTo} for ${clientName}`
    );
    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending unauthorized booking email to ${
        job.data.recipient || job.data.calendlyEmail
      }: ${error}`
    );
    throw error;
  }
};

module.exports = sendUnauthorizedBookingEmail;
