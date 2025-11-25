const User = require("../../../models/User");
const Booking = require("../../../models/Booking");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");
const logger = require("../../../logs/logger");
const mongoose = require("mongoose");
const { addMinutes, addWeeks, addMonths, isBefore } = require("date-fns");
const { utcToZonedTime, zonedTimeToUtc } = require("date-fns-tz");
const { addJob, sendEmail } = require("../jobScheduler");
const { getConnectionStatus } = require("../../googleOAuth");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 5 });

const TZ = "Asia/Karachi";
const BUFFER_TARGET_MONTHS = 2; // Maintain 2 months of bookings ahead
const REFRESH_THRESHOLD_WEEKS = 6; // Schedule next refresh when buffer < 6 weeks

/**
 * Calculate the next occurrence of a recurring booking
 */
function getNextOccurrence(lastDate, interval) {
  const local = utcToZonedTime(lastDate, TZ);
  if (interval === "weekly") return zonedTimeToUtc(addWeeks(local, 1), TZ);
  if (interval === "biweekly") return zonedTimeToUtc(addWeeks(local, 2), TZ);
  return zonedTimeToUtc(addMonths(local, 1), TZ);
}

/**
 * Calculate when the next buffer refresh should happen
 * @param {Date} lastBookingDate - The date of the last booking in the buffer
 * @returns {Date} - When to schedule the next refresh
 */
function calculateNextRefreshDate(lastBookingDate) {
  // Schedule refresh when buffer has ~6 weeks left
  // This gives us time to generate more bookings before running out
  const refreshDate = new Date(lastBookingDate);
  refreshDate.setDate(refreshDate.getDate() - REFRESH_THRESHOLD_WEEKS * 7);
  return refreshDate;
}

/**
 * Handle refreshing/extending the recurring booking buffer for a specific user
 * This job is scheduled individually for each recurring user
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.userId - MongoDB ID of the user with recurring bookings
 */
