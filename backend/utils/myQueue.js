const { Queue, Worker } = require("bullmq");
const { transporter } = require("./emailTransporter");
const logger = require("../logs/logger");
const User = require("../models/User");
const Invitee = require("../models/Invitee");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Config = require("../models/Config");
const { checkRedisAvailability } = require("./redisClient");
const crypto = require("crypto");

let myQueue = null;
let queueWorker = null;

function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function getJobUniqueId(jobName, jobData) {
  let stableKey;

  switch (jobName) {
    case "verifyEmail":
    case "resetPassword":
      stableKey = jobData.recipient; // collapse spam-clicks
      break;
    case "cancellationNotification":
    case "lateCancellation":
    case "refundConfirmation":
      stableKey = jobData.payment?._id || jobData.payment?.id;
      break;
    case "ContactMe":
      stableKey = `${jobData.email}:${crypto
        .createHash("md5")
        .update(jobData.message)
        .digest("hex")}`;
      break;
    case "deleteDocuments":
      stableKey = `${jobData.model}:${jobData.documentIds.sort().join(",")}`;
      break;
    case "sendInvitation":
      stableKey = jobData.recipient;
      break;
    case "adminAlert":
      stableKey = `${jobData.alertType}:${Date.now()}`; // Include timestamp to allow multiple alerts of same type
      break;
    default:
      // Always-unique fallback
      stableKey = stableStringify(jobData);
  }

  return `${jobName}:${crypto
    .createHash("sha256")
    .update(String(stableKey))
    .digest("hex")}`;
}

const initializeQueue = async () => {
  const redisAvailable = await checkRedisAvailability();
  if (!redisAvailable) return false;

  try {
    // Queue instance
    myQueue = new Queue("myQueue", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      },
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: true,
        attempts: 5,
      },
    });

    // Worker instance
    queueWorker = new Worker(
      "myQueue",
      async (job) => {
        switch (job.name) {
          case "verifyEmail":
            return sendVerificationEmail(job);
          case "resetPassword":
            return sendResetPasswordEmail(job);
          case "cancellationNotification":
            return sendCancellationNotification(job);
          case "lateCancellation":
            return sendLateCancellation(job);
          case "refundConfirmation":
            return sendRefundConfirmation(job);
          case "ContactMe":
            return sendContactMeEmail(job);
          case "deleteDocuments":
            return deleteDocuments(job);
          case "sendInvitation":
            return sendInvitationEmail(job);
          case "eventDeleted":
            return sendEventDeletedEmail(job);
          case "unauthorizedBooking":
            return sendUnauthorizedBookingEmail(job);
          case "adminAlert":
            return sendAdminAlertEmail(job);
          default:
            logger.error(`[QUEUE SWITCH] Unknown job name: ${job.name}`);
            return { success: false, error: "Unknown job type" };
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST || "localhost",
          port: process.env.REDIS_PORT || 6379,
          maxRetriesPerRequest: 1,
        },
      }
    );

    // Failed-job handler
    queueWorker.on("failed", async (job, err) => {
      if (job.attemptsMade === job.opts.attempts) {
        const adminEmail = await Config.getValue("adminEmail");
        if (!adminEmail) {
          logger.error("Admin email not found in config");
          return;
        }

        const mailOptions = {
          from: "server@fatimanaqvi.com",
          to: adminEmail,
          subject: "Job Failure Notification",
          html: `
            <h1>Job Failure Alert</h1>
            <p>Job ID: ${job.id}</p>
            <p>Job Name: ${job.name}</p>
            <p>Recipient: ${job.data.recipient}</p>
            <p>Error Message: ${err.message}</p>
            <pre>${JSON.stringify(job.data, null, 2)}</pre>`,
        };

        try {
          await transporter.sendMail(mailOptions);
          logger.info(`Error log sent to admin for job ${job.id}`);
        } catch (e) {
          logger.error(`[EMAIL] Could not notify admin: ${e.message}`);
        }
      }
    });

    logger.info("BullMQ queue system initialized successfully");
    return true;
  } catch (error) {
    logger.error(`[QUEUE] Initialization error: ${error.message}`);
    return false;
  }
};

const safeAdd = async (jobName, jobData) => {
  if (!myQueue) {
    logger.warn(`Queue unavailable — executing ${jobName} directly`);
    return fallbackExecute(jobName, jobData);
  }

  try {
    const jobId = getJobUniqueId(jobName, jobData);
    logger.debug(`Adding job with ID: ${jobId}`);

    return await myQueue.add(jobName, jobData, {
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 5,
    });
  } catch (error) {
    if (/already exists/i.test(error.message)) {
      logger.info(`Skipping duplicate job: ${jobName}`);
      return { success: true, skipped: true, reason: "duplicate" };
    }

    logger.warn(`Queue add failed, running inline: ${error.message}`);
    return fallbackExecute(jobName, jobData);
  }
};

