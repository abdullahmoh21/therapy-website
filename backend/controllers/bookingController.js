const crypto = require("crypto");
const logger = require("../logs/logger");
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { invalidateCache } = require("../middleware/redisCaching");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const TemporaryBooking = require("../models/TemporaryBooking");
const Config = require("../models/Config"); // Import Config model
const ShortUniqueId = require("short-unique-id");
const uid = new ShortUniqueId({ length: 5 }); //for generating transaction reference number
const jwt = require("jsonwebtoken");

//@desc handles Calendly webhook events
//@param valid webhook
//@route POST /bookings/calendly
//@access Public
const handleCalendlyWebhook = asyncHandler(async (req, res) => {
  logger.debug("Calendly Webhook received: ", JSON.stringify(req.body));
  const { event: calendlyEvent, payload } = req.body;
  const {
    uri: inviteeUri,
    created_at: inviteeCreatedAt,
    email,
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
  } else if (calendlyEvent == "invitee.created") {
    // 1) Verify JWT in utm_content
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      try {
        await deleteEvent(eventURI, "Expired or invalid booking link");
      } catch (err) {}
      return res.status(200).send();
    }

    // 2) Enforce single-use via jti
    const user = await User.findById(decoded.userId).exec();
    if (!user || user.bookingTokenJTI !== decoded.jti) {
      try {
        `No user or invalid JTI\nuser.bookingTokenJTI:${user.bookingTokenJTI}\ndecoded jti: ${decoded.jti}`;
        await deleteEvent(eventURI, "Expired or invalid booking link");
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
    return res.status(200).send();
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
    return res.status(200).send();
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

  await Promise.all([invalidateCache("/bookings", userId)]);
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
  await invalidateCache("/bookings", booking.userId);

  logger.info(`Booking cancelled locally for email ${booking.email}`);
}

async function deleteEvent(eventURI, reasonText = "No user found") {
  const options = {
    method: "POST",
    url: `${eventURI}/cancellation`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
    },
    data: { reason: reasonText },
  };
  await axios.request(options);
  logger.info(`Event deleted: ${eventURI} – ${reasonText}`);
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

  const cancelCutoffDays = await Config.getValue("cancelCutoffDays");

  // Map payments for quick lookup
  const paymentMap = new Map(
    payments.map((payment) => [payment.bookingId.toString(), payment])
  );

  // Loop once to strip cancelURL and merge payment details
  const bookingsWithPaymentDetails = bookings.map((booking) => {
    // strip cancelURL if cancellation window passed
    const diffMs = new Date(booking.eventStartTime).getTime() - Date.now();
    const daysLeft = diffMs / (1000 * 60 * 60 * 24);
    if (daysLeft < cancelCutoffDays) {
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
};
