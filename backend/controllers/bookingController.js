const crypto = require("crypto");
const logger = require("../logs/logger");
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const mongoose = require("mongoose");
const { invalidateByEvent } = require("../middleware/redisCaching");
const { sendEmail, addJob } = require("../utils/queue/index");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Config = require("../models/Config");
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 5 });
const jwt = require("jsonwebtoken");

//@desc handles Calendly webhook events
//@param valid webhook
//@route POST /bookings/calendly
//@access Public
const handleCalendlyWebhook = asyncHandler(async (req, res) => {
  // Validate request has required fields
  if (!req.body || !req.body.event) {
    logger.warn("Invalid webhook payload: missing event type");
    return res.status(500).json({ message: "Invalid webhook payload" });
  }

  const { event: calendlyEvent, payload } = req.body;

  // Early validation of payload
  if (!payload) {
    logger.warn(`Received ${calendlyEvent} event with missing payload`);
    return res.status(500).json({ message: "Missing payload" });
  }

  // Extract all fields with proper defaults and validation
  const {
    uri: inviteeUri,
    created_at: inviteeCreatedAt,
    email,
    name,
    questions_and_answers = [],
    cancel_url,
    reschedule_url,
    tracking = {},
    scheduled_event = {},
  } = payload;

  const { utm_content: token } = tracking || {};

  // Validate scheduled_event exists for relevant event types
  if (
    (calendlyEvent === "invitee.canceled" ||
      calendlyEvent === "invitee.created") &&
    (!scheduled_event || !scheduled_event.uri)
  ) {
    logger.warn(
      `Received ${calendlyEvent} event with invalid scheduled_event data`
    );
    return res.status(200).json({ message: "Invalid scheduled event data" });
  }

  const {
    uri: eventURI,
    name: eventName,
    event_type: eventTypeURI,
    start_time,
    end_time,
    location = {},
  } = scheduled_event || {};

  const {
    type: locationType,
    location: locationStr,
    additional_info,
    join_url,
    data: zoomData,
  } = location || {};

  if (calendlyEvent === "invitee.canceled") {
    if (!payload.cancellation) {
      logger.warn("Cancellation event missing cancellation data");
      return res.status(200).json({ message: "Invalid cancellation data" });
    }

    let canceler_type, cancelReason, cancellationDate;
    const { cancellation } = payload;
    ({
      canceler_type,
      reason: cancelReason,
      created_at: cancellationDate,
    } = cancellation);

    try {
      await cancelBooking({
        eventURI,
        canceler_type,
        cancelReason,
        cancellationDate,
      });
      logger.info(`Successfully processed cancellation for event: ${eventURI}`);
    } catch (error) {
      logger.error(`Error processing cancellation: ${error.message}`);
    }

    return res.status(200).end();
  } else if (
    calendlyEvent === "invitee.created" &&
    eventName === "1 Hour Session"
  ) {
    // Check if token exists
    if (!token) {
      logger.warn(`Booking attempt without token: ${eventURI}`);
      try {
        await deleteEvent(
          eventURI,
          "Invalid booking request: missing authentication",
          email,
          null,
          start_time,
          name
        );
      } catch (err) {
        logger.error(
          `Failed to delete event after token validation: ${err.message}`
        );
      }
      return res.status(200).send();
    }

    // 1) Verify JWT in utm_content
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      // Validate decoded token contains required fields
      if (!decoded.userId || !decoded.jti) {
        throw new Error("Invalid token structure");
      }
    } catch (err) {
      logger.warn(`JWT verification failed: ${err.message}`);
      try {
        await deleteEvent(
          eventURI,
          "Expired or invalid booking link",
          email,
          null,
          start_time,
          name
        );
      } catch (deleteErr) {
        logger.error(
          `Failed to delete event after JWT verification: ${deleteErr.message}`
        );
      }
      return res.status(200).send();
    }

    // 2) Enforce single-use via jti
    let user;
    try {
      user = await User.findById(decoded.userId).exec();
    } catch (err) {
      logger.error(`Error finding user: ${err.message}`);
    }

    if (!user) {
      logger.warn(`User not found for userId: ${decoded.userId}`);
      try {
        await deleteEvent(
          eventURI,
          "Expired or invalid booking link",
          email,
          null,
          start_time,
          name
        );
      } catch (err) {
        logger.error(`Failed to delete event: ${err.message}`);
      }
      return res.status(200).send();
    }

    if (user.bookingTokenJTI !== decoded.jti) {
      logger.warn(
        `JTI mismatch for user ${user._id}: expected ${user.bookingTokenJTI}, got ${decoded.jti}`
      );
      try {
        await deleteEvent(
          eventURI,
          "Expired or invalid booking link",
          email,
          user,
          start_time,
          name
        );
      } catch (err) {
        logger.error(`Failed to delete event: ${err.message}`);
      }
      return res.status(200).send();
    }

    // 3) Invalidate token so it cannot be reused
    try {
      user.bookingTokenJTI = undefined;
      await user.save();

      await createBooking({
        userId: decoded.userId,
        start_time,
        end_time,
        eventName,
        eventURI,
        eventTypeURI,
        cancel_url,
        reschedule_url,
        locationType,
        locationStr,
        additional_info,
        join_url,
        zoomData,
        email,
      });

      logger.info(`Successfully created booking for user ${user._id}`);
    } catch (err) {
      logger.error(`Error in booking creation process: ${err.message}`);
    }

    return res.status(200).end();
  }

  logger.info(`Received unhandled Calendly event type: ${calendlyEvent}`);
  return res.status(200).json({
    message: `Event type '${calendlyEvent}' not processed`,
  });
});