// --- inline fallback runner ---
const fallbackExecute = function (jobName, jobData) {
  switch (jobName) {
    case "verifyEmail":
      return sendVerificationEmail({ data: jobData });
    case "resetPassword":
      return sendResetPasswordEmail({ data: jobData });
    case "cancellationNotification":
      return sendCancellationNotification({ data: jobData });
    case "lateCancellation":
      return sendLateCancellation({ data: jobData });
    case "refundConfirmation":
      return sendRefundConfirmation({ data: jobData });
    case "ContactMe":
      return sendContactMeEmail({ data: jobData });
    case "sendInvitation":
      return sendInvitationEmail({ data: jobData });
    case "deleteDocuments":
      return deleteDocuments({ data: jobData });
    case "eventDeleted":
      return sendEventDeletedEmail({ data: jobData });
    case "unauthorizedBooking":
      return sendUnauthorizedBookingEmail({ data: jobData });
    case "adminAlert":
      return sendAdminAlertEmail({ data: jobData });
    default:
      throw new Error(`Unknown job type: ${jobName}`);
  }
};

module.exports = {
  initializeQueue,
  sendEmail: safeAdd,
};
//--------------------------------------------------- JOB HANDLERS ----------------------------------------------------//

const deleteDocuments = async (job) => {
  try {
    const { documentIds, model } = job.data;

    let modelInstance;
    switch (model) {
      case "User":
        modelInstance = User;
        break;
      case "Booking":
        modelInstance = Booking;
        break;
      case "Payment":
        modelInstance = Payment;
        break;
      case "Invitee":
        modelInstance = Invitee;
        break;
      default:
        logger.error(`Unknown model: ${model}`);
        return;
    }

    // Delete all documents with the given IDs
    await modelInstance.deleteMany({ _id: { $in: documentIds } });
    logger.info(
      `Successfully deleted documents from ${model} with IDs: ${documentIds}`
    );
  } catch (error) {
    logger.error(`Error deleting documents from ${job.data.model}: ${error}`);
    throw error; // Propagate error for external handling
  }
};

const sendVerificationEmail = async (job) => {
  try {
    const { name, recipient, link } = job.data;

    // Mail options with Handlebars template
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
    throw error; // Propagate error for external handling
  }
};

const sendResetPasswordEmail = async (job) => {
  try {
    const { name, recipient, link } = job.data;

    // Mail options with Handlebars template
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
    throw error; // Propagate error for external handling
  }
};

const sendRefundRequest = async (job) => {
  // This function is kept for backward compatibility but redirects to cancellationNotification
  logger.warn(
    "sendRefundRequest is deprecated. Use sendCancellationNotification instead."
  );
  return sendCancellationNotification(job);
};