const handleRecurringBookingBufferRefresh = async (job) => {
  const { userId } = job.data;

  logger.info(`Starting buffer refresh for user ${userId}`);

  try {
    // 1. Fetch user and verify they're still recurring
    const user = await User.findOne({
      _id: userId,
      "recurring.state": true,
    });

    if (!user) {
      logger.warn(
        `User ${userId} not found or no longer recurring. Skipping buffer refresh.`
      );
      return {
        success: true,
        skipped: true,
        reason: "user_not_recurring",
      };
    }

    const { interval, day, time, location, recurringSeriesId } = user.recurring;

    logger.debug(`User ${user.name} - ${interval} on day ${day} at ${time}`);

    // 2. Find the last booking in this series
    const lastBooking = await Booking.findOne({
      "recurring.seriesId": recurringSeriesId,
      status: "Active",
    })
      .sort({ eventStartTime: -1 })
      .lean();

    if (!lastBooking) {
      logger.error(
        `No active bookings found for recurring user ${userId}. Cannot refresh buffer.`
      );
      return {
        success: false,
        error: "no_active_bookings",
      };
    }

    const lastBookingDate = new Date(lastBooking.eventStartTime);
    const now = new Date();
    const bufferEnd = addMonths(now, BUFFER_TARGET_MONTHS);

    logger.debug(
      `Last booking: ${lastBookingDate.toISOString()}, extending to: ${bufferEnd.toISOString()}`
    );

    // 3. Get session configuration
    let sessionPrice, currency, sessionLengthMinutes;
    if (user.accountType === "international") {
      sessionPrice = await Config.getValue("intlSessionPrice");
      currency = "USD";
    } else {
      sessionPrice = await Config.getValue("sessionPrice");
      currency = "PKR";
    }
    sessionLengthMinutes = 50; // Default session length

    if (sessionPrice === undefined) {
      logger.error(
        `Session price not configured. Cannot refresh buffer for user ${userId}`
      );
      return {
        success: false,
        error: "no_session_price",
      };
    }

    // 4. Generate new bookings from next occurrence after last booking
    let cursor = getNextOccurrence(lastBookingDate, interval);
    const newBookings = [];
    let createdCount = 0;
    let skippedCount = 0;

    while (isBefore(cursor, bufferEnd)) {
      const start = cursor;
      const end = addMinutes(start, sessionLengthMinutes);

      // Check for conflicts
      const conflict = await Booking.exists({
        status: { $ne: "Cancelled" },
        eventStartTime: { $lt: end },
        eventEndTime: { $gt: start },
      });

      if (conflict) {
        logger.warn(
          `Conflict detected for ${start.toISOString()}. Skipping slot.`
        );
        skippedCount++;
      } else {
        // Create booking
        const initialSyncStatus = {
          google: "pending",
          zoom: location?.type === "online" ? "pending" : "not_applicable",
          lastSyncAttempt: null,
        };

        const bookingData = {
          userId,
          recurring: {
            state: true,
            seriesId: recurringSeriesId,
            interval,
            day,
            time,
          },
          eventStartTime: start,
          eventEndTime: end,
          eventName: "Recurring Session",
          status: "Active",
          source: "system",
          location,
          syncStatus: initialSyncStatus,
        };

        try {
          const booking = await Booking.create(bookingData);

          // Create payment
          const paymentData = {
            bookingId: booking._id,
            userId,
            amount: sessionPrice,
            currency,
            transactionReferenceNumber: `T-${uid.rnd()}`,
            transactionStatus: "Not Initiated",
          };

          const payment = await Payment.create(paymentData);

          // Link payment to booking
          booking.paymentId = payment._id;
          await booking.save();

          newBookings.push({
            bookingId: booking._id,
            start: start.toISOString(),
          });
          createdCount++;

          logger.debug(
            `Created booking ${booking._id} for ${start.toISOString()}`
          );
        } catch (error) {
          logger.error(
            `Failed to create booking for ${start.toISOString()}: ${
              error.message
            }`
          );
        }
      }

      // Advance to next occurrence
      cursor = getNextOccurrence(cursor, interval);
    }

    logger.info(
      `Buffer refresh completed for user ${userId}: ${createdCount} bookings created, ${skippedCount} skipped`
    );

    // 5. Queue Google Calendar sync jobs if connected AND bookings were created
    if (createdCount > 0) {
      const connectionStatus = await getConnectionStatus();
      if (connectionStatus.connected) {
        logger.debug(
          `Queuing ${createdCount} sync jobs for user ${userId}'s new bookings`
        );

        // Queue sync job for Google Calendar
        for (const { bookingId } of newBookings) {
          try {
            await addJob("GoogleCalendarEventSync", {
              bookingId: bookingId.toString(),
            });
            logger.debug(`Queued sync for booking ${bookingId}`);
          } catch (error) {
            logger.error(
              `Failed to queue sync for booking ${bookingId}: ${error.message}`
            );
          }
        }
      } else {
        logger.info(
          `Google Calendar not connected. Skipping sync for ${createdCount} new bookings.`
        );
      }
    }

    // 6. Calculate and schedule the NEXT buffer refresh ONLY IF bookings were created
    let newLastBooking = null;
    if (createdCount > 0) {
      // Find the new last booking
      newLastBooking = await Booking.findOne({
        "recurring.seriesId": recurringSeriesId,
        status: "Active",
      })
        .sort({ eventStartTime: -1 })
        .lean();

      if (newLastBooking) {
        const nextRefreshDate = calculateNextRefreshDate(
          new Date(newLastBooking.eventStartTime)
        );

        // Update user with next refresh date
        await User.findByIdAndUpdate(userId, {
          $set: {
            "recurring.nextBufferRefresh": nextRefreshDate,
          },
        });

        // Schedule the next refresh job
        try {
          await addJob(
            "handleRecurringBookingBufferRefresh",
            { userId: userId.toString() },
            { runAt: nextRefreshDate }
          );

          logger.info(
            `Scheduled next buffer refresh for user ${userId} at ${nextRefreshDate.toISOString()}`
          );
        } catch (error) {
          logger.error(
            `Failed to schedule next buffer refresh for user ${userId}: ${error.message}`
          );
        }
      }
    } else if (skippedCount > 0) {
      // All slots conflicted - alert developer
      logger.error(
        `Buffer refresh for user ${userId} failed: all ${skippedCount} slots conflicted`
      );

      try {
        await sendEmail("SystemAlert", {
          alertType: "buffer_refresh_failed",
          userId: userId.toString(),
          userName: user.name,
          userEmail: user.email,
          reason: "all_slots_conflicted",
          skippedCount,
          interval,
          day,
          time,
          timestamp: new Date().toISOString(),
          message: `Buffer refresh failed for ${user.name} (${user.email}). All ${skippedCount} time slots conflicted with existing bookings. Manual intervention required.`,
        });
        logger.info(
          `Sent system alert to developer about failed buffer refresh for user ${userId}`
        );
      } catch (emailError) {
        logger.error(
          `Failed to send system alert email: ${emailError.message}`
        );
      }
    }

    return {
      success: true,
      userId,
      created: createdCount,
      skipped: skippedCount,
      nextRefresh: newLastBooking
        ? calculateNextRefreshDate(
            new Date(newLastBooking.eventStartTime)
          ).toISOString()
        : null,
    };
  } catch (error) {
    logger.error(
      `Error refreshing buffer for user ${userId}: ${error.message}`
    );
    logger.debug(`Stack trace: ${error.stack}`);

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = handleRecurringBookingBufferRefresh;
