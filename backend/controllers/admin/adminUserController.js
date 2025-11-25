const User = require("../../models/User");
const asyncHandler = require("express-async-handler");
const sanitizeHtml = require("sanitize-html");
const logger = require("../../logs/logger");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const Config = require("../../models/Config");
const Job = require("../../models/Job");
const { invalidateByEvent } = require("../../middleware/redisCaching");
const { emailSchema } = require("../../utils/validation/ValidationSchemas");
const {
  parseISO,
  addMinutes,
  addDays,
  addWeeks,
  addMonths,
  isBefore,
  nextDay,
} = require("date-fns");
const { utcToZonedTime, zonedTimeToUtc, format } = require("date-fns-tz");
const mongoose = require("mongoose");
const axios = require("axios");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const { addJob } = require("../../utils/queue/index");
const { getConnectionStatus } = require("../../utils/googleOAuth");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 5 });

//@desc Get all users
//@param {Object} req with valid role
//@route GET /admin/users
//@access Private
const getAllUsers = asyncHandler(async (req, res) => {
  // Retrieve pagination parameters from the query string
  const page = parseInt(req.query.page, 10) || 1; // Default to page 1
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
  const search = req.query.search || ""; // Get search term from query params

  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 40) {
    return res.status(400).json({
      message:
        "Page and limit must be positive integers and limit should not exceed 40",
    });
  }

  try {
    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Create search query if search parameter exists
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } }, // Case-insensitive search on name
            { email: { $regex: search, $options: "i" } }, // Case-insensitive search on email
          ],
        }
      : {};

    // Add role filter if provided
    if (req.query.role && ["admin", "user"].includes(req.query.role)) {
      searchQuery.role = req.query.role;
    }

    const users = await User.find(searchQuery)
      .select("email name phone role recurring.state")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Get the total number of documents for pagination info
    const totalUsers = await User.countDocuments(searchQuery);

    // Send paginated response
    res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    // Handle any errors that occurred during the query
    logger.error(`Error retrieving users: ${error.message}`);
    res
      .status(500)
      .json({ message: "An error occurred while retrieving users", error });
  }
});

//@desc Delete a user
//@param {Object} req with valid role and email
//@route DELETE /admin/users/:userId
//@access Private
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Check if user has recurring sessions before deletion
    const user = await User.findById(userId);
    const hasRecurring = user?.recurring?.state === true;

    const [bookings, payments, deletedUser, cancelledJobs] = await Promise.all([
      Booking.deleteMany({ userId }),
      Payment.deleteMany({ userId }),
      User.deleteOne({ _id: userId }),
      // Cancel any pending refreshRecurringBuffer jobs for this user
      hasRecurring
        ? Job.updateMany(
            {
              jobName: "refreshRecurringBuffer",
              "jobData.userId": userId.toString(),
              status: { $in: ["pending", "promoted"] },
            },
            { $set: { status: "cancelled" } }
          )
        : Promise.resolve({ modifiedCount: 0 }),
    ]);

    logger.debug(
      `User deletion count: ${deletedUser.deletedCount}\nBooking deleted count: ${bookings.deletedCount}\nPayment deleted count: ${payments.deletedCount}\nCancelled jobs: ${cancelledJobs.modifiedCount}`
    );

    // Invalidate cache
    try {
      await invalidateByEvent("user-deleted", { userId });
      await invalidateByEvent("booking-deleted", { userId });
      await invalidateByEvent("payment-deleted", { userId });
      await invalidateByEvent("admin-data-changed");
    } catch (cacheErr) {
      logger.error(`Cache invalidation failed: ${cacheErr.message}`);
      // Don't fail the request - cache will eventually expire
    }

    // Return proper success response with message
    res.status(200).json({
      message: "User deleted successfully",
      deletedCount: deletedUser.deletedCount,
    });
  } catch (error) {
    logger.error(`Error deleting user: ${error}`);
    res.status(500).json({ message: "Error deleting user" });
  }
});