// ----------------------------- Helper Functions ----------------------------- //

async function createBooking({
  userId,
  start_time,
  end_time,
  eventName,
  eventURI,
  eventTypeURI,
  cancel_url,
  reschedule_url,
  locationType,
  locationStr,
  additional_info,
  join_url,
  zoomData,
  calendlyEmail,
}) {
  const [existingBooking, user] = await Promise.all([
    Booking.findOne({ "calendly.scheduledEventURI": eventURI }).lean(),
    User.findById(userId).lean(),
  ]);

  if (existingBooking) {
    return;
  }
  if (!user) {
    try {
      await deleteEvent(eventURI, null, calendlyEmail, null, start_time);
    } catch (err) {
      logger.error(`Could not delete booking. request failed with err: ${err}`);
    }
    return;
  }

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
    try {
      await deleteEvent(eventURI, null, null, user, start_time);
    } catch (err) {}
    return;
  }

  const transactionReferenceNumber = `T-${uid.rnd()}`;
  const bookingData = {
    userId: user._id,
    eventStartTime: start_time,
    eventEndTime: end_time,
    source: "calendly",
    calendly: {
      eventName,
      scheduledEventURI: eventURI,
      eventTypeURI,
      cancelURL: cancel_url,
      rescheduleURL: reschedule_url,
    },
    amount: sessionPrice,
    location: (() => {
      const loc = {};
      if (locationType === "zoom") {
        loc.type = "online";
        loc.join_url = join_url;
        loc.zoom_pwd = zoomData?.password;
      } else if (locationType === "google_conference") {
        loc.type = "online";
        loc.join_url = join_url;
      } else if (locationType === "physical") {
        loc.type = "in-person";
        loc.inPersonLocation = locationStr;
      }
      return loc;
    })(),
  };

  const paymentData = {
    userId: user._id,
    amount: sessionPrice,
    currency: currency,
    transactionReferenceNumber,
  };

  try {
    const [booking, payment] = await Promise.all([
      Booking.create(bookingData),
      Payment.create(paymentData),
    ]);

    // Add null checks to prevent TypeError if booking or payment is undefined
    if (booking && payment) {
      booking.paymentId = payment._id;
      payment.bookingId = booking._id;
      await Promise.all([booking.save(), payment.save()]);
    }

    await invalidateByEvent("booking-created", {
      userId: userId,
    });

    // Also invalidate payment cache since we created a payment
    await invalidateByEvent("payment-created", {
      userId: userId,
    });

    return { booking, payment };
  } catch (err) {
    logger.error(`Error creating booking: ${err.message}`);
    return null;
  }
}

