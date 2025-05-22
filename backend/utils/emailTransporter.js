const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
const Config = require("../models/Config");
const logger = require("../logs/logger");
const mongoose = require("mongoose");

// Default email addresses in case database is not available
const DEFAULT_ADMIN_EMAIL = "abdullahmohsin21007@gmail.com";
const DEFAULT_DEV_EMAIL = "abdullahmohsin21007@gmail.com";

// Setup nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Setup email templates
const handlebarOptions = {
  viewEngine: {
    extName: ".hbs",
    partialsDir: path.resolve("./utils/emailTemplates"),
    defaultLayout: false,
  },
  viewPath: path.resolve("./utils/emailTemplates"),
  extName: ".hbs",
};

// Apply template configuration
transporter.use("compile", hbs(handlebarOptions));

// Send admin alert function
const sendAdminAlert = async (alertType, extraData = {}) => {
  try {
    // First check if MongoDB is connected - if not, use default emails
    let adminEmail = DEFAULT_ADMIN_EMAIL;
    let devEmail = DEFAULT_DEV_EMAIL;

    if (mongoose.connection.readyState === 1) {
      try {
        // Try to get emails from database, but fall back to defaults if anything fails
        const dbAdminEmail = await Config.getValue("adminEmail");
        const dbDevEmail = await Config.getValue("devEmail");

        // Only use database values if they exist
        if (dbAdminEmail) adminEmail = dbAdminEmail;
        if (dbDevEmail) devEmail = dbDevEmail;
      } catch (configError) {
        // Log error but continue with default emails
        logger.warn(
          `Using default emails due to config error: ${configError.message}`
        );
      }
    } else {
      logger.debug(
        `MongoDB not connected, using default email addresses for alert: ${alertType}`
      );
    }

    // Select recipient based on alert type
    const recipient = [
      "mongoDisconnected",
      "mongoReconnected",
      "redisDisconnected",
      "redisReconnected",
    ].includes(alertType)
      ? devEmail
      : adminEmail;

    // Configure alert data
    const alertConfig = getAlertConfig(alertType, extraData);

    // Send the email - wrapped in its own try/catch
    try {
      const info = await transporter.sendMail({
        from: "alert@fatimanaqvi.com",
        to: recipient,
        subject: alertConfig.subject,
        template: "alert",
        context: {
          title: alertConfig.title,
          message: alertConfig.message,
          actionText: alertConfig.actionText || null,
          actionLink: alertConfig.actionLink || null,
          currentYear: new Date().getFullYear(),
        },
      });

      logger.info(`Admin alert sent: ${alertType}`);
      return info;
    } catch (emailError) {
      logger.error(`Failed to send email alert: ${emailError.message}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error preparing email alert: ${error.message}`);
    return null;
  }
};

// Helper function to get alert configuration
function getAlertConfig(alertType, extraData) {
  const configs = {
    mongoDisconnected: {
      subject: "ALERT: MongoDB Connection Lost",
      title: "Database Connection Error",
      message:
        "The application has lost connection to MongoDB. Services requiring database access may be unavailable.",
      actionText: "View System Status",
      actionLink: `${process.env.FRONTEND_URL}/admin/systemhealth`,
    },
    mongoReconnected: {
      subject: "INFO: MongoDB Connection Restored",
      title: "Database Connection Restored",
      message:
        "The connection to MongoDB has been successfully restored. All services should now be functioning normally.",
    },
    // Add other alert types as needed...
    redisDisconnected: {
      subject: "ALERT: Redis Connection Lost",
      title: "Cache Connection Error",
      message:
        "The application has lost connection to Redis. Caching and rate limiting may be affected.",
    },
    redisReconnected: {
      subject: "INFO: Redis Connection Restored",
      title: "Cache Connection Restored",
      message:
        "The connection to Redis has been successfully restored. Caching functionality is now operational.",
    },
    redisDisconnectedInitial: {
      subject: "ALERT: Redis Connection Failed",
      title: "Redis Connection Failed",
      message:
        "The application failed to establish an initial connection to Redis. The system will function with degraded performance.",
    },
  };

  const config = configs[alertType] || {
    subject: `ALERT: ${alertType}`,
    title: "System Alert",
    message: `An alert of type ${alertType} was triggered.`,
  };

  // Add any extra data to the message if provided
  if (extraData && Object.keys(extraData).length > 0) {
    config.message += "\n\nAdditional Information:\n";
    Object.entries(extraData).forEach(([key, value]) => {
      config.message += `\n${key}: ${value}`;
    });
  }

  return config;
}

module.exports = { transporter, sendAdminAlert };