//@desc Update a user
//@param {Object} req with valid role and userId
//@route PATCH /admin/users/:userId
//@access Private
const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const { name, email, role, accountType } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch current user for email comparison
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create an update object with only the provided fields
    const updateData = {};

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res
          .status(400)
          .json({ message: "Name must be a non-empty string" });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const { error } = emailSchema.validate({ email });

      if (error) {
        return res.status(400).json({
          message: "Invalid email format",
          details: error.details[0].message,
        });
      }

      updateData.email = email;

      if (currentUser.email !== email) {
        updateData["emailVerified.state"] = false;
        updateData["emailVerified.encryptedToken"] = undefined;
        updateData["emailVerified.expiresIn"] = undefined;
      }
    }

    // Validate role if provided
    if (role !== undefined) {
      if (!["admin", "user"].includes(role)) {
        return res
          .status(400)
          .json({ message: "Role must be either 'admin' or 'user'" });
      }
      updateData.role = role;
    }

    // Validate accountType if provided
    if (accountType !== undefined) {
      if (!["domestic", "international"].includes(accountType)) {
        return res.status(400).json({
          message: "Account type must be either 'domestic' or 'international'",
        });
      }
      updateData.accountType = accountType;
    }

    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("name email role accountType emailVerified");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Invalidate cache
    try {
      await invalidateByEvent("user-updated", { userId });
      await invalidateByEvent("admin-data-changed");
    } catch (cacheErr) {
      logger.error(`Cache invalidation failed: ${cacheErr.message}`);
      // Don't fail the request - cache will eventually expire
    }

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    logger.error(`Error updating user: ${error}`);
    res.status(500).json({ message: "Error updating user" });
  }
});

