const crypto = require("crypto");
const logger = require("../logs/logger");
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const mongoose = require("mongoose");
const { invalidateByEvent } = require("../middleware/redisCaching");
const { sendEmail } = require("../utils/myQueue");
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
  const { event: calendlyEvent, payload } = req.body;
  const {
    uri: inviteeUri,
    created_at: inviteeCreatedAt,
    email, // Email from the payload
    name, // Extract name from payload
    questions_and_answers = [],
    cancel_url,
    reschedule_url,
    tracking: { utm_content: token } = {},
    scheduled_event: {
      uri: eventURI,
      name: eventName,
      event_type: eventTypeURI,
      start_time,
      end_time,
      location: {
        type: locationType,
        location: locationStr,
        additional_info,
        join_url,
        data: zoomData,
      } = {},
    } = {},
  } = payload;

  if (calendlyEvent === "invitee.canceled") {
    let canceler_type, cancelReason, cancellationDate;
    const { cancellation } = payload;
    ({
      canceler_type,
      reason: cancelReason,
      created_at: cancellationDate,
    } = cancellation);
    await cancelBooking({
      eventURI,
      canceler_type,
      cancelReason,
      cancellationDate,
    });
    return res.status(200).end();
  } else if (
    calendlyEvent == "invitee.created" &&
    eventName == "1 Hour Session"
  ) {
    // 1) Verify JWT in utm_content
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      try {
        await deleteEvent(
          eventURI,
          "Expired or invalid booking link",
          email,
          null,
          start_time,
          name // Pass the name to deleteEvent
        );
      } catch (err) {}
      return res.status(200).send();
    }

    // 2) Enforce single-use via jti
    const user = await User.findById(decoded.userId).exec();
    if (!user) {
      await deleteEvent(
        eventURI,
        "Expired or invalid booking link",
        email,
        null,
        start_time,
        name // Pass the name to deleteEvent
      );
    }
    if (user.bookingTokenJTI !== decoded.jti) {
      try {
        await deleteEvent(
          eventURI,
          "Expired or invalid booking link",
          email,
          user,
          start_time,
          name // Pass the name to deleteEvent
        );
      } catch (err) {}
      return res.status(200).send();
    }

    // 3) Invalidate token so it cannot be reused
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
    });
    return res.status(200).end();
  }
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
}) {
  const sessionPrice = await Config.getValue("sessionPrice");
  if (sessionPrice === undefined) {
    try {
      await deleteEvent(eventURI, "Session price not set");
    } catch (err) {}
    return;
  }
  const [existingBooking, user] = await Promise.all([
    Booking.findOne({ scheduledEventURI: eventURI }).lean(),
    User.findById(userId).lean(),
  ]);

  if (existingBooking) {
    return;
  }
  if (!user) {
    try {
      await deleteEvent(eventURI, "User not found");
    } catch (err) {
      logger.error(`Could not delete booking. request failed with err: ${err}`);
    }
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
    transactionReferenceNumber,
    paymentCurrency: "PKR",
    status: "Pending",
  };

  const [booking, payment] = await Promise.all([
    Booking.create(bookingData),
    Payment.create(paymentData),
  ]);

  booking.paymentId = payment._id;
  payment.bookingId = booking._id;
  await Promise.all([booking.save(), payment.save()]);

  await invalidateByEvent("booking-created", {
    userId: userId,
  });
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
    canceler_type === "user" ? "User" : "Admin";
  booking.cancellation.date = new Date(cancellationDate);

  await booking.save();
  await invalidateByEvent("booking-updated", {
    userId: booking.userId,
  });
  await processRefundRequest(booking);
}

