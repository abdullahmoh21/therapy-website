const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const User = require("../../models/User");
const asyncHandler = require("express-async-handler");
const logger = require("../../logs/logger");

//@desc returns all bookings with only the fields to e displayed in frontend table
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
    showPastBookings,
    paymentOverdue,
    location,
  } = req.query;

  const query = {};
  if (status) query.status = status;
  if (location) query["location.type"] = location; // nested field filter

  /* ----- date-preset / past-booking filters ----- */
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));

  if (datePreset) {
    query.eventStartTime = {};
    const presets = {
      today() {
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);
        return [startOfToday, endOfToday];
      },
      tomorrow() {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() + 1);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return [start, end];
      },
      thisWeek() {
        const end = new Date(startOfToday);
        const daysUntilSunday = 7 - startOfToday.getDay();
        end.setDate(end.getDate() + daysUntilSunday);
        end.setHours(23, 59, 59, 999);
        return [startOfToday, end];
      },
      thisMonth() {
        const end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        return [startOfToday, end];
      },
      nextMonth() {
        const start = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth() + 2,
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
          now.getFullYear(),
          now.getMonth() - 1,
          1,
          0,
          0,
          0,
          0
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
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
      query.eventStartTime.$gte = range[0];
      query.eventStartTime.$lte = range[1];
    } else {
      delete query.eventStartTime; // unsupported preset
    }
  }

  if (showPastBookings !== "true" && !query.eventStartTime) {
    query.eventStartTime = { $gte: startOfToday };
  } else if (showPastBookings === "true" && !datePreset) {
    delete query.eventStartTime;
  }

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
    query.status = "Completed"; // only completed bookings matter here
    query.$or = [
      { paymentId: { $exists: false } }, // no payment recorded
      { paymentId: { $in: overduePayments.map((p) => p._id) } }, // payment not completed
    ];
  }

  /* ---------- final data & count (parallel) ---------- */
  const bookingsPromise = Booking.find(query)
    .skip(skip)
    .limit(limit)
    .select("_id status eventStartTime eventEndTime location")
    .populate({ path: "userId", select: "name email" })
    .sort({ eventStartTime: -1 })
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
        "_id eventStartTime eventEndTime eventName location status bookingId notes"
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
        booking.cancellation = {
          cancelledBy: "admin",
          reason: req.body.reason || "Cancelled by administrator",
          date: new Date(),
        };
      }
    }

    // Save the updated booking
    await booking.save();

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
//@route DELETE /admin/bookings
//@access Private (admin)
const deleteBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    // Find booking to check if it exists
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Delete any associated payment if it exists
    if (booking.paymentId) {
      await Payment.findByIdAndDelete(booking.paymentId);
    }

    // Delete the booking
    await Booking.findByIdAndDelete(bookingId);

    logger.info(`Admin deleted booking: ${bookingId}`);

    res.status(200).json({
      message: "Booking successfully deleted",
      deletedBookingId: bookingId,
    });
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
      .select("-__v -eventTypeURI -scheduledEventURI ")
      .lean()
      .exec();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure paymentId is null when no payment exists, rather than undefined
    if (!booking.paymentId) {
      booking.paymentId = null;
    }

    res.json(booking);
  } catch (error) {
    logger.error(`Error retrieving booking details: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve booking details" });
  }
});

module.exports = {
  getAllBookings,
  getBookingTimeline,
  updateBooking,
  deleteBooking,
  getBookingDetails,
};