//@desc Get user details by ID
//@param {Object} req with valid role and userId
//@route GET /admin/users/:userId
//@access Private
const getUserDetails = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(userId)
      .select(
        "email emailVerified.state role phone name DOB accountType createdAt updatedAt lastLoginAt recurring.state recurring.interval recurring.day recurring.time recurring.location"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error fetching user details: ${error}`);
    res.status(500).json({ message: "Error fetching user details" });
  }
});

/**
 * @desc Marks a user as recurring and creates calendar events, payments, and bookings
 * @route POST /users/:userId/recur
 * @access Private (Admin only)
 *
 * @param {Object} req.params
 * @param {string} req.params.userId - MongoDB ObjectId of the user
 *
 * @param {Object} req.body
 * @param {string} req.body.interval - Frequency of recurring sessions
 *    - Allowed values: "weekly", "biweekly", "monthly"
 *
 * @param {string} req.body.day - Day of the week for the sessions
 *    - Allowed values: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
 *
 * @param {string} req.body.time - Time for the sessions in 24-hour format
 *    - Format: "HH:MM" (e.g., "16:00" for 4:00 PM)
 *    - Must match pattern: /^([01]\d|2[0-3]):([0-5]\d)$/
 *
 * @param {string} req.body.location - Type of session location
 *    - Allowed values: "in-person", "online"
 *
 * @param {string} [req.body.inPersonLocation] - Physical location address
 *    - Required only if location is "in-person"
 *    - Example: "123 Main Street, Karachi, Pakistan"
 *
 * @param {number} [req.body.sessionLengthMinutes=50] - Duration of each session in minutes
 *    - Range: 1-240 minutes
 *    - Default: 50 minutes
 *
 * @returns {Object} JSON response
 * @returns {string} response.message - Success or error message
 * @returns {number} response.createdCount - Number of bookings created
 * @returns {string} response.seriesId - MongoDB ObjectId for the recurring series
 *
 * @throws {400} - Invalid parameters
 * @throws {404} - User not found
 * @throws {409} - User is already recurring
 * @throws {500} - Server error
 */
const recurUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const {
    interval = "weekly",
    day,
    time,
    location,
    inPersonLocation,
    sessionLengthMinutes = 50,
  } = req.body;

  // Sanitize user input fields to prevent XSS
  const sanitizedInPersonLocation = inPersonLocation
    ? sanitizeHtml(inPersonLocation, {
        allowedTags: [],
        allowedAttributes: {},
      })
    : undefined;

  logger.debug(
    `recurUser called with userId: ${userId}, interval: ${interval}, day: ${day}, time: ${time}, sessionLength: ${sessionLengthMinutes}`
  );
  logger.debug(
    `Location type: ${location}, inPersonLocation: ${
      sanitizedInPersonLocation || "None"
    }`
  );

  // Validate time parameter (expecting 24-hour format like "16:00")
  if (
    !time ||
    typeof time !== "string" ||
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)
  ) {
    logger.debug(`Invalid time format provided: ${time}`);
    return res.status(400).json({
      error: "Valid time parameter is required in 24-hour format (HH:MM)",
    });
  }

  // Validate session length
  if (sessionLengthMinutes <= 0 || sessionLengthMinutes > 240) {
    logger.debug(`Invalid session length: ${sessionLengthMinutes}`);
    return res
      .status(400)
      .json({ error: "Session length must be between 1 and 240 minutes" });
  }

  const allowedIntervals = new Set(["weekly", "biweekly", "monthly"]);
  if (!allowedIntervals.has(interval)) {
    logger.debug(`Invalid interval: ${interval}`);
    return res.status(400).json({ error: "Invalid interval value" });
  }

  const dayNumber = Number(day);
  if (isNaN(dayNumber) || dayNumber < 0 || dayNumber > 6) {
    logger.debug(`Invalid day: ${day}`);
    return res.status(400).json({
      error:
        "Invalid day value. Must be a number between 0-6 (0 = Sunday, 6 = Saturday)",
    });
  }

  // Validate location type
  if (!location || !["in-person", "online"].includes(location)) {
    logger.debug(`Invalid location type: ${location}`);
    return res.status(400).json({
      error: "Location must be either 'in-person' or 'online'",
    });
  }

  // Validate inPersonLocation is provided when location is in-person
  if (location === "in-person" && !sanitizedInPersonLocation) {
    logger.debug(`Missing inPersonLocation for in-person session`);
    return res
      .status(400)
      .json({ error: "inPersonLocation is required for in-person sessions" });
  }

  logger.debug(`All validation checks passed`);

  // Create location object from parameters
  const locationObject = {
    type: location,
    inPersonLocation:
      location === "in-person" ? sanitizedInPersonLocation : undefined,
  };

  let createdBookingIds = [];
  let seriesId = null;
  let bookingCount = 0;

  try {
    // Check if user already has recurring bookings
    const existingRecurring = await User.findOne({
      _id: userId,
      "recurring.state": true,
    });

    if (existingRecurring) {
      logger.debug(`User ${userId} is already marked as recurring`);
      return res
        .status(409)
        .json({ message: "This user is already recurring" });
    }

    // Check if any other user is already recurring on the same day and time
    const conflictingUser = await User.findOne({
      _id: { $ne: userId }, // exclude current user
      "recurring.state": true,
      "recurring.day": day,
      "recurring.time": time,
    });

    if (conflictingUser) {
      logger.debug(
        `Conflict detected: User ${conflictingUser._id} is already recurring on ${day} at ${time}`
      );
      return res.status(409).json({
        message: "Another user is already recurring on the same day and time",
        conflictUserId: conflictingUser._id,
      });
    }

    // Check if the user themselves has existing one-off bookings that conflict with the first recurring slot
    const firstSlot = firstOccurrence(day, time);
    const firstSlotEnd = addMinutes(firstSlot, sessionLengthMinutes);

    const userBookingConflict = await Booking.findOne({
      userId,
      status: "Active",
      source: { $in: ["admin", "calendly"] }, // Only check one-off bookings
      eventStartTime: { $lt: firstSlotEnd },
      eventEndTime: { $gt: firstSlot },
    }).lean();

    if (userBookingConflict) {
      logger.debug(
        `User ${userId} has existing one-off booking (${userBookingConflict.bookingId}) that conflicts with first recurring slot`
      );
      return res.status(409).json({
        message:
          "User has existing booking that conflicts with recurring schedule",
        conflictingBookingId: userBookingConflict.bookingId,
        conflictingBookingStart: userBookingConflict.eventStartTime,
        requiresManualResolution: true, // Flag for frontend to show special warning
      });
    }

    logger.debug(`Creating recurring series for user ${userId}`);

    // 1. mark the user as recurring
    seriesId = new mongoose.Types.ObjectId();
    logger.debug(`Generated new recurring seriesId: ${seriesId}`);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "recurring.state": true,
          "recurring.interval": interval,
          "recurring.day": day,
          "recurring.time": time, // Store as string directly
          "recurring.location": locationObject,
          "recurring.recurringSeriesId": seriesId,
        },
      },
      { new: true }
    );

    if (!user) {
      logger.debug(`User ${userId} not found when trying to mark as recurring`);
      throw new Error("User not found");
    }

    logger.debug(`User ${userId} successfully marked as recurring`);

    // 2. generate buffer bookings (today ➜ today + 2 months)
    const bufferEnd = addMonths(new Date(), 2);
    logger.debug(
      `Generating bookings from now until ${bufferEnd.toISOString()}`
    );

    let cursor = firstOccurrence(day, time);
    logger.debug(`First occurrence calculated: ${cursor.toISOString()}`);

    const newBookings = [];

    while (isBefore(cursor, bufferEnd)) {
      // Calculate start and end times
      const start = cursor;
      const end = addMinutes(start, sessionLengthMinutes);

      logger.debug(
        `Checking potential booking: ${start.toISOString()} to ${end.toISOString()}`
      );

      // Check for conflicts in existing bookings
      const localConflict = await Booking.exists({
        status: { $ne: "Cancelled" },
        eventStartTime: { $lt: end },
        eventEndTime: { $gt: start },
      });

      if (localConflict) {
        logger.debug(`Conflict detected for time slot: ${start.toISOString()}`);
      }

      if (!localConflict) {
        // Set initial sync status based on location type
        const initialSyncStatus = {
          google: "pending",
          zoom: location === "online" ? "pending" : "not_applicable",
          lastSyncAttempt: null,
        };

        // Create booking object with updated recurring structure
        const bookingData = {
          userId,
          recurring: {
            state: true,
            seriesId: seriesId,
            interval: interval,
            day: day,
            time: time,
          },
          eventStartTime: start,
          eventEndTime: end,
          eventName: "Recurring Session",
          status: "Active",
          source: "system",
          location: locationObject,
          syncStatus: initialSyncStatus,
        };

        newBookings.push(bookingData);
        logger.debug(`Added booking for ${start.toISOString()} to buffer`);
      }

      // Advance to next occurrence based on interval
      cursor = advance(cursor, interval);
      logger.debug(`Advanced to next occurrence: ${cursor.toISOString()}`);
    }

    logger.debug(`Total bookings in buffer: ${newBookings.length}`);

    // Get session price and currency based on user account type
    let sessionPrice;
    let currency;
    if (user?.accountType == "international") {
      sessionPrice = await Config.getValue("intlSessionPrice");
      currency = "USD";
    } else {
      sessionPrice = await Config.getValue("sessionPrice");
      currency = "PKR";
    }

    if (sessionPrice === undefined) {
      throw new Error("Session price not configured");
    }

    // Create bookings and payments individually to ensure auto-increment works
    let insertedBookings = [];
    let insertedPayments = [];
    if (newBookings.length) {
      logger.debug(
        `Creating ${newBookings.length} bookings individually to ensure bookingId auto-increment works`
      );

      for (const bookingData of newBookings) {
        // Create booking using Booking.create() to trigger auto-increment plugin
        const booking = await Booking.create(bookingData);

        // Create corresponding payment
        const paymentData = {
          bookingId: booking._id,
          userId: booking.userId,
          amount: sessionPrice,
          currency: currency,
          transactionReferenceNumber: `T-${uid.rnd()}`,
          transactionStatus: "Not Initiated",
        };

        const payment = await Payment.create(paymentData);

        // Link booking and payment
        booking.paymentId = payment._id;
        await booking.save();

        insertedBookings.push(booking);
        insertedPayments.push(payment);
      }

      logger.debug(
        `Successfully created ${insertedBookings.length} bookings with payments`
      );
      logger.debug(
        `Booking IDs: ${insertedBookings.map((b) => b.bookingId).join(", ")}`
      );
    } else {
      logger.debug(`No bookings were created due to conflicts`);
    }

    // Store booking IDs for sync job queuing
    createdBookingIds = insertedBookings.map((booking) => booking._id);
    bookingCount = newBookings.length;

    logger.debug(
      `Transaction committed. Beginning sync job queuing for ${createdBookingIds.length} bookings`
    );

    // Check Google Calendar connection and queue sync jobs
    const connectionStatus = await getConnectionStatus();

    if (connectionStatus.connected) {
      logger.debug(
        `Google Calendar is connected, queuing sync jobs for all bookings`
      );

      for (const bookingId of createdBookingIds) {
        logger.debug(`Processing sync for booking: ${bookingId}`);

        // Queue Google Calendar sync (which now includes Google Meet for online meetings)
        try {
          await addJob("GoogleCalendarEventSync", {
            bookingId: bookingId.toString(),
          });
          logger.info(`Queued Google Calendar sync for booking ${bookingId}`);
        } catch (error) {
          logger.error(
            `Failed to queue Google Calendar sync for booking ${bookingId}: ${error.message}`
          );
          // Continue with other bookings even if one fails to queue
        }
      }
    } else {
      logger.info(
        `Google Calendar not connected, skipping sync job queuing for ${createdBookingIds.length} bookings.`
      );
    }

    // Calculate when the next buffer refresh should happen
    // Schedule it for when buffer has ~6 weeks left
    const lastBooking = insertedBookings[insertedBookings.length - 1];
    if (lastBooking) {
      const lastBookingDate = new Date(lastBooking.eventStartTime);
      const REFRESH_THRESHOLD_WEEKS = 6;
      const nextRefreshDate = new Date(lastBookingDate);
      nextRefreshDate.setDate(
        nextRefreshDate.getDate() - REFRESH_THRESHOLD_WEEKS * 7
      );

      // Update user with next refresh date
      await User.findByIdAndUpdate(userId, {
        $set: {
          "recurring.nextBufferRefresh": nextRefreshDate,
        },
      });

      // Schedule the buffer refresh job
      try {
        await addJob(
          "refreshRecurringBuffer",
          { userId: userId.toString() },
          { runAt: nextRefreshDate }
        );

        logger.info(
          `Scheduled buffer refresh for user ${userId} at ${nextRefreshDate.toISOString()}`
        );
      } catch (error) {
        logger.error(
          `Failed to schedule buffer refresh job for user ${userId}: ${error.message}`
        );
        // Non-critical - buffer can be refreshed manually if needed
      }
    }

    // Invalidate cache after successful recurring setup
    try {
      await invalidateByEvent("user-recurring-updated", { userId });
      await invalidateByEvent("admin-data-changed");
    } catch (cacheErr) {
      logger.error(`Cache invalidation failed: ${cacheErr.message}`);
      // Don't fail the request - cache will eventually expire
    }

    logger.debug(
      `recurUser operation completed successfully for user ${userId}`
    );

    res.json({
      message: "User marked as recurring and buffer generated",
      createdCount: bookingCount,
      seriesId,
    });
  } catch (err) {
    logger.error(`Error in recurring booking creation: ${err.message}`);
    logger.debug(`Stack trace: ${err.stack}`);

    // Cleanup: If user was marked as recurring but booking creation failed, revert user status
    if (seriesId) {
      try {
        logger.debug(
          `Attempting to revert user ${userId} recurring status due to error`
        );
        await User.findByIdAndUpdate(userId, {
          $set: {
            "recurring.state": false,
            "recurring.interval": undefined,
            "recurring.day": undefined,
            "recurring.time": undefined,
            "recurring.location": undefined,
            "recurring.recurringSeriesId": undefined,
            "recurring.nextBufferRefresh": undefined,
          },
        });
        logger.debug(`Successfully reverted user ${userId} recurring status`);
      } catch (revertError) {
        logger.error(
          `Failed to revert user ${userId} recurring status: ${revertError.message}`
        );
      }

      // Also cleanup any bookings and payments that might have been created
      if (createdBookingIds.length > 0) {
        try {
          logger.debug(
            `Attempting to cleanup ${createdBookingIds.length} created bookings and payments`
          );

          // Delete associated payments first
          const paymentDeleteResult = await Payment.deleteMany({
            bookingId: { $in: createdBookingIds },
          });
          logger.debug(
            `Cleaned up ${paymentDeleteResult.deletedCount} payments`
          );

          // Then delete bookings
          const bookingDeleteResult = await Booking.deleteMany({
            _id: { $in: createdBookingIds },
          });
          logger.debug(
            `Cleaned up ${bookingDeleteResult.deletedCount} bookings`
          );
        } catch (cleanupError) {
          logger.error(
            `Failed to cleanup created bookings and payments: ${cleanupError.message}`
          );
        }
      }
    }

    res.status(500).json({
      error: "Failed to set up recurring sessions",
      message: err.message,
    });
  }
});

// Day numbers: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday

function parseTimeToHoursMinutes(timeInput) {
  // Only accept "HH:MM" format in 24-hour time
  if (
    typeof timeInput !== "string" ||
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeInput)
  ) {
    throw new Error("Invalid time format; expected 24-hour format 'HH:MM'");
  }

  const [h, m] = timeInput.split(":").map(Number);
  return { h, m };
}

function firstOccurrence(dayNumber, timeInput) {
  const TZ = "Asia/Karachi";
  const now = new Date();
  const nowPk = utcToZonedTime(now, TZ);
  const targetDow = Number(dayNumber);
  const { h, m } = parseTimeToHoursMinutes(timeInput);

  let candidatePk = new Date(nowPk);
  candidatePk.setSeconds(0, 0);
  const delta = (targetDow - candidatePk.getDay() + 7) % 7;
  candidatePk = addDays(candidatePk, delta);
  candidatePk.setHours(h, m, 0, 0);

  // If today is the target and the time already passed, go to next week
  if (delta === 0 && candidatePk <= nowPk) {
    candidatePk = addDays(candidatePk, 7);
  }
  return zonedTimeToUtc(candidatePk, TZ); // store/compare in UTC
}
function advance(date, interval) {
  const TZ = "Asia/Karachi";
  const local = utcToZonedTime(date, TZ);
  if (interval === "weekly") return zonedTimeToUtc(addWeeks(local, 1), TZ);
  if (interval === "biweekly") return zonedTimeToUtc(addWeeks(local, 2), TZ);
  return zonedTimeToUtc(addMonths(local, 1), TZ);
}

/**
 * @desc Stops recurring bookings for a user and deletes all future recurring bookings and their associated payments
 * @route DELETE /users/:userId/recurring
 * @access Private (Admin only)
 *
 * @param {Object} req.params
 * @param {string} req.params.userId - MongoDB ObjectId of the user
 *
 * @returns {Object} JSON response
 * @returns {string} response.message - Success or error message
 * @returns {Object} response.results - Results of the operation
 * @returns {number} response.results.total - Total number of bookings processed
 * @returns {number} response.results.queued - Number of bookings successfully queued for deletion
 * @returns {number} response.results.failed - Number of bookings that failed to queue
 * @returns {number} response.results.paymentsDeleted - Number of associated payments deleted
 * @returns {string} response.seriesId - MongoDB ObjectId for the recurring series
 *
 * @throws {404} - User not found or not in recurring mode
 * @throws {500} - Server error
 */
const stopRecurring = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  logger.debug(`stopRecurring called for userId: ${userId}`);

  try {
    // 1. Check if user exists and is in recurring mode
    const user = await User.findOne({
      _id: userId,
      "recurring.state": true,
    });

    if (!user) {
      logger.debug(`User ${userId} not found or not in recurring mode`);
      return res.status(404).json({
        message: "User not found or is not in recurring mode",
      });
    }

    const seriesId = user.recurring.recurringSeriesId;
    logger.debug(`Found recurring series ${seriesId} for user ${userId}`);

    // 2. Find all active future bookings in this series
    const now = new Date();
    const bookings = await Booking.find({
      "recurring.seriesId": seriesId,
      status: "Active",
      eventStartTime: { $gt: now },
    }).populate("userId", "name email");

    logger.info(`Found ${bookings.length} future recurring bookings to delete`);

    // 3. Process each booking by adding them to the queue
    const results = {
      total: bookings.length,
      queued: 0,
      failed: 0,
    };

    for (const booking of bookings) {
      logger.debug(
        `Queueing deletion for booking ${booking._id} (starts ${booking.eventStartTime})`
      );

      try {
        await addJob("GoogleCalendarEventDeletion", {
          bookingId: booking._id.toString(),
          googleEventId: booking.googleEventId,
        });
        results.queued++;
        logger.info(`Successfully queued deletion for booking ${booking._id}`);
      } catch (error) {
        results.failed++;
        logger.error(
          `Failed to queue deletion for booking ${booking._id}: ${error.message}`
        );
      }
    }

    // 4. Delete associated payments for all future bookings
    const bookingIds = bookings.map((booking) => booking._id);
    if (bookingIds.length > 0) {
      try {
        const paymentDeleteResult = await Payment.deleteMany({
          bookingId: { $in: bookingIds },
        });
        logger.info(
          `Deleted ${paymentDeleteResult.deletedCount} associated payments`
        );
        results.paymentsDeleted = paymentDeleteResult.deletedCount;
      } catch (error) {
        logger.error(`Failed to delete associated payments: ${error.message}`);
        results.paymentDeletionError = error.message;
      }
    }

    // 5. Update user's recurring status
    await User.findByIdAndUpdate(userId, {
      $set: {
        "recurring.state": false,
        "recurring.interval": undefined,
        "recurring.day": undefined,
        "recurring.time": undefined,
        "recurring.location": undefined,
        "recurring.recurringSeriesId": undefined,
        "recurring.nextBufferRefresh": undefined,
      },
    });
    logger.info(`Updated user ${userId} recurring status to false`);

    // 6. Invalidate cache after successful recurring stop
    try {
      await invalidateByEvent("user-recurring-updated", { userId });
      await invalidateByEvent("admin-data-changed");
    } catch (cacheErr) {
      logger.error(`Cache invalidation failed: ${cacheErr.message}`);
      // Don't fail the request - cache will eventually expire
    }

    // 7. Return results
    res.json({
      message: "Recurring bookings scheduled for deletion",
      results,
      seriesId: seriesId.toString(),
    });
  } catch (error) {
    logger.error(`Error in stopRecurring: ${error.message}`);
    logger.debug(`Stack trace: ${error.stack}`);
    res.status(500).json({
      error: "Failed to stop recurring sessions",
      message: error.message,
    });
  }
});

/**
 * @desc Search users by name or email for booking creation
 * @route GET /admin/users/search
 * @access Private (Admin only)
 *
 * @param {Object} req.query
 * @param {string} req.query.q - Search query (name or email)
 * @param {number} [req.query.limit=10] - Maximum number of results
 *
 * @returns {Object} JSON response with minimal user data
 * @returns {Array} response.users - Array of users with _id, email, name, phone
 *
 * @throws {400} - Missing search query
 * @throws {500} - Server error
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q: searchQuery, limit = 10 } = req.query;

  if (!searchQuery || searchQuery.trim().length < 1) {
    return res.status(400).json({
      message: "Search query is required and must be at least 1 character long",
    });
  }

  const searchLimit = Math.min(parseInt(limit, 10) || 10, 20); // Max 20 results

  try {
    logger.debug(`Searching users with query: ${searchQuery}`);
    const users = await User.find({
      role: "user",
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .select("_id email name phone")
      .limit(searchLimit)
      .sort({ name: 1 })
      .lean()
      .exec();

    logger.debug(`Found ${users.length} users matching search query`);

    res.status(200).json({
      users,
      total: users.length,
    });
  } catch (error) {
    logger.error(`Error searching users: ${error.message}`);
    res.status(500).json({
      message: "Failed to search users",
      error: error.message,
    });
  }
});

module.exports = {
  getAllUsers,
  deleteUser,
  updateUser,
  getUserDetails,
  recurUser,
  stopRecurring,
  searchUsers,
};
