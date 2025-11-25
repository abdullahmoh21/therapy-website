const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const User = require("../../models/User");
const Config = require("../../models/Config");
const ShortUniqueId = require("short-unique-id");
const asyncHandler = require("express-async-handler");
const { zonedTimeToUtc } = require("date-fns-tz");
const { addMinutes } = require("date-fns");
const sanitizeHtml = require("sanitize-html");
const logger = require("../../logs/logger");
const { addJob, sendEmail } = require("../../utils/queue/index");
const { invalidateByEvent } = require("../../middleware/redisCaching");

/**
 * @desc Creates a one-off admin booking with Google Calendar integration
 * @route POST /admin/bookings
 * @access Private (admin only)
 *
 * @param {Object} req.body
 * @param {string} req.body.userId - MongoDB ObjectId of the user
 * @param {string} req.body.eventDate - Date in YYYY-MM-DD format (e.g., "2025-08-23")
 * @param {string} req.body.eventTime - Time in 24-hour format HH:MM (e.g., "16:00")
 * @param {number} req.body.sessionLengthMinutes - Duration in minutes (e.g., 50)
 * @param {string} req.body.location - "online" or "in-person"
 * @param {string} [req.body.inPersonLocation] - Required if location is "in-person"
 *
 * @returns {Object} JSON response with booking and payment details
 * @throws {400} - Missing/invalid parameters
 * @throws {404} - User not found
 * @throws {409} - Booking conflict
 * @throws {500} - Server error
 */
