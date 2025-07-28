const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");

const sendAdminCancellationNotification = async (job) => {
  try {
    const {
      booking,
      payment,
      updatePaymentStatus,
      recipient,
      isLateCancellation,
    } = job.data;

    if (!booking) {
      throw new Error(
        "Missing required booking data for admin cancellation notification email"
      );
    }

    // Improved error handling for finding user
    let user;
    try {
      user = await User.findOne(
        { _id: booking.userId },
        "name email firstName lastName"
      )
        .lean()
        .exec();
    } catch (err) {
      logger.error(
        `Error finding user for booking ${booking._id}: ${err.message}`
      );
      user = null;
    }

    if (!user) {
      logger.info(
        `User not found for booking ${booking._id}. Could not send admin cancellation email.`
      );
      throw new Error(`User not found for booking ${booking._id}`);
    }

    const eventDate = new Date(booking.eventStartTime).toLocaleDateString(
      "en-US",
      { day: "numeric", month: "long", year: "numeric" }
    );
    const eventTime = new Date(booking.eventStartTime).toLocaleTimeString(
      "en-US",
      { hour: "2-digit", minute: "2-digit", hour12: true }
    );
    const paymentCompletedDate = payment?.paymentCompletedDate
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
          "Admin email not found in config, cannot send admin cancellation notification"
        );
        throw new Error("Admin email configuration not found");
      }
    }

    const isPaid = payment && payment.transactionStatus === "Completed";
    const subjectPrefix = isLateCancellation
      ? "Late Cancellation Notice"
      : "Cancellation Notification";
    const subjectSuffix = isLateCancellation
      ? "No Automatic Refund"
      : isPaid
      ? "Eligible for Refund"
      : "No Payment Required";

    const mailOptions = {
      from: "admin@fatimanaqvi.com",
      to: adminEmail,
      subject: `${subjectPrefix} - ${subjectSuffix}`,
      template: "adminCancellationNotif",
      context: {
        name:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.name || "Client",
        userEmail: user.email,
        bookingId: booking.bookingId.toString(),
        eventDate,
        eventTime,
        cancellationDate: booking.cancellation?.date
          ? new Date(booking.cancellation.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        cancelledBy: booking.cancellation.cancelledBy || "User",
        reason: booking.cancellation.reason || "No reason provided",
        paymentAmount: payment?.amount || 0,
        paymentCurrency: payment?.currency || "N/A",
        paymentStatus: payment?.transactionStatus || "No Payment",
        paymentCompleted: paymentCompletedDate,
        transactionReferenceNumber:
          payment?.transactionReferenceNumber || "N/A",
        cancelCutoffDays:
          (await Config.getValue("noticePeriod")) || "Unavailable",
        refundLink,
        isAdmin: booking.cancellation.cancelledBy === "Admin",
        isAdminCancelled: booking.cancellation.cancelledBy === "Admin",
        isLateCancellation: isLateCancellation || false,
        isPaid: isPaid,
        frontend_url: process.env.FRONTEND_URL,
        currentYear: new Date().getFullYear(),
      },
    };

    await transporter.sendMail(mailOptions);
    logger.info(
      `Admin cancellation notification email sent to ${adminEmail} (${
        isLateCancellation ? "late" : "normal"
      } cancellation, ${isPaid ? "paid" : "unpaid"})`
    );

    if (updatePaymentStatus && !isLateCancellation && payment) {
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
      `[EMAIL] Error processing admin cancellation notification: ${error}`
    );
    throw error;
  }
};

module.exports = sendAdminCancellationNotification;
