const { google } = require("googleapis");
const logger = require("../../../logs/logger");
const Booking = require("../../../models/Booking");
const User = require("../../../models/User");
const { createOAuth2Client } = require("../../googleOAuth");

/**
 * Handle adding client as attendee to Google Calendar event
 * Sends calendar invitation to client 2 days before session
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.bookingId - MongoDB ID of the booking
 */
const handleClientCalendarInvitation = async (job) => {
  try {
    const { bookingId } = job.data;
    logger.debug(
      `handleClientCalendarInvitation job started for booking: ${bookingId}`
    );

    // Validate input
    if (!bookingId) {
      logger.error(
        `handleClientCalendarInvitation job failed: No booking ID provided`
      );
      return { success: false, error: "No booking ID provided" };
    }

    // Fetch booking with Google Calendar event ID
    const booking = await Booking.findById(bookingId);

    // Gracefully handle non-existent booking (might have been deleted)
    if (!booking) {
      return { success: true, skipped: true, reason: "booking-not-found" };
    }

    // Skip if invitation already sent
    if (booking.invitationSent === true) {
      logger.info(
        `Invitation already sent for booking ${bookingId} - skipping`
      );
      return { success: true, skipped: true, reason: "already-sent" };
    }

    // Skip if booking is cancelled
    if (booking.status === "Cancelled") {
      logger.info(`Booking ${bookingId} is cancelled - skipping invitation`);
      return { success: true, skipped: true, reason: "booking-cancelled" };
    }

    // Check if Google Calendar event exists
    if (!booking.googleEventId) {
      logger.warn(
        `No Google Calendar event ID found for booking ${bookingId} - marking as processed`
      );
      booking.invitationSent = true; // Mark as processed to avoid retries
      await booking.save();
      return { success: true, skipped: true, reason: "no-calendar-event" };
    }

    // Fetch user information
    const user = await User.findById(booking.userId);
    if (!user) {
      logger.warn(
        `User not found for booking ${bookingId} - marking as processed`
      );
      booking.invitationSent = true; // Mark as processed to avoid retries
      await booking.save();
      return { success: true, skipped: true, reason: "user-not-found" };
    }

    // Use the OAuth client to create calendar client
    const oauth2Client = await createOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      // First check if the event still exists
      await calendar.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: booking.googleEventId,
      });

      // Add client as attendee to the Google Calendar event
      await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: booking.googleEventId,
        requestBody: {
          attendees: [
            {
              email: user.email,
              displayName: user.name,
              responseStatus: "needsAction",
            },
          ],
        },
        sendUpdates: "all", // Send notifications to attendees
      });

      logger.info(
        `Successfully added ${user.email} as attendee to calendar event for booking ${bookingId}`
      );
    } catch (calendarError) {
      // Handle case where calendar event doesn't exist anymore
      if (
        calendarError.code === 404 ||
        calendarError.message?.includes("notFound")
      ) {
        logger.warn(
          `Google Calendar event for booking ${bookingId} no longer exists - marking as processed`
        );
        booking.invitationSent = true; // Mark as processed to avoid retries
        await booking.save();
        return {
          success: true,
          skipped: true,
          reason: "calendar-event-deleted",
        };
      }

      // For other API errors, let the job retry
      throw calendarError;
    }

    // Update booking to track that invitation was sent
    booking.invitationSent = true;
    await booking.save();

    return { success: true, invitationSent: true };
  } catch (error) {
    logger.error(
      `Error in handleClientCalendarInvitation job for booking ${job.data.bookingId}: ${error.message}`
    );
    logger.debug(`Error details: ${error.stack}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = handleClientCalendarInvitation;
