const crypto = require("crypto");
const logger = require("../logs/logger");
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const mongoose = require("mongoose");
const { invalidateByEvent } = require("../middleware/redisCaching");
const { sendEmail } = require("../utils/queue/index");
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
    Booking.findOne({ scheduledEventURI: eventURI }).lean(),
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
    eventName,
    scheduledEventURI: eventURI,
    eventTypeURI,
    cancelURL: cancel_url,
    rescheduleURL: reschedule_url,
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
  const booking = await Booking.findOne({ scheduledEventURI: eventURI }).exec();
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

  // Always send user notification
  await sendUserCancellationNotification(booking, cancelReason, canceler_type);

  // Always send admin notification
  await sendAdminCancellationNotification(booking);
}

async function sendAdminCancellationNotification(booking) {
  try {
    const adminEmail = await Config.getValue("adminEmail");
    if (!adminEmail) {
      logger.error(
        "Admin email not found in config. Cannot send admin cancellation notification."
      );
      return;
    }

    const [user, payment] = await Promise.all([
      User.findById(booking.userId).lean().exec(),
      Payment.findById(booking.paymentId).lean().exec(),
    ]);

    if (!user) {
      logger.error(
        `User not found for booking ${booking._id}. Could not send admin cancellation email.`
      );
      return;
    }

    // Check if cancellation is within policy for refund eligibility
    const currentTime = new Date();
    const noticePeriod = await Config.getValue("noticePeriod");
    const cutoffDays = parseInt(noticePeriod, 10) || 3;
    const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
    const cutoffDeadline = new Date(
      booking.eventStartTime.getTime() - cutoffMillis
    );
    const isLateCancellation = currentTime >= cutoffDeadline;

    // Determine if payment exists and is completed
    const hasCompletedPayment =
      payment && payment.transactionStatus === "Completed";

    // Prepare email data
    const emailJobData = {
      booking: booking,
      payment: payment || null,
      recipient: adminEmail,
      updatePaymentStatus: hasCompletedPayment && !isLateCancellation, // Only update status for eligible refunds
      isLateCancellation: isLateCancellation,
    };

    await sendEmail("adminCancellationNotif", emailJobData);

    // Update payment status if eligible for refund
    if (hasCompletedPayment && !isLateCancellation) {
      await Payment.updateOne(
        { _id: payment._id },
        {
          transactionStatus: "Refund Requested",
          refundRequestedDate: new Date(),
        }
      );
      logger.info(
        `Payment status updated to 'Refund Requested' for paymentId: ${payment._id}`
      );
    }

    logger.info(
      `Admin cancellation notification sent for booking ${booking._id} (${
        isLateCancellation ? "late" : "normal"
      } cancellation, ${hasCompletedPayment ? "paid" : "unpaid"})`
    );
  } catch (error) {
    logger.error(
      `Error sending admin cancellation notification for booking ${booking._id}: ${error.message}`
    );
  }
}