async function cancelBooking({
  eventURI,
  canceler_type,
  cancelReason,
  cancellationDate,
}) {
  const booking = await Booking.findOne({
    "calendly.scheduledEventURI": eventURI,
  }).exec();
  if (!booking) {
    return;
  }
  if (booking.status === "Cancelled") return;

  booking.status = "Cancelled";
  booking.cancellation.reason = cancelReason;
  booking.cancellation.cancelledBy =
    canceler_type === "invitee" ? "User" : "Admin";
  booking.cancellation.date = new Date(cancellationDate);

  await booking.save();
  await invalidateByEvent("booking-updated", {
    userId: booking.userId,
  });

  // Send cancellation notification (to user and admin)
  await sendEmail("BookingCancellationNotifications", {
    bookingId: booking._id.toString(),
    userId: booking.userId.toString(),
    cancelledBy: canceler_type === "invitee" ? "user" : "admin",
    reason: cancelReason,
    eventStartTime: booking.eventStartTime,
    cancellationDate: new Date(cancellationDate),
    paymentId: booking.paymentId ? booking.paymentId.toString() : null,
    bookingIdNumber: booking.bookingId,
    notifyAdmin: true,
  });
}

// Helper functions removed - cancellation notifications now handled by BookingCancellationNotifications job handler

async function deleteEvent(
  eventURI,
  reasonText = "No user found",
  calendlyEmail = null,
  user = null,
  eventStartTime = null,
  inviteeName = null
) {
  const isRegisteredUser = !!user;
  const userEmail = isRegisteredUser ? user.email : null;
  const userName = isRegisteredUser ? user.name : null;

  // format date/time only if we have start_time
  let formattedDate = "your scheduled session";
  let formattedTime = "";
  if (eventStartTime) {
    const dt = new Date(eventStartTime);
    formattedDate = dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    formattedTime = dt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const options = {
    method: "POST",
    url: `${eventURI}/cancellation`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
    },
    data: { reason: reasonText },
  };

  try {
    await axios.request(options);
    logger.info(`Event deleted: ${eventURI} – ${reasonText}`);

    if (isRegisteredUser && userEmail) {
      await sendEmail("EventDeletedNotification", {
        userId: user._id.toString(),
        eventStartTime,
        reason: reasonText,
      });
      logger.info(`Event-deleted email sent to registered user: ${userEmail}`);
    } else if (calendlyEmail) {
      await sendEmail("UnauthorizedBookingNotification", {
        calendlyEmail,
        inviteeName,
      });
      logger.info(`Unauthorized-booking email sent to: ${calendlyEmail}`);
    } else {
      logger.info("No email available; skipped notification.");
    }
  } catch (err) {
    logger.error(`Could not delete booking. Calendly request failed: ${err}`);
    throw err;
  }
}

// ----------------------------- End Webhook Helper Functions ----------------------------- //

//@desc creates a unique one-time booking link
//@param {Object} req with valid userId
//@route GET /bookings/calendly
//@access Private
const getNewBookingLink = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  if (!userId) {
    return res.status(401).json({ message: "No userId found in req object" });
  }

  const user = await User.findById(userId).exec();
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const bookingCount = await Booking.find({
    userId,
    status: "Active",
    source: { $ne: "system" },
  })
    .countDocuments()
    .exec();
  let maxAllowedBookings = await Config.getValue("maxBookings");
  if (!maxAllowedBookings) {
    maxAllowedBookings = 2;
  }
  if (bookingCount >= maxAllowedBookings) {
    return res.status(403).json({
      message: "The maximum amount of active bookings reached.",
      maxAllowedBookings,
    });
  }

  const now = new Date().toISOString();
  const jti = uid.rnd();

  const token = jwt.sign(
    { userId, now, jti },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "30m" }
  );

  user.bookingTokenJTI = jti;
  await user.save();

  const bookingLink = `${
    process.env.CALENDLY_SESSION_URL
  }?utm_source=dash&utm_content=${encodeURIComponent(token)}`;

  return res.status(200).json({ link: bookingLink });
});

