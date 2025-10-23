// Google Calendar sync worker
const { google } = require("googleapis");
const Booking = require("../../../models/Booking");
const User = require("../../../models/User");
const logger = require("../../../logs/logger");
const { utcToZonedTime, format } = require("date-fns-tz");
const { createOAuth2Client } = require("../../googleOAuth");

const syncCalendar = async (jobData) => {
  const { bookingId } = jobData.data;
  logger.debug(`syncCalendar job started for booking: ${bookingId}`);

  let booking;

  try {
    // Validate input
    if (!bookingId) {
      logger.error(`syncCalendar job failed: No booking ID provided`);
      return { success: false, error: "No booking ID provided" };
    }

    // 1) Fetch booking + user
    logger.debug(`Fetching booking data for ID: ${bookingId}`);
    booking = await Booking.findById(bookingId); // full doc, not lean

    if (!booking) {
      logger.error(
        `Google Calendar sync failed: Booking ${bookingId} not found`
      );
      return { success: false, error: "Booking not found" };
    }

    // Check if booking is cancelled - don't sync cancelled bookings
    if (booking.status === "Cancelled") {
      logger.info(`Skipping sync for cancelled booking ${bookingId}`);
      await updateSyncStatus(booking, "google", "not_applicable");
      return {
        success: true,
        message: "Booking is cancelled, sync not needed",
      };
    }

    // Check if already synced to avoid duplicate work
    if (booking.syncStatus?.google === "synced" && booking.googleEventId) {
      logger.info(`Booking ${bookingId} already synced with Google Calendar`);
      return {
        success: true,
        message: "Already synced",
        eventId: booking.googleEventId,
      };
    }

    logger.debug(
      `Booking found: ${
        booking.calendly?.eventName || "Unknown event"
      }, start: ${booking.eventStartTime}, end: ${booking.eventEndTime}`
    );

    if (booking.recurring && booking.recurring.state) {
      logger.debug(
        `Recurring booking: seriesId=${booking.recurring.seriesId}, interval=${booking.recurring.interval}, day=${booking.recurring.day}, time=${booking.recurring.time}`
      );
    }

    logger.debug(`Fetching user data for ID: ${booking.userId}`);
    const user = await User.findById(booking.userId);
    if (!user) {
      logger.error(
        `Google Calendar sync failed: User not found for booking ${bookingId}`
      );
      await updateSyncStatus(booking, "google", "failed");
      return { success: false, error: "User not found" };
    }

    logger.debug(`User found: ${user.name} (${user.email})`);

    const oauth2Client = await createOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // 3) PKT → strings
    logger.debug(`Converting booking times to Pakistan timezone`);
    const startPk = utcToZonedTime(booking.eventStartTime, "Asia/Karachi");
    const endPk = utcToZonedTime(booking.eventEndTime, "Asia/Karachi");
    const startStr = format(startPk, "yyyy-MM-dd'T'HH:mm:ss");
    const endStr = format(endPk, "yyyy-MM-dd'T'HH:mm:ss");

    logger.debug(`Converted times - start: ${startStr}, end: ${endStr}`);

    // 4) Build event payload
    logger.debug(`Building Google Calendar event payload`);
    const locationInfo =
      booking.location?.type === "in-person" &&
      booking.location?.inPersonLocation
        ? booking.location.inPersonLocation
        : "Online Session";

    logger.debug(`Location info for event: ${locationInfo}`);

    const eventDescription = `Therapy session for ${user.name}${
      booking.location?.type === "in-person" &&
      booking.location?.inPersonLocation
        ? `\nLocation: ${booking.location.inPersonLocation}`
        : ""
    }`;

    const eventTitle =
      booking.source == "system"
        ? `Recurring Session with ${user.name}`
        : `Therapy Session with ${user.name}`;

    const eventData = {
      summary: eventTitle,
      location: locationInfo,
      description: eventDescription,
      start: { dateTime: startStr, timeZone: "Asia/Karachi" },
      end: { dateTime: endStr, timeZone: "Asia/Karachi" },
      reminders: { useDefault: true },
    };

    if (booking.location?.type === "online") {
      logger.debug(`Adding Google Meet conferenceData for online meeting`);
      eventData.conferenceData = {
        createRequest: {
          requestId: `booking-${bookingId}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    logger.debug(`Event payload prepared: ${JSON.stringify(eventData)}`);

    // 5) Create or update event
    let response;
    try {
      if (booking.googleEventId) {
        logger.debug(
          `Updating existing Google Calendar event: ${booking.googleEventId}`
        );
        response = await calendar.events.update({
          calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
          eventId: booking.googleEventId,
          requestBody: eventData,
          conferenceDataVersion: booking.location?.type === "online" ? 1 : 0,
        });
        logger.info(`Google Calendar event updated for booking ${bookingId}`);
        logger.debug(`Update response status: ${response.status}`);
      } else {
        logger.debug(`Creating new Google Calendar event`);
        response = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
          requestBody: eventData,
          conferenceDataVersion: booking.location?.type === "online" ? 1 : 0,
        });
        logger.info(`Google Calendar event created for booking ${bookingId}`);
        logger.debug(`Created event ID: ${response.data.id}`);
        logger.debug(`Insert response status: ${response.status}`);

        booking.googleEventId = response.data.id;
        logger.debug(
          `Saving booking with new Google event ID: ${response.data.id}`
        );
      }

      // Save the HTML link from the response
      if (response.data.htmlLink) {
        booking.googleHtmlLink = response.data.htmlLink;
        logger.debug(
          `Saving Google Calendar HTML link: ${response.data.htmlLink}`
        );
      }
    } catch (googleError) {
      // Handle specific Google Calendar API errors
      if (googleError.code === 404 && booking.googleEventId) {
        logger.warn(
          `Google Calendar event ${booking.googleEventId} not found, creating new event`
        );
        // Clear the invalid event ID and create a new event
        booking.googleEventId = null;
        response = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
          requestBody: eventData,
          conferenceDataVersion: booking.location?.type === "online" ? 1 : 0,
        });
        booking.googleEventId = response.data.id;
        if (response.data.htmlLink) {
          booking.googleHtmlLink = response.data.htmlLink;
          logger.debug(
            `Saving Google Calendar HTML link: ${response.data.htmlLink}`
          );
        }
        logger.info(
          `Created new Google Calendar event for booking ${bookingId}`
        );
      } else if (googleError.code === 403) {
        logger.error(
          `Google Calendar access forbidden for booking ${bookingId}: ${googleError.message}`
        );
        await updateSyncStatus(booking, "google", "access_denied");
        return { success: false, error: "Google Calendar access denied" };
      } else if (googleError.code === 401) {
        logger.error(
          `Google Calendar authentication failed for booking ${bookingId}: ${googleError.message}`
        );
        await updateSyncStatus(booking, "google", "auth_failed");
        return {
          success: false,
          error: "Google Calendar authentication failed",
        };
      } else {
        logger.error(
          `Google Calendar API error for booking ${bookingId}: ${googleError.message}`
        );
        throw googleError; // Re-throw for general error handling
      }
    }

    // 6) Update booking with Google Meet link for online meetings
    if (
      booking.location?.type === "online" &&
      response.data.conferenceData?.entryPoints
    ) {
      const meetLink = response.data.conferenceData.entryPoints.find(
        (ep) => ep.entryPointType === "video"
      )?.uri;
      if (meetLink) {
        logger.debug(`Updating booking with Google Meet link: ${meetLink}`);
        booking.location.meetingLink = meetLink;
      }
    }

    await booking.save();
    logger.debug(`Updating sync status to 'synced'`);
    await updateSyncStatus(booking, "google", "synced");

    // After successful calendar sync, schedule client invitation
    try {
      const LEAD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days before
      const delay = Math.max(
        0,
        new Date(booking.eventStartTime).getTime() - Date.now() - LEAD_MS
      );

      // Dynamically import addJob to avoid circular dependency
      const { addJob } = require("../index");

      await addJob(
        "addClientAttendee",
        { bookingId: bookingId.toString() },
        { delay } // this will run ~2 days before the session
      );

      logger.info(
        `Scheduled client calendar invitation for booking ${bookingId} (will run in ${Math.round(
          delay / 86400000
        )} days)`
      );
    } catch (error) {
      logger.error(
        `Failed to schedule client invitation for booking ${bookingId}: ${error.message}`
      );
      // Continue with the success response even if queuing the invitation fails
    }

    logger.debug(
      `syncCalendar job completed successfully for booking ${bookingId}`
    );
    return { success: true, eventId: response.data.id };
  } catch (error) {
    logger.error(
      `Google Calendar sync error for booking ${bookingId}: ${error.message}`
    );
    logger.debug(`Error details: ${error.stack}`);

    if (booking) {
      logger.debug(`Updating sync status to 'failed'`);
      await updateSyncStatus(booking, "google", "failed");
    }

    return { success: false, error: error.message };
  }
};

// updateSyncStatus — guards against missing sub-objects & marks modified
async function updateSyncStatus(booking, service, status) {
  try {
    logger.debug(
      `Updating sync status for booking ${booking._id}, service: ${service}, status: ${status}`
    );
    booking.syncStatus = booking.syncStatus || {};
    booking.syncStatus[service] = status;
    booking.syncStatus.lastSyncAttempt = new Date();
    booking.markModified("syncStatus");
    await booking.save();
    logger.debug(`Sync status updated successfully`);
  } catch (err) {
    logger.error(
      `Failed to update sync status for booking ${booking._id}: ${err.message}`
    );
    logger.debug(`Error details: ${err.stack}`);
  }
}

module.exports = syncCalendar;