async function sendUserCancellationNotification(
  booking,
  reason,
  canceler_type
) {
  try {
    const [user, payment] = await Promise.all([
      User.findById(booking.userId).lean().exec(),
      Payment.findById(booking.paymentId).lean().exec(),
    ]);

    if (!user) {
      logger.error(
        `User not found for booking ${booking._id}. Could not send user cancellation email.`
      );
      return;
    }

    const noticePeriod = await Config.getValue("noticePeriod");
    const cutoffDays = parseInt(noticePeriod, 10) || 3;

    const currentTime = new Date();
    const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
    const cutoffDeadline = new Date(
      booking.eventStartTime.getTime() - cutoffMillis
    );

    // Format dates and times
    const eventDate = new Date(booking.eventStartTime).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const eventTime = new Date(booking.eventStartTime).toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    const formattedCancellationDate = new Date(
      booking.cancellation.date
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isUnpaid = !payment || payment.transactionStatus !== "Completed";
    const isRefundEligible = !isUnpaid && currentTime < cutoffDeadline;
    const isRefundIneligible = !isUnpaid && !isRefundEligible;

    const isAdminCancelled = booking.cancellation.cancelledBy === "Admin";
    const cancelledByDisplay =
      booking.cancellation.cancelledBy === "User"
        ? "You"
        : booking.cancellation.cancelledBy;

    // Prepare email data and delegate to the queue
    const emailData = {
      recipient: user.email,
      name: user.firstName ? `${user.firstName} ${user.lastName}` : user.name,
      bookingId: booking.bookingId.toString(),
      eventDate,
      eventTime,
      cancelledBy: booking.cancellation.cancelledBy,
      cancelledByDisplay,
      reason,
      cancellationDate: formattedCancellationDate,
      isUnpaid,
      isRefundEligible,
      isRefundIneligible,
      isAdminCancelled,
      cancelCutoffDays: cutoffDays,
    };

    // Send the email
    await sendEmail("userCancellation", emailData);
    logger.info(
      `User cancellation notification queued for ${user.email} for booking ${booking._id}`
    );
  } catch (error) {
    logger.error(
      `Error queueing user cancellation notification: ${error.message}`
    );
  }
}

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
      await sendEmail("eventDeleted", {
        recipient: userEmail,
        name: userName,
        eventDate: formattedDate,
        eventTime: formattedTime,
        reason: reasonText,
      });
      logger.info(`Event-deleted email sent to registered user: ${userEmail}`);
    } else if (calendlyEmail) {
      await sendEmail("unauthorizedBooking", {
        calendlyEmail,
        name: inviteeName,
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

//@desc returns all bookings of a user
//@param {Object} req with valid email
//@route GET /bookings
//@access Private
const getActiveBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Fetch active bookings and all payments for the user in parallel
  const [bookings, payments] = await Promise.all([
    Booking.find({
      userId,
      status: "Active",
      eventEndTime: { $gt: new Date().getTime() },
    })
      .sort({ eventStartTime: 1 }) // Sort by eventStartTime ascending (closest first)
      .select(
        "bookingId eventStartTime eventEndTime eventName status location cancelURL"
      )
      .lean()
      .exec(),
    Payment.find({ userId })
      .select("transactionStatus amount paymentId currency bookingId userId")
      .lean()
      .exec(),
  ]);

  if (bookings.length === 0) return res.status(204).end();

  const noticePeriod = await Config.getValue("noticePeriod");

  // Map payments for quick lookup
  const paymentMap = new Map(
    payments.map((payment) => [payment.bookingId.toString(), payment])
  );

  // Loop once to strip cancelURL and merge payment details
  const bookingsWithPaymentDetails = bookings.map((booking) => {
    // strip cancelURL if cancellation window passed
    const diffMs = new Date(booking.eventStartTime).getTime() - Date.now();
    const daysLeft = diffMs / (1000 * 60 * 60 * 24);
    if (daysLeft < noticePeriod) {
      delete booking.cancelURL;
    }

    // skip payment merge for free consultations
    if (booking.eventName === "15 Minute Consultation") {
      return booking;
    }

    const paymentDetails = paymentMap.get(booking._id.toString());
    if (paymentDetails) {
      booking.amount = paymentDetails.amount;
      booking.currency = paymentDetails.currency;
      booking.transactionStatus = paymentDetails.transactionStatus;
      booking.paymentId = paymentDetails._id;
    }

    return booking;
  });

  res.json(bookingsWithPaymentDetails);
});

//@desc returns booking documents with payment and booking details with filters and searching
//@param valid user jwt token
//@route GET /user/bookings
//@access Private
const getAllMyBookings = asyncHandler(async (req, res) => {
  let userId;
  try {
    userId = new mongoose.Types.ObjectId(req.user.id);
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
//@param {Object} req with valid email abd bookingId
//@route GET /bookings:bookingId
//@access Private
const getBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({ message: "bookingId is required" });
  }

  const booking = await Booking.findOne({
    userId: req.user.id,
    _id: bookingId,
  })
    .lean()
    .select(
      "_id bookingId eventStartTime eventEndTime eventName status location cancellation"
    )
    .exec();

  if (!booking) {
    return res.status(404).json({ message: "No such booking found for user" });
  }

  res.json(booking);
});

module.exports = {
  handleCalendlyWebhook,
  getActiveBookings,
  getNewBookingLink,
  getBooking,
  getAllMyBookings,
  // for testing
  createBooking,
  cancelBooking,
  sendAdminCancellationNotification,
  sendUserCancellationNotification,
  deleteEvent,
};