async function deleteEvent(
  eventURI,
  reasonText = "No user found",
  calendlyEmail = null, // email from Calendly payload
  user = null, // user doc from our DB (pass it if you have it)
  eventStartTime = null, // start_time from the webhook payload
  inviteeName = null // name from the Calendly payload
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

async function processRefundRequest(booking) {
  // Only proceed if booking has a payment ID
  if (!booking.paymentId) {
    logger.debug(
      `No payment ID found for booking ${booking._id}. Skipping refund processing.`
    );
    return;
  }

  // Fetch admin email from config
  const adminEmail = await Config.getValue("adminEmail");
  if (!adminEmail) {
    logger.error(
      "Admin email not found in config. Cannot process refund processing."
    );
    return;
  }

  // Find the corresponding Payment document
  const payment = await Payment.findOne({ _id: booking.paymentId }).exec();

  // Check if payment exists and is completed
  if (!payment) {
    logger.debug(
      `No payment found for booking ${booking._id}. Skipping refund processing.`
    );
    return;
  }

  if (payment.transactionStatus !== "Completed") {
    logger.debug(
      `Payment for booking ${booking._id} is not completed. Status: ${payment.transactionStatus}. Skipping refund.`
    );
    return;
  }

  // Check if the cancellation is within the allowed time period
  const currentTime = new Date();
  const noticePeriod = await Config.getValue("noticePeriod");
  const cutoffDays = parseInt(noticePeriod, 10);

  if (isNaN(cutoffDays)) {
    logger.error(`Invalid noticePeriod config: ${noticePeriod}`);
    return;
  }

  const cutoffMillis = cutoffDays * 24 * 60 * 60 * 1000;
  const cutoffDeadline = new Date(
    booking.eventStartTime.getTime() - cutoffMillis
  );

  // Fetch user data for the email
  const user = await User.findById(booking.userId).lean().exec();
  if (!user) {
    logger.error(`User not found for booking ${booking._id}.`);
    return;
  }

  // Prepare common email data
  const emailJobData = {
    payment: payment,
    booking: booking,
    recipient: adminEmail,
    updatePaymentStatus: true,
    name: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    bookingId: booking._id.toString(),
    eventDate: new Date(booking.eventStartTime).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    eventTime: new Date(booking.eventStartTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    cancelledBy: booking.cancellation.cancelledBy,
    paymentAmount: payment.amount,
    paymentStatus: payment.transactionStatus,
    paymentCompleted: payment.paymentCompletedDate
      ? new Date(payment.paymentCompletedDate).toLocaleDateString()
      : "N/A",
    transactionReferenceNumber: payment.transactionReferenceNumber,
    cancelCutoffDays: cutoffDays,
    refundLink: `${process.env.SAFEPAY_DASHBOARD_URL}`,
    isAdmin: booking.cancellation.cancelledBy === "Admin",
    frontend_url: process.env.FRONTEND_URL || "https://fatimatherapy.com",
  };

  try {
    // Determine if it's a late cancellation or not
    if (currentTime >= cutoffDeadline) {
      // Late cancellation - send late cancellation notification
      logger.debug(
        `Cancellation for booking ${booking._id} is past the ${cutoffDays}-day cutoff. Sending late cancellation email.`
      );

      await sendEmail("lateCancellation", emailJobData);
      logger.info(
        `Late cancellation notification email sent for booking ${booking._id}, payment ${payment._id}`
      );
    } else {
      // Regular cancellation within policy - send cancellation notification with refund info
      await sendEmail("cancellationNotification", emailJobData);
      payment.refundRequestedDate = new Date();
      await payment.save();
      logger.info(
        `Cancellation notification email sent for booking ${booking._id}, payment ${payment._id}`
      );
    }
  } catch (error) {
    logger.error(
      `Error sending cancellation email for booking ${booking._id}: ${error}`
    );
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
  const userId = new mongoose.Types.ObjectId(req.user.id);
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

  const aggregatePipeline = [
    {
      $match: {
        ...query,
        eventStartTime: { ...query.eventStartTime, $lt: new Date() }, // ensures eventStartTime is in the past
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
    },
    { $unwind: { path: "$metadata", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        totalBookings: { $ifNull: ["$metadata.totalBookings", 0] },
        bookings: "$data",
      },
    }
  );

  try {
    const [result] = await Booking.aggregate(aggregatePipeline).exec();

    const totalBookings = result?.totalBookings || 0;
    const bookings = result?.bookings || [];

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
      "_id eventStartTime eventEndTime eventName status location cancellation"
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
};
