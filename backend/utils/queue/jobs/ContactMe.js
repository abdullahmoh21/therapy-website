const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const Config = require("../../../models/Config");

/**
 * Handle contact inquiry submission
 * Sends confirmation to user and forwards inquiry to admin
 * Note: Takes primitive values as params since this is form data, not DB records
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.type - Type of inquiry
 * @param {string} job.data.name - Inquirer's name
 * @param {string} job.data.email - Inquirer's email
 * @param {string} job.data.phone - Inquirer's phone
 * @param {string} job.data.message - Inquiry message
 */
const handleContactInquiry = async (job) => {
  try {
    const { type, name, email, phone, message } = job.data;

    // Fetch admin email (moved from call site)
    const adminEmail = await Config.getValue("adminEmail");
    if (!adminEmail) {
      logger.error(
        "Admin email not found in config, cannot forward contact request"
      );
      throw new Error("Admin email configuration not found");
    }

    logger.debug(
      `Processing contact inquiry from ${email} to admin: ${adminEmail}`
    );

    // Send confirmation email to user
    const userMailOptions = {
      from: "inquiries@fatimanaqvi.com",
      to: email,
      subject: "Thank you for contacting me",
      replyTo: adminEmail || "no-reply@fatimanaqvi.com",
      template: "user_contact_inquiry_confirmation",
      context: {
        name,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    // Send inquiry to admin
    const adminMailOptions = {
      from: "inquiries@fatimanaqvi.com",
      to: adminEmail,
      subject: `Inquiry from ${name}`,
      replyTo: "no-reply@fatimanaqvi.com",
      template: "admin_contact_inquiry",
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

    // Send both emails in parallel
    await Promise.all([
      transporter.sendMail(userMailOptions),
      transporter.sendMail(adminMailOptions),
    ]);

    logger.info(
      `Contact inquiry forwarded to admin (${adminEmail}) and confirmation sent to ${email}`
    );
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending contact inquiry emails: ${error.message}`
    );
    throw error;
  }
};

module.exports = handleContactInquiry;
