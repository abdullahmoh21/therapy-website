const { transporter } = require("../../emailTransporter");
const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");
const { invalidateByEvent } = require("../../../middleware/redisCaching");

/**
 * Sends cancellation notifications to both user and admin when a user cancels their booking
 * This job fetches all required data and sends both emails
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.bookingId - MongoDB ID of the booking
 * @param {string} job.data.userId - MongoDB ID of the user
 * @param {string} job.data.reason - Cancellation reason provided by user
 * @param {Date} job.data.eventStartTime - Booking start time
 * @param {Date} job.data.cancellationDate - When the cancellation occurred
 * @param {mongoose.Types.ObjectId} job.data.paymentId - Payment ID if exists
 * @param {number} job.data.bookingIdNumber - Human-readable booking ID
 */
const sendUserInitiatedCancellationNotifications = async (job) => {
  try {
    const {
      bookingId,
      userId,
      reason,
      eventStartTime,
      cancellationDate,
      paymentId,
      bookingIdNumber,
    } = job.data;

    logger.debug(
      `Processing user-initiated cancellation notifications for booking ${bookingId}`
    );

    // Fetch user and payment data in parallel (outside request/response cycle)
    const [user, payment, noticePeriod, adminEmail] = await Promise.all([
      User.findById(userId).lean().exec(),
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

    const cutoffDays = parseInt(noticePeriod, 10) || 2;
    const currentTime = new Date(cancellationDate);
    const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
    const cutoffDeadline = new Date(
      new Date(eventStartTime).getTime() - cutoffMillis
    );

    // Calculate refund eligibility
    const isUnpaid = !payment || payment.transactionStatus !== "Completed";
    const isRefundEligible = !isUnpaid && currentTime < cutoffDeadline;
    const isRefundIneligible = !isUnpaid && !isRefundEligible;
    const isLateCancellation = currentTime >= cutoffDeadline;

    // Format dates and times
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

    const userName = user.firstName
      ? `${user.firstName} ${user.lastName}`
      : user.name;

    // Send user notification email
    try {
      const userMailOptions = {
        from: "bookings@fatimanaqvi.com",
        to: user.email,
        subject: "Booking Cancellation Confirmation",
        replyTo: "no-reply@fatimanaqvi.com",
        template: "userCancellationNotif",
        context: {
          name: userName,
          bookingId: bookingIdNumber.toString(),
          eventDate,
          eventTime,
          cancelledBy: "User",
          cancelledByDisplay: "You",
          reason,
          cancellationDate: formattedCancellationDate,
          isUnpaid,
          isRefundEligible,
          isRefundIneligible,
          isAdminCancelled: false,
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
      // Don't throw - continue to send admin notification
    }

    // Send admin notification email
    if (adminEmail) {
      try {
        const isPaid = payment && payment.transactionStatus === "Completed";
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

        const name = user?.name || "User";
        const adminMailOptions = {
          from: "admin@fatimanaqvi.com",
          to: adminEmail,
          subject: `${name} Cancelled Session`,
          template: "adminCancellationNotif",
          context: {
            name: userName,
            userEmail: user.email,
            bookingId: bookingIdNumber.toString(),
            eventDate,
            eventTime,
            cancellationDate: formattedCancellationDate,
            cancelledBy: "User",
            reason,
            paymentAmount: payment?.amount || 0,
            paymentCurrency: payment?.currency || "N/A",
            paymentStatus: payment?.transactionStatus || "No Payment",
            paymentCompleted: paymentCompletedDate,
            transactionReferenceNumber:
              payment?.transactionReferenceNumber || "N/A",
            cancelCutoffDays: cutoffDays,
            refundLink,
            isAdmin: false,
            isAdminCancelled: false,
            isLateCancellation: isLateCancellation,
            isPaid: isPaid,
            frontend_url: process.env.FRONTEND_URL,
            currentYear: new Date().getFullYear(),
          },
        };

        await transporter.sendMail(adminMailOptions);
        logger.info(
          `Admin cancellation notification sent for booking ${bookingId} (${
            isLateCancellation ? "late" : "normal"
          } cancellation, ${isPaid ? "paid" : "unpaid"})`
        );

        // Update payment status if eligible for refund
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
    } else {
      logger.warn(
        "Admin email not configured - skipping admin cancellation notification"
      );
    }

    return { success: true };
  } catch (error) {
    logger.error(
      `[EMAIL] Error processing user-initiated cancellation notifications: ${error.message}`
    );
    throw error;
  }
};

module.exports = sendUserInitiatedCancellationNotifications;
can;
