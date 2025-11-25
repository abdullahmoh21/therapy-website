const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");
const { invalidateByEvent } = require("../../../middleware/redisCaching");

/**
 * Handle sending booking cancellation notifications
 * Consolidates logic for all cancellation scenarios into one handler
 * Sends emails to user (always) and optionally to admin
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.bookingId - MongoDB ID of the booking (for logging)
 * @param {string} job.data.userId - MongoDB ID of the user
 * @param {string} job.data.cancelledBy - Who cancelled: 'user' or 'admin'
 * @param {string} job.data.reason - Cancellation reason
 * @param {Date} job.data.eventStartTime - Booking start time
 * @param {Date} job.data.cancellationDate - When the cancellation occurred
 * @param {mongoose.Types.ObjectId} job.data.paymentId - Payment ID if exists
 * @param {number} job.data.bookingIdNumber - Human-readable booking ID
 * @param {boolean} job.data.notifyAdmin - Whether to send email to admin (default: true)
 */
const handleBookingCancellationNotifications = async (job) => {
  try {
    const {
      bookingId,
      userId,
      cancelledBy,
      reason,
      eventStartTime,
      cancellationDate,
      paymentId,
      bookingIdNumber,
      notifyAdmin = true,
    } = job.data;

    logger.debug(
      `Processing booking cancellation notifications for booking ${bookingId}, cancelled by: ${cancelledBy}`
    );

    // Fetch all required data in parallel (moved from call sites into handler)
    const [user, payment, noticePeriod, adminEmail] = await Promise.all([
      User.findById(userId, "name email firstName lastName").lean().exec(),
      paymentId
        ? Payment.findById(paymentId).lean().exec()
        : Promise.resolve(null),
      Config.getValue("noticePeriod"),
      Config.getValue("adminEmail"),
    ]);

    if (!user) {
      logger.error(
        `User ${userId} not found for booking ${bookingId}. Cannot send cancellation notifications.`
      );
      throw new Error(`User not found for booking ${bookingId}`);
    }

    // Calculate refund eligibility and timing (moved from call sites)
    const cutoffDays = parseInt(noticePeriod, 10) || 2;
    const currentTime = new Date(cancellationDate);
    const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
    const cutoffDeadline = new Date(
      new Date(eventStartTime).getTime() - cutoffMillis
    );

    const isUnpaid = !payment || payment.transactionStatus !== "Completed";
    const isRefundEligible = !isUnpaid && currentTime < cutoffDeadline;
    const isRefundIneligible = !isUnpaid && !isRefundEligible;
    const isLateCancellation = currentTime >= cutoffDeadline;

    // Format dates and times (moved from call sites)
    const eventDate = new Date(eventStartTime).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const eventTime = new Date(eventStartTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const formattedCancellationDate = new Date(
      cancellationDate
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.name || "Client";

    // Determine display text based on who cancelled
    const isAdminCancelled = cancelledBy === "admin";
    const cancelledByDisplay = isAdminCancelled ? "Admin" : "You";
    const userCancelledBy = isAdminCancelled ? "Admin" : "User";

    // Send user notification email
    try {
      const userEmailTemplate = isAdminCancelled
        ? "user_session_cancelled_by_admin"
        : "user_session_cancellation_confirmation";

      const userMailOptions = {
        from: "bookings@fatimanaqvi.com",
        to: user.email,
        subject: isAdminCancelled
          ? "Session Cancellation Notice"
          : "Booking Cancellation Confirmation",
        replyTo: "no-reply@fatimanaqvi.com",
        template: userEmailTemplate,
        context: {
          name: userName,
          bookingId: bookingIdNumber.toString(),
          eventDate,
          eventTime,
          cancelledBy: userCancelledBy,
          cancelledByDisplay,
          reason,
          cancellationDate: formattedCancellationDate,
          isUnpaid,
          isRefundEligible,
          isRefundIneligible,
          isAdminCancelled,
          cancelCutoffDays: cutoffDays,
          frontend_url: process.env.FRONTEND_URL,
          currentYear: new Date().getFullYear(),
        },
      };

      await transporter.sendMail(userMailOptions);
      logger.info(
        `User cancellation notification sent to ${user.email} for booking ${bookingId}`
      );
    } catch (emailError) {
      logger.error(
        `Failed to send user cancellation email to ${user.email}: ${emailError.message}`
      );
      // Don't throw - continue to send admin notification if needed
    }

    // Send admin notification email (if flag is true)
    if (notifyAdmin && adminEmail) {
      try {
        const isPaid = payment && payment.transactionStatus === "Completed";

        // Simple subject line when user cancels
        const adminSubject = isAdminCancelled
          ? "Booking Cancellation Notice"
          : `Session Cancelled by ${userName}`;

        const adminMailOptions = {
          from: "admin@fatimanaqvi.com",
          to: adminEmail,
          subject: adminSubject,
          template: "admin_booking_cancellation_alert",
          context: {
            name: userName,
            userEmail: user.email,
            bookingId: bookingIdNumber.toString(),
            eventDate,
            eventTime,
            cancellationDate: formattedCancellationDate,
            cancelledBy: userCancelledBy,
            reason,
            paymentStatus: payment?.transactionStatus || "No Payment",
            isAdmin: isAdminCancelled,
            isAdminCancelled,
            isPaid,
            frontend_url: process.env.FRONTEND_URL,
            currentYear: new Date().getFullYear(),
          },
        };

        await transporter.sendMail(adminMailOptions);
        logger.info(
          `Admin cancellation notification sent for booking ${bookingId} (cancelled by ${
            isAdminCancelled ? "admin" : "user"
          })`
        );

        // Update payment status if eligible for refund (only for paid, on-time cancellations)
        if (isPaid && !isLateCancellation && payment) {
          await Payment.updateOne(
            { _id: payment._id },
            {
              transactionStatus: "Refund Requested",
              refundRequestedDate: new Date(),
            }
          );
          await invalidateByEvent("payment-updated", { userId });
          logger.info(
            `Payment status updated to 'Refund Requested' for paymentId: ${payment._id}`
          );
        }
      } catch (emailError) {
        logger.error(
          `Failed to send admin cancellation email: ${emailError.message}`
        );
        // Don't throw - user notification already sent
      }
    } else if (notifyAdmin && !adminEmail) {
      logger.warn(
        "Admin email not configured - skipping admin cancellation notification"
      );
    }

    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error processing booking cancellation notifications: ${error.message}`
    );
    throw error;
  }
};

module.exports = handleBookingCancellationNotifications;
