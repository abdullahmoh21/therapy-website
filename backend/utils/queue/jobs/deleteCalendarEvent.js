const { google } = require("googleapis");
const logger = require("../../../logs/logger");
const Booking = require("../../../models/Booking");
const { createOAuth2Client } = require("../../googleOAuth");

/**
 * Handle Google Calendar event deletion
 * Deletes event from Google Calendar and then removes booking from database
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.bookingId - MongoDB ID of the booking
 */
const handleGoogleCalendarDeletion = async (job) => {
  try {
    const { bookingId } = job.data;
    logger.debug(
      `handleGoogleCalendarDeletion job started for booking: ${bookingId}`
    );

    // Validate input
    if (!bookingId) {
      logger.error(
        `handleGoogleCalendarDeletion job failed: No booking ID provided`
      );
      return { success: false, error: "No booking ID provided" };
    }

    // Check if booking still exists before attempting deletion
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      logger.info(
        `Booking ${bookingId} not found in database, assuming already deleted`
      );
      return { success: true, message: "Booking already deleted" };
    }

    const googleEventId = booking.googleEventId;

    if (!googleEventId) {
      logger.debug(
        `No Google Calendar event ID for booking ${bookingId}, deleting from database only`
      );
      const deleteResult = await Booking.deleteOne({ _id: bookingId });
      logger.info(
        `Deleted booking ${bookingId} from database (no Google Calendar event)`
      );
      return {
        success: true,
        deletedFromDatabase: deleteResult.deletedCount > 0,
      };
    }

    // Use the OAuth client to create calendar client
    const oauth2Client = await createOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Delete the event from Google Calendar (use primary calendar)
    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: googleEventId,
      });
      logger.info(
        `Successfully deleted Google Calendar event ${googleEventId} for booking ${bookingId}`
      );
    } catch (googleError) {
      // Handle specific Google Calendar API errors
      if (googleError.code === 404) {
        logger.info(
          `Google Calendar event ${googleEventId} not found, assuming already deleted`
        );
      } else if (googleError.code === 410) {
        logger.info(
          `Google Calendar event ${googleEventId} is gone (410), assuming already deleted`
        );
      } else {
        logger.error(
          `Failed to delete Google Calendar event ${googleEventId}: ${googleError.message}`
        );
        // Still continue with database deletion even if Google Calendar deletion fails
      }
    }

    // After successful deletion from Google Calendar, delete from our database
    const deleteResult = await Booking.deleteOne({ _id: bookingId });
    logger.info(
      `Deleted booking ${bookingId} from database after Google Calendar deletion`
    );

    return {
      success: true,
      deletedFromGoogle: true,
      deletedFromDatabase: deleteResult.deletedCount > 0,
    };
  } catch (error) {
    logger.error(
      `Error in handleGoogleCalendarDeletion job for booking ${job.data.bookingId}: ${error.message}`
    );
    logger.debug(`Error details: ${error.stack}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = handleGoogleCalendarDeletion;
