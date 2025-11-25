// Google Calendar cancellation worker
const { google } = require("googleapis");
const Booking = require("../../../models/Booking");
const User = require("../../../models/User");
const logger = require("../../../logs/logger");
const { createOAuth2Client } = require("../../googleOAuth");

/**
 * Handle Google Calendar event cancellation
 * Deletes event from Google Calendar and optionally notifies user
 *
 * @param {Object} jobData - Job data
 * @param {Object} jobData.data - Job parameters
 * @param {string} jobData.data.bookingId - MongoDB ID of the booking to cancel
 * @param {boolean} [jobData.data.notifyUser=false] - Whether to send cancellation email to user
 * @param {string} [jobData.data.reason] - Reason for cancellation
 */
const handleGoogleCalendarCancellation = async (jobData) => {
  const { bookingId, notifyUser = false, reason } = jobData.data;
  logger.debug(
    `handleGoogleCalendarCancellation job started for booking: ${bookingId}`
  );

  try {
    // 1) Fetch booking
    logger.debug(`Fetching booking data for ID: ${bookingId}`);
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      logger.error(
        `Google Calendar cancellation failed: Booking ${bookingId} not found`
      );
      return { success: false, error: "Booking not found" };
    }

    // 2) Check if there's a Google Calendar event ID
    if (!booking.googleEventId) {
      logger.warn(`No Google Calendar event ID found for booking ${bookingId}`);
      return { success: false, error: "No Google Calendar event ID" };
    }

    // 3) Delete the Google Calendar event
    logger.debug(`Deleting Google Calendar event ID: ${booking.googleEventId}`);
    const oauth2Client = await createOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Delete the event from Google Calendar
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      eventId: booking.googleEventId,
    });

    logger.info(
      `Google Calendar event ${booking.googleEventId} deleted successfully`
    );

    // 4) Update booking sync status
    booking.syncStatus = booking.syncStatus || {};
    booking.syncStatus.google = "synced"; // Keep as synced since the deletion succeeded
    booking.syncStatus.lastSyncAttempt = new Date();
    booking.markModified("syncStatus");
    await booking.save();

    // 5) If notifyUser is true and deletion was successful, send cancellation notification
    if (notifyUser) {
      try {
        const user = await User.findById(booking.userId);
        if (user) {
          // Format dates for email (moved into job handler)
          const eventDate = booking.eventStartTime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: booking.eventTimezone || "Asia/Karachi",
          });

          const eventTime = booking.eventStartTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: booking.eventTimezone || "Asia/Karachi",
          });

          const cancellationDate = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const { sendEmail } = require("../jobScheduler"); // to avoid circular dependency
          await sendEmail("BookingCancellationNotifications", {
            bookingId: booking._id.toString(),
            userId: booking.userId.toString(),
            cancelledBy: "admin",
            reason: reason || "Session cancelled",
            eventStartTime: booking.eventStartTime,
            cancellationDate: new Date(),
            paymentId: booking.paymentId ? booking.paymentId.toString() : null,
            bookingIdNumber: booking.bookingId,
            notifyAdmin: false, // Admin already knows - they cancelled it
          });
          logger.info(`Queued cancellation notification for user ${user._id}`);
        }
      } catch (emailError) {
        logger.error(
          `Failed to send cancellation email: ${emailError.message}`
        );
        // Don't fail the job if email fails - the Google event was successfully deleted
      }
    }

    return { success: true, eventId: booking.googleEventId };
  } catch (error) {
    logger.error(
      `Google Calendar cancellation error for booking ${bookingId}: ${error.message}`
    );
    logger.debug(`Error details: ${error.stack}`);

    // If the event doesn't exist, consider it successfully deleted
    if (error.code === 404 || error.message.includes("notFound")) {
      logger.warn(
        `Event not found in Google Calendar, marking as deleted anyway`
      );

      // Still try to send notification email if requested
      if (notifyUser) {
        try {
          const booking = await Booking.findById(bookingId);
          const user = await User.findById(booking?.userId);
          if (user && booking) {
            const { sendEmail } = require("../jobScheduler"); // to avoid circular dependency
            await sendEmail("BookingCancellationNotifications", {
              bookingId: booking._id.toString(),
              userId: booking.userId.toString(),
              cancelledBy: "admin",
              reason: reason || "Session cancelled",
              eventStartTime: booking.eventStartTime,
              cancellationDate: new Date(),
              paymentId: booking.paymentId
                ? booking.paymentId.toString()
                : null,
              bookingIdNumber: booking.bookingId,
              notifyAdmin: false,
            });
          }
        } catch (emailError) {
          logger.error(
            `Failed to send cancellation email after 404: ${emailError.message}`
          );
        }
      }

      return { success: true, error: "Event not found in Google Calendar" };
    }

    return { success: false, error: error.message };
  }
};

module.exports = handleGoogleCalendarCancellation;