const sendCancellationNotification = async (job) => {
  try {
    const { booking, payment, updatePaymentStatus, recipient } = job.data;

    if (!booking || !payment) {
      throw new Error(
        "Missing required data for cancellation notification email"
      );
    }

    const user = await User.findOne(
      { _id: booking.userId },
      "name email firstName lastName"
    )
      .lean()
      .exec();
    if (!user) {
      logger.info(
        `User not found for booking ${booking._id}. Could not send cancellation email.`
      );
      throw new Error(`User not found for booking ${booking._id}`);
    }

    // Prepare data for email
    const eventStartTime = new Date(booking.eventStartTime);
    const currentTime = new Date();

    const eventDate = new Date(booking.eventStartTime).toLocaleDateString(
      "en-US",
      { day: "numeric", month: "long", year: "numeric" }
    );
    const eventTime = new Date(booking.eventStartTime).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit", hour12: true }
    );
    const paymentCompletedDate = payment.paymentCompletedDate
      ? new Date(payment.paymentCompletedDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "N/A";
    const refundLink = `${
      process.env.SAFEPAY_DASHBOARD_URL ||
      "https://sandbox.api.getsafepay.com/dashboard/payments"
    }`;

    let adminEmail = recipient;
    if (!adminEmail) {
      adminEmail = await Config.getValue("adminEmail");
      if (!adminEmail) {
        logger.error(
          "Admin email not found in config, cannot send cancellation notification"
        );
        throw new Error("Admin email configuration not found");
      }
    }

    const mailOptions = {
      from: "admin@fatimanaqvi.com",
      to: adminEmail,
      subject:
        "[ACTION REQUIRED] Cancellation Notification - Eligible for Refund",
      template: "cancellationNotification",
      context: {
        name:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.name || "Client",
        userEmail: user.email,
        bookingId: booking._id.toString(),
        eventDate,
        eventTime,
        cancelledBy: booking.cancellation.cancelledBy || "User",
        paymentAmount: payment.amount,
        paymentStatus: payment.transactionStatus,
        paymentCompleted: paymentCompletedDate,
        transactionReferenceNumber: payment.transactionReferenceNumber,
        cancelCutoffDays:
          (await Config.getValue("noticePeriod")) || "Unavailable",
        refundLink,
        isAdmin: booking.cancellation.cancelledBy === "Admin",
        frontend_url: process.env.FRONTEND_URL || "https://fatimatherapy.com",
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Cancellation notification email sent to ${adminEmail}`);

    //only update payment status if updatePaymentStatus is true and email is sent successfully
    if (updatePaymentStatus) {
      await Payment.updateOne(
        { _id: payment._id },
        {
          transactionStatus: "Refund Requested",
          refundRequestedDate: new Date(),
        }
      );
      logger.info(
        `Payment status updated to 'Refund Requested' for paymentId: ${payment._id}`
      );
    }
  } catch (error) {
    logger.error(
      `[EMAIL] Error processing cancellation notification: ${error}`
    );
    throw error; // Propagate error so that the job is retried
  }
};

const sendLateCancellation = async (job) => {
  try {
    const { booking, payment, recipient } = job.data;

    if (!booking || !payment) {
      throw new Error("Missing required data for late cancellation email");
    }

    const user = await User.findOne(
      { _id: booking.userId },
      "name email firstName lastName"
    )
      .lean()
      .exec();
    if (!user) {
      logger.info(
        `User not found for booking ${booking._id}. Could not send late cancellation email.`
      );
      throw new Error(`User not found for booking ${booking._id}`);
    }

    // Prepare data for email
    const eventStartTime = new Date(booking.eventStartTime);
    const currentTime = new Date();

    const eventDate = new Date(booking.eventStartTime).toLocaleDateString(
      "en-US",
      { day: "numeric", month: "long", year: "numeric" }
    );
    const eventTime = new Date(booking.eventStartTime).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit", hour12: true }
    );
    const paymentCompletedDate = payment.paymentCompletedDate
      ? new Date(payment.paymentCompletedDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;
    const refundLink = `${
      process.env.SAFEPAY_DASHBOARD_URL ||
      "https://sandbox.api.getsafepay.com/dashboard/payments"
    }`;

    let adminEmail = recipient;
    if (!adminEmail) {
      adminEmail = await Config.getValue("adminEmail");
      if (!adminEmail) {
        logger.error(
          "Admin email not found in config, cannot send late cancellation notification"
        );
        throw new Error("Admin email configuration not found");
      }
    }

    const mailOptions = {
      from: "admin@fatimanaqvi.com",
      to: adminEmail,
      subject: "Late Cancellation Notice - No Automatic Refund",
      template: "lateCancellation",
      context: {
        name:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.name || "Client",
        userEmail: user.email,
        bookingId: booking._id.toString(),
        eventDate,
        eventTime,
        cancelledBy: booking.cancellation.cancelledBy || "User",
        paymentAmount: payment.amount,
        paymentStatus: payment.transactionStatus,
        paymentCompleted: paymentCompletedDate,
        transactionReferenceNumber: payment.transactionReferenceNumber,
        cancelCutoffDays:
          (await Config.getValue("noticePeriod")) || "Unavailable",
        refundLink,
        isAdmin: booking.cancellation.cancelledBy === "Admin",
        frontend_url: process.env.FRONTEND_URL || "https://fatimatherapy.com",
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Late cancellation notification email sent to ${adminEmail}`);
  } catch (error) {
    logger.error(
      `[EMAIL] Error processing late cancellation notification: ${error}`
    );
    throw error; // Propagate error so that the job is retried
  }
};

const sendRefundConfirmation = async (job) => {
  try {
    const { payment } = job.data;
    if (!payment) {
      throw new Error("Missing required data for refund request email");
    }

    const [user, booking, adminEmail] = await Promise.all([
      User.findOne({ _id: payment.userId }, "name email").lean().exec(),
      Booking.findOne({ _id: payment.bookingId }).select("").lean().exec(),
      Config.getValue("adminEmail"),
    ]);

    if (!adminEmail) {
      logger.warn(
        "Admin email not found in config, using default reply-to address"
      );
    }

    const eventDate = new Date(booking.eventStartTime).toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "long", year: "numeric" }
    );
    const eventTime = new Date(booking.eventStartTime).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit", hour12: true }
    );
    const paymentCompletedDate = payment.paymentCompletedDate
      ? new Date(payment.paymentCompletedDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }) +
        " " +
        new Date(payment.paymentCompletedDate).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "N/A";

    const mailOptions = {
      from: "admin@fatimanaqvi.com",
      to: user.email,
      subject: "Refund Confirmation",
      replyTo: adminEmail || "no-reply@fatimanaqvi.com",
      template: "refundConfirmation",
      context: {
        name: user.name,
        userEmail: user.email,
        bookingId: booking.bookingId,
        eventDate,
        eventTime,
        paymentAmount: payment.amount,
        paymentStatus: payment.transactionStatus,
        paymentCompleted: paymentCompletedDate,
        transactionReferenceNumber: payment.transactionReferenceNumber,
        adminEmail: adminEmail || "admin@fatimanaqvi.com",
        currentYear: new Date().getFullYear(),
        frontend_url: process.env.FRONTEND_URL,
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Refund Confirmation email sent to ${user.email}`);
  } catch (error) {
    logger.error(`[EMAIL] Error processing refund request: ${error}`);
    throw error; // Propagate error for external handling
  }
};

const sendContactMeEmail = async (job) => {
  try {
    const { type, name, email, phone, message } = job.data;

    // Fetch admin email from config
    const adminEmail = await Config.getValue("adminEmail");
    if (!adminEmail) {
      logger.error(
        "Admin email not found in config, cannot forward contact request"
      );
      throw new Error("Admin email configuration not found");
    }
    logger.debug(`sending email to admin: ${adminEmail}`);
    // send user confirmation email
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

    // forward email to admin. Admin will contact the user directly
    const adminMailOptions = {
      from: "inquiries@fatimanaqvi.com",
      to: adminEmail,
      subject: `Inquiry from ${name}`,
      replyTo: email, // admin should reply to inquirer
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
    throw error; // Propagate error for retry
  }
};

const sendInvitationEmail = async (job) => {
  try {
    const { recipient, link } = job.data;
    logger.debug(`in worker for invitation with link:${link}`);

    // Mail options with Handlebars template
    const mailOptions = {
      from: "invitations@fatimanaqvi.com",
      to: recipient,
      subject: "Invitation to join Fatima's Clinic!",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "invite",
      context: {
        link,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Invitation email sent to ${recipient}`);
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending invitation email to ${job.data.recipient}: ${error}`
    );
    throw error; // Propagate error for external handling
  }
};

const sendEventDeletedEmail = async (job) => {
  try {
    const { recipient, name, eventDate, eventTime, reason } = job.data;

    if (!recipient) {
      logger.error("Cannot send event deleted email: no recipient provided");
      return;
    }

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: recipient,
      subject: "Booking Canceled",
      replyTo: "no-reply@fatimanaqvi.com",
      template: "eventDeleted",
      context: {
        name,
        eventDate,
        eventTime,
        reason,
        frontend_url: process.env.FRONTEND_URL || "https://fatimatherapy.com",
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Event deleted email sent to ${recipient}`);
    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error sending event deleted email to ${job.data.recipient}: ${error}`
    );
    throw error; // Propagate error for external handling
  }
};

const sendUnauthorizedBookingEmail = async (job) => {
  try {
    const { recipient, calendlyEmail, name } = job.data;

    // Determine which email to use - if recipient is provided use that, otherwise use calendlyEmail
    const emailTo = recipient || calendlyEmail;

    if (!emailTo) {
      logger.error(
        "Cannot send unauthorized booking email: no recipient provided"
      );
      return;
    }

    // Get admin email for contact information
    const adminEmail = await Config.getValue("adminEmail");

    // Use the provided name or fallback to "Client"
    const clientName = name || "Client";

    const mailOptions = {
      from: "bookings@fatimanaqvi.com",
      to: emailTo,
      subject: "Booking Request Canceled",
      replyTo: adminEmail,
      template: "unauthorizedBooking",
      context: {
        adminEmail,
        clientName, // Pass the name to the template
        frontend_url: process.env.FRONTEND_URL || "https://fatimatherapy.com",
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
    throw error; // Propagate error for external handling
  }
};

const sendAdminAlertEmail = async (job) => {
  try {
    const { alertType, extraData = {} } = job.data;

    // Get alert configuration including recipient type
    const alertConfig = getAlertConfig(alertType, extraData);

    // Get recipient email(s) based on config
    let recipientEmails = [];

    // Determine which email(s) to use based on recipient type
    if (alertConfig.recipient === "dev" || alertConfig.recipient === "both") {
      const devEmail = await Config.getValue("devEmail");
      if (devEmail) recipientEmails.push(devEmail);
    }

    if (alertConfig.recipient === "admin" || alertConfig.recipient === "both") {
      const adminEmail = await Config.getValue("adminEmail");
      if (adminEmail) recipientEmails.push(adminEmail);
    }

    // Fallback if no emails were found
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

    // Send the email to all recipients
    const info = await transporter.sendMail({
      from: "alert@fatimanaqvi.com",
      to: recipientEmails.join(", "), // Join all emails with comma
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
    throw error; // Propagate error for retry
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
    recipient: "admin", // Default to admin for unknown alert types
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