//@desc returns one-off bookings (admin/Calendly) only - excludes recurring/system bookings
//@param {Object} req with valid email
//@route GET /bookings
//@access Private
const getActiveBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [bookingsWithPayments, noticePeriod] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId.createFromHexString(userId),
          status: "Active",
          source: { $in: ["admin", "calendly"] },
          $or: [
            { "recurring.state": { $exists: false } },
            { "recurring.state": false },
            { "recurring.state": null },
          ],
          eventEndTime: { $gt: new Date() },
        },
      },
      { $sort: { eventStartTime: 1 } },
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "bookingId",
          as: "payment",
        },
      },
      {
        $unwind: {
          path: "$payment",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          bookingId: 1,
          eventStartTime: 1,
          eventEndTime: 1,
          eventName: 1,
          status: 1,
          location: 1,
          "calendly.cancelURL": 1,
          "calendly.eventName": 1,
          source: 1,
          amount: "$payment.amount",
          currency: "$payment.currency",
          transactionStatus: "$payment.transactionStatus",
        },
      },
    ]),
    Config.getValue("noticePeriod"),
  ]);

  if (bookingsWithPayments.length === 0) {
    return res.status(204).end();
  }

  // Process bookings (strip cancelURL if needed)
  const processedBookings = bookingsWithPayments.map((booking) => {
    const diffMs = new Date(booking.eventStartTime).getTime() - Date.now();
    const daysLeft = diffMs / (1000 * 60 * 60 * 24);

    if (daysLeft < noticePeriod && booking.calendly?.cancelURL) {
      delete booking.calendly.cancelURL;
    }

    // Remove payment fields for free consultations
    const isFreeConsultation =
      booking.calendly?.eventName === "15 Minute Consultation";
    if (isFreeConsultation) {
      delete booking.amount;
      delete booking.currency;
      delete booking.transactionStatus;
    }

    return booking;
  });

  res.json(processedBookings);
});