const createBooking = asyncHandler(async (req, res) => {
  const {
    userId,
    eventDate, // Date string in YYYY-MM-DD format
    eventTime, // Time string in 24-hour format HH:MM
    sessionLengthMinutes = 50, // Duration in minutes
    location,
    inPersonLocation,
  } = req.body;

  // Sanitize user input fields to prevent XSS
  const sanitizedInPersonLocation = inPersonLocation
    ? sanitizeHtml(inPersonLocation, {
        allowedTags: [],
        allowedAttributes: {},
      })
    : undefined;

  logger.debug(
    `createBooking called with userId: ${userId}, eventDate: ${eventDate}, eventTime: ${eventTime}, sessionLength: ${sessionLengthMinutes}`
  );
  logger.debug(
    `Location type: ${location}, inPersonLocation: ${
      sanitizedInPersonLocation || "None"
    }`
  );

  // Validate required inputs
  if (!userId || !eventDate || !eventTime || !location) {
    logger.debug("Create booking validation failed: missing required fields");
    return res.status(400).json({
      message:
        "Missing required fields: userId, eventDate, eventTime, location",
    });
  }

  // Validate date format (YYYY-MM-DD)
  if (
    !eventDate ||
    typeof eventDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
  ) {
    logger.debug(`Invalid date format provided: ${eventDate}`);
    return res.status(400).json({
      error: "Valid eventDate parameter is required in format YYYY-MM-DD",
    });
  }

  // Validate time format (HH:MM in 24-hour format)
  if (
    !eventTime ||
    typeof eventTime !== "string" ||
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(eventTime)
  ) {
    logger.debug(`Invalid time format provided: ${eventTime}`);
    return res.status(400).json({
      error: "Valid eventTime parameter is required in 24-hour format (HH:MM)",
    });
  }

  // Validate session length
  if (sessionLengthMinutes <= 0 || sessionLengthMinutes > 240) {
    logger.debug(`Invalid session length: ${sessionLengthMinutes}`);
    return res
      .status(400)
      .json({ error: "Session length must be between 1 and 240 minutes" });
  }

  // Validate location data
  if (!["online", "in-person"].includes(location)) {
    logger.debug(`Invalid location type: ${location}`);
    return res
      .status(400)
      .json({ message: "Location must be either 'online' or 'in-person'" });
  }

  if (location === "in-person" && !sanitizedInPersonLocation) {
    logger.debug("In-person location missing");
    return res
      .status(400)
      .json({ message: "inPersonLocation required for in-person events" });
  }

  logger.debug(`All validation checks passed`);

  // Convert date and time to UTC using Pakistani timezone
  const TZ = "Asia/Karachi";
  let startDate, endDate;

  try {
    // Combine date and time into a wall-clock datetime string
    const wallClockStart = `${eventDate}T${eventTime}:00`;

    // Convert to UTC using Pakistani timezone
    startDate = zonedTimeToUtc(wallClockStart, TZ);

    // Calculate end time by adding session duration
    endDate = addMinutes(startDate, sessionLengthMinutes);

    logger.debug(
      `Converting ${wallClockStart} (${TZ}) to UTC: ${startDate.toISOString()} - ${endDate.toISOString()}`
    );
  } catch (err) {
    logger.debug(`Failed to convert local time to UTC: ${err.message}`);
    return res.status(400).json({
      message: "Failed to interpret eventDate/eventTime",
    });
  }

  // Validate dates after conversion
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    logger.debug("Invalid date after conversion to UTC");
    return res
      .status(400)
      .json({ message: "Invalid date for eventDate or eventTime" });
  }

  if (startDate >= endDate) {
    logger.debug("Event start must be before end");
    return res
      .status(400)
      .json({ message: "Event start time must be before end time" });
  }

  // Validate maximum duration (240 minutes = 4 hours)
  const durationMinutes = (endDate - startDate) / 1000 / 60;
  if (durationMinutes > 240) {
    logger.debug(
      `Booking duration exceeds maximum: ${durationMinutes} minutes`
    );
    return res.status(400).json({
      message: "Booking duration cannot exceed 240 minutes (4 hours)",
    });
  }

  // Validate that the booking is in the future
  const now = new Date();
  if (startDate <= now) {
    logger.debug("Booking time must be in the future");
    return res
      .status(400)
      .json({ message: "Booking time must be in the future" });
  }

  logger.debug(
    `Creating booking for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()} (${TZ})`
  );

  // Check for user and booking conflicts (UTC window)
  const [user, existingBooking] = await Promise.all([
    User.findById(userId).lean().exec(),
    Booking.findOne({
      eventStartTime: { $lt: endDate },
      eventEndTime: { $gt: startDate },
      status: { $ne: "Cancelled" },
    })
      .select("_id userId eventStartTime eventEndTime status")
      .lean()
      .exec(),
  ]);

  // Handle validation results
  if (!user) {
    logger.debug(`User ${userId} not found`);
    return res.status(404).json({ message: "User not found" });
  }

  if (existingBooking) {
    logger.debug(`Booking conflict detected for time slot`);
    return res.status(409).json({
      message:
        "There is a conflicting booking. Please cancel that booking first.",
      existingBooking,
    });
  }

  // Determine session price based on user account type
  let sessionPrice;
  let currency;
  try {
    if (user.accountType === "international") {
      sessionPrice = await Config.getValue("intlSessionPrice");
      currency = "USD";
    } else {
      sessionPrice = await Config.getValue("sessionPrice");
      currency = "PKR";
    }

    if (sessionPrice === undefined) {
      logger.error("Session price not configured");
      return res.status(500).json({ message: "Session price not configured" });
    }
  } catch (err) {
    logger.error(`Error fetching session price: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Failed to determine session price" });
  }

  // Create location object based on type
  const locationObj = {
    type: location,
  };

  if (location === "in-person") {
    locationObj.inPersonLocation = sanitizedInPersonLocation;
  }

  // Generate transaction reference number
  const uid = new ShortUniqueId({ length: 5 });
  const transactionReferenceNumber = `T-${uid.rnd()}`;

  // Create booking and payment objects
  const bookingData = {
    userId: user._id,
    eventStartTime: startDate, // stored in UTC
    eventEndTime: endDate, // stored in UTC
    eventTimezone: TZ, // persist wall-clock intent (Pakistani timezone)
    source: "admin", // Mark as admin-created
    status: "Active",
    location: locationObj,
    syncStatus: {
      google: "pending", // Will be updated by the sync job
      lastSyncAttempt: null,
    },
  };

  const paymentData = {
    userId: user._id,
    amount: sessionPrice,
    currency,
    transactionStatus: "Not Initiated",
    transactionReferenceNumber,
  };

  let booking, payment;

  try {
    // Create booking first
    booking = await Booking.create(bookingData);
    logger.debug(`Created booking ${booking._id}`);

    try {
      // Create payment
      payment = await Payment.create(paymentData);
      logger.debug(`Created payment ${payment._id}`);

      // Link the documents
      booking.paymentId = payment._id;
      payment.bookingId = booking._id;

      await Promise.all([booking.save(), payment.save()]);
      logger.debug(`Linked booking and payment`);

      // Queue sync job for Google Calendar with rollback on failure
      try {
        await addJob("GoogleCalendarEventSync", {
          bookingId: booking._id.toString(),
        });
        logger.info(`Queued Google Calendar sync for booking ${booking._id}`);
      } catch (syncErr) {
        logger.error(
          `Google Calendar sync job queueing failed for booking ${booking._id}: ${syncErr.message}`
        );
        // Rollback: Delete payment and booking
        await Promise.all([
          Payment.deleteOne({ _id: payment._id }),
          Booking.deleteOne({ _id: booking._id }),
        ]);
        logger.warn(
          `Rolled back booking ${booking._id} and payment ${payment._id} due to sync failure`
        );
        return res.status(500).json({
          message: "Failed to schedule Google Calendar sync",
          error: "GOOGLE_CALENDAR_SYNC_FAILED",
          googleCalendarSyncFailed: true,
        });
      }

      // Invalidate cache
      try {
        await invalidateByEvent("booking-created", {
          userId: user._id,
        });
      } catch (cacheErr) {
        logger.error(`Cache invalidation failed: ${cacheErr.message}`);
        // Don't fail the request - cache will eventually expire
      }

      logger.info(
        `Admin created new booking: ${booking._id} for user ${userId}`
      );
      return res.status(201).json({
        message: "Booking created successfully",
        booking,
        payment,
      });
    } catch (paymentErr) {
      // Cleanup booking if payment creation/linking fails
      logger.error(
        `Payment creation failed, cleaning up booking ${booking._id}: ${paymentErr.message}`
      );
      await Booking.deleteOne({ _id: booking._id });
      throw paymentErr;
    }
  } catch (err) {
    logger.error(`Error creating booking: ${err.message}`);

    // Handle duplicate key error (race condition caught by unique index)
    if (err.code === 11000) {
      return res.status(409).json({
        message:
          "Time slot conflict: Another booking was created for this time slot",
        error: "BOOKING_CONFLICT",
      });
    }

    return res.status(500).json({
      message: "Failed to create booking",
      error: err.message,
    });
  }
});

/**
 * @desc Cancels an existing booking and its Google Calendar event
 * @route PUT /admin/bookings/cancel
 * @access Private (admin only)
 *
 * @param {Object} req.body
 * @param {string} req.body.bookingId - MongoDB ID of the booking to cancel
 * @param {string} [req.body.reason="Cancelled by admin"] - Reason for cancellation
 * @param {boolean} [req.body.notifyUser=false] - Whether to send cancellation email to user
 *
 * @returns {Object} JSON response with updated booking
 * @throws {400} - Missing booking ID
 * @throws {404} - Booking not found
 * @throws {409} - Booking already cancelled
 * @throws {500} - Server error
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { reason, notifyUser } = req.body;

  // Sanitize user input
  const sanitizedReason = reason
    ? sanitizeHtml(reason, {
        allowedTags: [],
        allowedAttributes: {},
      })
    : undefined;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }
  if (!sanitizedReason) {
    return res.status(400).json({ message: "reason is required" });
  }
  if (notifyUser === undefined || notifyUser === null) {
    return res.status(400).json({ message: "notifyUser is required" });
  }

  logger.debug(`Attempting to cancel booking: ${bookingId}`);

  try {
    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      logger.debug(`Booking ${bookingId} not found`);
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "Cancelled") {
      logger.debug(`Booking ${bookingId} is already cancelled`);
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    // Check if this is a valid booking source for admin cancellation
    if (!["admin", "system"].includes(booking.source)) {
      logger.debug(
        `Booking ${bookingId} has invalid source for admin cancellation: ${booking.source}`
      );
      return res.status(400).json({
        message: `Cannot cancel ${booking.source} booking via admin panel`,
      });
    }

    // Update booking status and add cancellation details
    booking.status = "Cancelled";
    booking.cancellation = {
      reason: sanitizedReason,
      date: new Date(),
      cancelledBy: "Admin",
    };
    if (booking.googleEventId) {
      booking.syncStatus.google = "pending";
      booking.markModified("syncStatus");
    }

    await booking.save();

    logger.info(`Booking ${bookingId} cancelled by admin`);

    // Update associated payment status if not already completed
    if (booking.paymentId) {
      try {
        const payment = await Payment.findById(booking.paymentId);
        if (payment && payment.transactionStatus !== "Completed") {
          payment.transactionStatus = "Cancelled";
          await payment.save();
          logger.debug(`Payment ${payment._id} marked as Cancelled`);
        }
      } catch (paymentErr) {
        logger.error(`Failed to update payment status: ${paymentErr.message}`);
        // Don't fail the cancellation if payment update fails
      }
    }

    // Queue Google Calendar deletion job with notification flag
    // This job will handle both Google Calendar deletion and user notification
    if (booking.googleEventId) {
      try {
        await addJob("GoogleCalendarEventCancellation", {
          bookingId: booking._id.toString(),
          notifyUser: notifyUser,
          reason: sanitizedReason,
        });
        logger.info(
          `Queued Google Calendar deletion for booking ${booking._id} with notifyUser: ${notifyUser}`
        );
      } catch (error) {
        logger.error(
          `Failed to queue Google Calendar deletion: ${error.message}`
        );
        return res.status(500).json({
          message: "Failed to queue Google Calendar deletion",
          error: error.message,
        });
      }
    } else {
      // No Google Calendar event, but still send notification if requested
      if (notifyUser) {
        try {
          await sendEmail("BookingCancellationNotifications", {
            bookingId: booking._id.toString(),
            userId: booking.userId.toString(),
            cancelledBy: "admin",
            reason: reason,
            eventStartTime: booking.eventStartTime,
            cancellationDate: new Date(),
            paymentId: booking.paymentId ? booking.paymentId.toString() : null,
            bookingIdNumber: booking.bookingId,
            notifyAdmin: false, // Admin already knows since they initiated it
          });
          logger.info(
            `Sent cancellation notification to user for booking ${booking._id}`
          );
        } catch (emailError) {
          logger.error(
            `Failed to send cancellation email: ${emailError.message}`
          );
        }
      } else {
        logger.debug(
          `Admin chose not to notify user for booking ${bookingId} cancellation`
        );
      }
    }

    // Invalidate cache
    try {
      await invalidateByEvent("booking-updated", {
        userId: booking.userId,
      });
    } catch (cacheErr) {
      logger.error(`Cache invalidation failed: ${cacheErr.message}`);
      // Don't fail the request - cache will eventually expire
    }

    return res.status(200).json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (err) {
    logger.error(`Error cancelling booking: ${err.message}`);
    return res.status(500).json({
      message: "Failed to cancel booking",
      error: err.message,
    });
  }
});

//@desc returns all bookings with only the fields to be displayed in frontend table
//@param valid admin jwt token
//@route GET /admin/bookings
//@access Private(admin)
const getAllBookings = asyncHandler(async (req, res) => {
  /* ---------- basic pagination & validation ---------- */
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 40);

  if (req.query.page === "0" || req.query.limit === "0") {
    return res.status(400).json({
      message:
        "Page and limit must be positive integers and limit should not exceed 40",
    });
  }

  const skip = (page - 1) * limit;

  /* ---------- build filter object ---------- */
  const {
    search,
    status,
    datePreset,
    view, // NEW: 'future' | 'past'
    paymentOverdue,
    location,
    source,
  } = req.query;

  const query = {};
  if (status) query.status = status;
  if (location) query["location.type"] = location; // nested field filter
  if (source) query.source = source; // source filter for calendly/admin/system

  /* ----- view toggle (past or future only) ----- */
  const now = new Date();
  const viewingPast = view === "past"; // default is future if param missing/invalid

  if (viewingPast) {
    query.eventStartTime = { $lt: now };
  } else {
    query.eventStartTime = { $gte: now };
  }

  /* ----- optional date-preset (applied inside chosen view) ----- */
  if (datePreset) {
    const baseNow = new Date();
    const startToday = new Date(
      baseNow.getFullYear(),
      baseNow.getMonth(),
      baseNow.getDate()
    );
    const presets = {
      today() {
        const start = new Date(startToday);
        const end = new Date(startToday);
        end.setHours(23, 59, 59, 999);
        return [start, end];
      },
      tomorrow() {
        const start = new Date(startToday);
        start.setDate(start.getDate() + 1);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return [start, end];
      },
      thisWeek() {
        const start = new Date(startToday);
        const end = new Date(startToday);
        const daysUntilSunday = 7 - start.getDay();
        end.setDate(end.getDate() + daysUntilSunday);
        end.setHours(23, 59, 59, 999);
        return [start, end];
      },
      thisMonth() {
        const start = new Date(startToday);
        const end = new Date(
          baseNow.getFullYear(),
          baseNow.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        return [start, end];
      },
      nextMonth() {
        const start = new Date(
          baseNow.getFullYear(),
          baseNow.getMonth() + 1,
          1,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          baseNow.getFullYear(),
          baseNow.getMonth() + 2,
          0,
          23,
          59,
          59,
          999
        );
        return [start, end];
      },
      lastMonth() {
        const start = new Date(
          baseNow.getFullYear(),
          baseNow.getMonth() - 1,
          1,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          baseNow.getFullYear(),
          baseNow.getMonth(),
          0,
          23,
          59,
          59,
          999
        );
        return [start, end];
      },
    };

    const range = presets[datePreset]?.();
    if (range) {
      const [rangeStart, rangeEnd] = range;
      // Intersect with view bounds
      if (viewingPast) {
        query.eventStartTime.$gte = rangeStart;
        query.eventStartTime.$lte = rangeEnd < now ? rangeEnd : now;
      } else {
        query.eventStartTime.$gte = rangeStart > now ? rangeStart : now;
        query.eventStartTime.$lte = rangeEnd;
      }
    }
  }

  /* ----- sort according to view ----- */
  const sortSpec = viewingPast
    ? { eventStartTime: -1, _id: 1 } // past: most recent first
    : { eventStartTime: 1, _id: 1 }; // future: soonest first

  /* ---------- parallel pre-queries (user & payment lookups) ---------- */
  const userSearchPromise = search
    ? User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      })
        .select("_id")
        .lean()
    : Promise.resolve([]);

  const overduePaymentsPromise =
    paymentOverdue === "true"
      ? Payment.find({ transactionStatus: { $ne: "Completed" } })
          .select("_id")
          .lean()
      : Promise.resolve([]);

  const [users, overduePayments] = await Promise.all([
    userSearchPromise,
    overduePaymentsPromise,
  ]);

  /* ----- apply user search filter (early exit if none found) ----- */
  if (search) {
    const userIds = users.map((u) => u._id);
    if (!userIds.length) {
      return res.json({
        page,
        limit,
        totalBookings: 0,
        totalPages: 0,
        bookings: [],
      });
    }
    query.userId = { $in: userIds };
  }

  /* ----- apply overdue-payment filter ----- */
  if (paymentOverdue === "true") {
    query.status = "Completed";
    query.$or = [
      { paymentId: { $exists: false } },
      { paymentId: { $in: overduePayments.map((p) => p._id) } },
    ];
  }

  /* ---------- final data & count (parallel) ---------- */
  const bookingsPromise = Booking.find(query)
    .skip(skip)
    .limit(limit)
    .select(
      "_id bookingId status eventStartTime eventEndTime location source recurring"
    )
    .populate({
      path: "userId",
      select: "name email phone",
    })
    .populate({
      path: "paymentId",
      select: "transactionStatus amount currency",
    })
    .sort(sortSpec)
    .lean()
    .exec();

  const countPromise = Booking.countDocuments(query);

  const [bookings, totalBookings] = await Promise.all([
    bookingsPromise,
    countPromise,
  ]);

  /* ---------- response ---------- */
  res.json({
    page,
    limit,
    totalBookings,
    totalPages: Math.ceil(totalBookings / limit),
    bookings,
  });
});
//@desc returns upcoming booking timeline for display in /admin/upcoming
//@param valid admin jwt token
//@route GET /admin/bookings
//@access Private(admin)
const getBookingTimeline = asyncHandler(async (req, res) => {
  try {
    const now = new Date(Date.now());
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Get date one week from now at 23:59:59
    const oneWeekFromNow = new Date(startOfToday);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    oneWeekFromNow.setHours(23, 59, 59, 999);

    // Find bookings in the time range
    const bookings = await Booking.find({
      eventStartTime: { $gte: startOfToday, $lte: oneWeekFromNow },
      status: { $ne: "Cancelled" }, // Exclude cancelled bookings
    })
      .select(
        "_id eventStartTime eventEndTime eventName location status bookingId notes source"
      )
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "paymentId",
        select:
          "amount currency transactionStatus transactionReferenceNumber paymentMethod paymentCompletedDate",
      })
      .sort({ eventStartTime: 1 }) // Sort by start time ascending
      .lean()
      .exec();

    res.status(200).json({ bookings });
  } catch (error) {
    logger.error(`Error retrieving booking timeline: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve booking timeline" });
  }
});

