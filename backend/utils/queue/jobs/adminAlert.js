const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const Config = require("../../../models/Config");

const sendAdminAlertEmail = async (job) => {
  try {
    const { alertType, extraData = {} } = job.data;

    const alertConfig = getAlertConfig(alertType, extraData);

    let recipientEmails = [];

    if (alertConfig.recipient === "dev" || alertConfig.recipient === "both") {
      const devEmail = await Config.getValue("devEmail");
      if (devEmail) recipientEmails.push(devEmail);
    }

    if (alertConfig.recipient === "admin" || alertConfig.recipient === "both") {
      const adminEmail = await Config.getValue("adminEmail");
      if (adminEmail) recipientEmails.push(adminEmail);
    }

    if (recipientEmails.length === 0) {
      logger.warn(
        `No recipient emails found for alert: ${alertType}, using defaults`
      );
      if (alertConfig.recipient === "dev" || alertConfig.recipient === "both") {
        recipientEmails.push(
          process.env.DEFAULT_DEV_EMAIL || "abdullahmohsin21007@gmail.com"
        );
      }
      if (
        alertConfig.recipient === "admin" ||
        alertConfig.recipient === "both"
      ) {
        recipientEmails.push(
          process.env.DEFAULT_ADMIN_EMAIL || "abdullahmohsin21007@gmail.com"
        );
      }
    }

    const info = await transporter.sendMail({
      from: "alert@fatimanaqvi.com",
      to: recipientEmails.join(", "),
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

    logger.info(
      `Admin alert sent to ${recipientEmails.join(", ")}: ${alertType}`
    );
    return info;
  } catch (error) {
    logger.error(`Error sending admin alert email: ${error.message}`);
    throw error;
  }
};

function getAlertConfig(alertType, extraData) {
  const configs = {
    mongoDisconnected: {
      subject: "ALERT: MongoDB Connection Lost",
      title: "Database Connection Error",
      message:
        "The application has lost connection to MongoDB. Services requiring database access may be unavailable.",
      actionText: "View System Status",
      actionLink: `${process.env.FRONTEND_URL}/admin/systemhealth`,
      recipient: "dev",
    },
    mongoReconnected: {
      subject: "INFO: MongoDB Connection Restored",
      title: "Database Connection Restored",
      message:
        "The connection to MongoDB has been successfully restored. All services should now be functioning normally.",
      recipient: "dev",
    },
    redisDisconnected: {
      subject: "ALERT: Redis Connection Lost",
      title: "Cache Connection Error",
      message:
        "The application has lost connection to Redis. Caching and rate limiting may be affected.",
      recipient: "dev",
    },
    redisReconnected: {
      subject: "INFO: Redis Connection Restored",
      title: "Cache Connection Restored",
      message:
        "The connection to Redis has been successfully restored. Caching functionality is now operational.",
      recipient: "dev",
    },
    redisDisconnectedInitial: {
      subject: "ALERT: Redis Connection Failed",
      title: "Redis Connection Failed",
      message:
        "The application failed to establish an initial connection to Redis. The system will function with degraded performance.",
      recipient: "dev",
    },
    calendlyDisconnected: {
      subject: "ALERT: Calendly Connection Lost",
      title: "Calendly Integration Error",
      message:
        "The application has lost connection to Calendly. Booking functionality may be affected.",
      recipient: "both",
    },
    calendlyWebhookDown: {
      subject: "ALERT: Calendly Webhook Down",
      title: "Calendly Webhook Error",
      message:
        "The application failed to establish a webhook connection to Calendly. Booking functionality may be affected",
      recipient: "both",
    },
    serverError: {
      subject: "ALERT: Server Error",
      title: "Server Error",
      message: "An error occurred on the server that requires attention.",
      recipient: "dev",
    },
  };

  const config = configs[alertType] || {
    subject: `ALERT: ${alertType}`,
    title: "System Alert",
    message: `An alert of type ${alertType} was triggered.`,
    recipient: "admin",
  };

  if (extraData && Object.keys(extraData).length > 0) {
    config.message += "\n\nAdditional Information:\n";
    Object.entries(extraData).forEach(([key, value]) => {
      config.message += `\n${key}: ${value}`;
    });
  }

  return config;
}

module.exports = sendAdminAlertEmail;