//@desc Cancel a user's own booking (admin/system source only, not calendly)
//@param {Object} req with valid userId and bookingId in params
//@route PUT /bookings/:bookingId/cancel
//@access Private
const cancelMyBooking = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;
  const { reason } = req.body;

  // Validate bookingId
  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  // Validate reason
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return res.status(400).json({ message: "Cancellation reason is required" });
  }

  logger.debug(`User ${userId} attempting to cancel booking ${bookingId}`);

  try {
    // Find the booking and ensure it belongs to the user
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: userId,
    }).exec();

    if (!booking) {
      logger.debug(`Booking ${bookingId} not found for user ${userId}`);
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if booking is already cancelled
    if (booking.status === "Cancelled") {
      logger.debug(`Booking ${bookingId} is already cancelled`);
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    // Check if this is a Calendly booking (must use Calendly's cancel URL)
    if (booking.source === "calendly") {
      logger.debug(
        `Booking ${bookingId} is a Calendly booking - must use Calendly cancel URL`
      );
      return res.status(400).json({
        message:
          "Calendly bookings must be cancelled through the Calendly link provided",
      });
    }

    // Verify booking source is admin or system
    if (!["admin", "system"].includes(booking.source)) {
      logger.debug(
        `Booking ${bookingId} has invalid source for user cancellation: ${booking.source}`
      );
      return res.status(400).json({
        message: `Cannot cancel ${booking.source} booking`,
      });
    }

    // Check if cancellation is within the notice period
    const noticePeriod = await Config.getValue("noticePeriod");
    const cutoffDays = parseInt(noticePeriod, 10) || 2;
    const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
    const currentTime = new Date();
    const cutoffDeadline = new Date(
      booking.eventStartTime.getTime() - cutoffMillis
    );

    if (currentTime >= cutoffDeadline) {
      logger.debug(
        `Booking ${bookingId} is outside cancellation window (${cutoffDays} days)`
      );
      return res.status(403).json({
        message: `Cancellations must be made at least ${cutoffDays} days before the session`,
        cutoffDays,
      });
    }

    // Capture cancellation date before updating
    const cancellationDate = new Date();

    // Update booking status and add cancellation details
    booking.status = "Cancelled";
    booking.cancellation = {
      reason: reason.trim(),
      date: cancellationDate,
      cancelledBy: "User",
    };

    // Mark Google sync as pending if there's a Google event
    if (booking.googleEventId) {
      booking.syncStatus.google = "pending";
      booking.markModified("syncStatus");
    }

    await booking.save();

    logger.info(`Booking ${bookingId} cancelled by user ${userId}`);

    // Queue Google Calendar deletion job if needed
    if (booking.googleEventId) {
      try {
        await addJob("GoogleCalendarEventCancellation", {
          bookingId: booking._id.toString(),
          notifyUser: false,
          reason: reason.trim(),
        });
        logger.info(
          `Queued Google Calendar deletion for booking ${booking._id}`
        );
      } catch (error) {
        logger.error(
          `Failed to queue Google Calendar deletion: ${error.message}`
        );
        // Don't fail the cancellation if queue fails - booking is still cancelled
      }
    }

    // Queue notification job with minimal data - let the job handler do the heavy lifting
    try {
      await sendEmail("BookingCancellationNotifications", {
        bookingId: booking._id.toString(),
        userId: booking.userId.toString(),
        cancelledBy: "user",
        reason: reason.trim(),
        eventStartTime: booking.eventStartTime,
        cancellationDate,
        paymentId: booking.paymentId ? booking.paymentId.toString() : null,
        bookingIdNumber: booking.bookingId,
        notifyAdmin: true,
      });
      logger.info(
        `Queued user-initiated cancellation notifications for booking ${booking._id}`
      );
    } catch (error) {
      logger.error(
        `Failed to queue cancellation notifications: ${error.message}`
      );
      // Don't fail the cancellation - booking is still cancelled
    }

    // Invalidate cache
    await invalidateByEvent("booking-updated", {
      userId: booking.userId,
    });

    return res.status(200).json({
      message: "Booking cancelled successfully",
      booking: {
        _id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        cancellation: booking.cancellation,
      },
    });
  } catch (err) {
    logger.error(`Error cancelling booking: ${err.message}`);
    return res.status(500).json({
      message: "Failed to cancel booking",
      error: err.message,
    });
  }
});