//@desc edit any booking details
//@param valid admin jwt token
//@route PATCH /admin/bookings
//@access Private(admin)
const updateBooking = asyncHandler(async (req, res) => {
  const { bookingId, status } = req.body;

  // Validate input
  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    // Find the booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update the status if provided
    if (status) {
      // Validate status
      const validStatuses = ["Active", "Completed", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Invalid status. Must be one of: Active, Completed, Cancelled",
        });
      }
      booking.status = status;

      // If the booking is cancelled, store cancellation details
      if (status === "Cancelled" && !booking.cancellation) {
        const cancelReason = req.body.reason || "Cancelled by administrator";
        booking.cancellation = {
          cancelledBy: "admin",
          reason: sanitizeHtml(cancelReason, {
            allowedTags: [],
            allowedAttributes: {},
          }),
          date: new Date(),
        };
      }
    }

    // Save the updated booking
    await booking.save();

    // Invalidate cache after booking update
    try {
      await invalidateByEvent("booking-updated", {
        userId: booking.userId,
      });
    } catch (cacheErr) {
      logger.error(`Cache invalidation failed: ${cacheErr.message}`);
      // Don't fail the request - cache will eventually expire
    }

    res.status(200).json({
      message: "Booking updated successfully",
      booking,
    });
  } catch (error) {
    logger.error(`Error updating booking: ${error.message}`);
    res.status(500).json({ message: "Failed to update booking" });
  }
});

//@desc Delete a booking
//@param {Object} req with valid role and bookingId
//@route DELETE /admin/bookings:bookingId
//@access Private (admin)
const deleteBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    // Find booking to check if it exists
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if booking is synced with Google Calendar and not from Calendly
    const isGoogleSynced =
      booking.googleEventId && booking.source !== "calendly";

    if (isGoogleSynced) {
      // Queue the deletion job to handle Google Calendar deletion and database cleanup
      try {
        await addJob("GoogleCalendarEventDeletion", {
          bookingId: bookingId.toString(),
          googleEventId: booking.googleEventId,
        });

        logger.info(`Queued deleteCalendarEvent job for booking: ${bookingId}`);

        res.status(200).json({
          message:
            "Booking deletion scheduled (includes Google Calendar cleanup)",
          deletedBookingId: bookingId,
          queued: true,
        });
      } catch (queueError) {
        logger.error(
          `Failed to queue deletion job for booking ${bookingId}: ${queueError.message}`
        );
        res
          .status(500)
          .json({ message: "Failed to schedule booking deletion" });
      }
    } else {
      // Direct deletion for non-Google synced bookings
      // Delete any associated payment if it exists
      if (booking.paymentId) {
        await Payment.findByIdAndDelete(booking.paymentId);
      }

      // Delete the booking
      await Booking.findByIdAndDelete(bookingId);

      // Invalidate cache after booking deletion
      try {
        await invalidateByEvent("booking-deleted", {
          userId: booking.userId,
        });
      } catch (cacheErr) {
        logger.error(`Cache invalidation failed: ${cacheErr.message}`);
        // Don't fail the request - cache will eventually expire
      }

      logger.info(`Admin deleted booking: ${bookingId}`);

      res.status(200).json({
        message: "Booking successfully deleted",
        deletedBookingId: bookingId,
        queued: false,
      });
    }
  } catch (error) {
    logger.error(`Error deleting booking: ${error.message}`);
    res.status(500).json({ message: "Failed to delete booking" });
  }
});

//@desc Get a single booking with details
//@param {String} bookingId - MongoDB _id of the booking
//@route GET /admin/bookings/:bookingId
//@access Private(admin)
const getBookingDetails = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "userId",
        select: "name email phone accountType",
      })
      .populate({
        path: "paymentId",
        select:
          "amount currency transactionStatus transactionReferenceNumber paymentMethod paymentCompletedDate",
      })
      .select(
        "_id bookingId userId paymentId eventStartTime eventEndTime status source calendly googleHtmlLink invitationSent location cancellation createdAt updatedAt notes"
      )
      .lean()
      .exec();
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure paymentId is null when no payment exists, rather than undefined
    if (!booking.paymentId) {
      booking.paymentId = null;
    }

    // Handle missing bookingId for older documents (should be rare after migration)
    if (!booking.bookingId) {
      logger.warn(`Booking ${booking._id} is missing bookingId field.`);
      booking.bookingId = null;
    }

    res.json(booking);
  } catch (error) {
    logger.error(`Error retrieving booking details: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve booking details" });
  }
});

module.exports = {
  createBooking,
  cancelBooking,
  getAllBookings,
  getBookingTimeline,
  updateBooking,
  deleteBooking,
  getBookingDetails,
};