//@desc returns booking documents with payment and booking details with filters and searching
//@param valid user jwt token
//@route GET /user/bookings
//@access Private
const getAllMyBookings = asyncHandler(async (req, res) => {
  let userId;
  try {
    userId = mongoose.Types.ObjectId.createFromHexString(req.user.id);
  } catch (err) {
    // In tests, we may not have a valid ObjectId format
    userId = req.user.id;
  }
  let page = parseInt(req.query.page, 10) || 1;
  if (page < 1) page = 1; // Ensure page is not less than 1
  const limit = parseInt(req.query.limit, 10) || 10;
  const {
    search,
    transactionRef,
    paymentStatus,
    startDate,
    endDate,
    location,
  } = req.query;
  const skip = (page - 1) * limit;

  const query = { userId };

  // Search by Booking ID (customerBookingId)
  if (search) {
    if (!isNaN(search)) {
      query.bookingId = parseInt(search, 10);
    } else {
      query.bookingId = -1; // No booking will have ID -1
    }
  }

  // Date filtering using startDate and endDate parameters
  if (startDate && endDate) {
    try {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Invalid date format provided." });
      }

      query.eventStartTime = { $gte: parsedStartDate, $lte: parsedEndDate };
    } catch (e) {
      logger.error(`Error parsing date parameters: ${e.message}`);
      return res.status(400).json({ message: "Invalid date parameters." });
    }
  }

  // Location filtering
  if (location && (location === "online" || location === "in-person")) {
    query["location.type"] = location;
  }

  try {
    const aggregatePipeline = [
      {
        $match: {
          ...query,
          eventStartTime: query.eventStartTime || { $lt: new Date() }, // ensures eventStartTime is in the past if not already filtered
        },
      }, // Initial match on booking fields
      {
        $lookup: {
          from: "payments",
          let: { pid: "$paymentId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
            {
              $project: {
                _id: 1,
                amount: 1,
                transactionStatus: 1,
                currency: 1,
                transactionReferenceNumber: 1, // Add this field to projection
              },
            },
          ],
          as: "payment",
        },
      },
      { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
    ];

    // Filter by payment transaction reference if provided
    if (transactionRef) {
      // Remove "T-" prefix if present
      const searchRefNumber = transactionRef.startsWith("T-")
        ? transactionRef.substring(2)
        : transactionRef;

      // Add a match stage for transaction reference number
      aggregatePipeline.push({
        $match: {
          $or: [
            { "payment.transactionReferenceNumber": searchRefNumber },
            {
              "payment.transactionReferenceNumber": new RegExp(
                searchRefNumber,
                "i"
              ),
            }, // Case insensitive search
          ],
        },
      });

      logger.debug(`Filtering by transaction reference: ${searchRefNumber}`);
    }

    // Filter by paymentStatus if provided
    if (paymentStatus) {
      aggregatePipeline.push({
        $match: { "payment.transactionStatus": paymentStatus },
      });
    }

    // Add sorting, $facet for pagination, and final $project
    aggregatePipeline.push(
      { $sort: { eventStartTime: -1 } },
      {
        $facet: {
          metadata: [{ $count: "totalBookings" }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                eventStartTime: 1,
                eventEndTime: 1,
                bookingId: 1,
                status: 1,
                eventName: 1,
                location: 1,
                notes: 1,
                cancellation: 1,
                createdAt: 1,
                payment: 1,
              },
            },
          ],
        },
      }
    );

    const result = await Booking.aggregate(aggregatePipeline).exec();

    // Handle case when result is empty or undefined
    const resultData =
      result && result.length > 0 ? result[0] : { metadata: [], data: [] };

    // Extract metadata safely
    const metadata =
      resultData.metadata && resultData.metadata.length > 0
        ? resultData.metadata[0]
        : { totalBookings: 0 };

    const totalBookings = metadata.totalBookings || 0;
    const bookings = resultData.data || [];

    res.json({
      page: page,
      limit,
      totalBookings,
      totalPages: Math.ceil(totalBookings / limit),
      bookings,
    });
  } catch (error) {
    logger.error(`Error fetching bookings: ${error.message}`);
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

//@desc returns a specific booking
//@param {Object} req with valid email and bookingId
//@route GET /bookings/:bookingId
//@access Private
const getBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ message: "bookingId is required" });
  }

  // Optimization: Use aggregation to validate ObjectId and fetch in one query
  let objectId;
  try {
    objectId = mongoose.Types.ObjectId.createFromHexString(bookingId);
  } catch (err) {
    return res.status(400).json({ message: "Invalid booking ID format" });
  }

  const result = await Booking.aggregate([
    {
      $match: {
        _id: objectId,
        userId: mongoose.Types.ObjectId.createFromHexString(req.user.id),
      },
    },
    {
      $project: {
        _id: 1,
        bookingId: 1,
        eventStartTime: 1,
        eventEndTime: 1,
        eventName: 1,
        status: 1,
        location: 1,
        cancellation: 1,
      },
    },
    { $limit: 1 },
  ]);

  if (!result || result.length === 0) {
    return res.status(404).json({ message: "No such booking found for user" });
  }

  res.json(result[0]);
});

module.exports = {
  handleCalendlyWebhook,
  getActiveBookings,
  getNewBookingLink,
  getBooking,
  getAllMyBookings,
  cancelMyBooking,
  // for testing
  createBooking,
  cancelBooking,
  deleteEvent,
};
