const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const logger = require("../logs/logger");

//@desc returns all bookings with only the fields to e displayed in frontend table
//@param valid admin jwt token
//@route GET /admin/bookings
//@access Private(admin)
const getAllBookings = asyncHandler(async (req, res) => {
  // Get pagination and filter parameters from the query string
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const {
    search,
    status,
    datePreset,
    showPastBookings,
    paymentOverdue,
    location,
  } = req.query;

  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 40) {
    return res.status(400).json({
      message:
        "Page and limit must be positive integers and limit should not exceed 40",
    });
  }

  // Calculate the number of documents to skip
  const skip = (page - 1) * limit;

  const query = {};

  // Status filter
  if (status) {
    query.status = status;
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // preset date filters
  if (datePreset) {
    query.eventStartTime = {};

    switch (datePreset) {
      case "today":
        // Today: from start of today to end of today
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);
        query.eventStartTime.$gte = startOfToday;
        query.eventStartTime.$lte = endOfToday;
        break;

      case "tomorrow":
        // Tomorrow: from start of tomorrow to end of tomorrow
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        query.eventStartTime.$gte = startOfTomorrow;
        query.eventStartTime.$lte = endOfTomorrow;
        break;

      case "thisWeek":
        // This week: from start of today to end of this week (Sunday)
        const endOfThisWeek = new Date(startOfToday);
        const daysUntilSunday = 7 - startOfToday.getDay();
        endOfThisWeek.setDate(endOfThisWeek.getDate() + daysUntilSunday);
        endOfThisWeek.setHours(23, 59, 59, 999);
        query.eventStartTime.$gte = startOfToday;
        query.eventStartTime.$lte = endOfThisWeek;
        break;

      case "thisMonth":
        // This month: from today to end of month
        const endOfThisMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        query.eventStartTime.$gte = startOfToday;
        query.eventStartTime.$lte = endOfThisMonth;
        break;

      case "nextMonth":
        // Next month: entire next month
        const startOfNextMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1,
          0,
          0,
          0,
          0
        );
        const endOfNextMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 2,
          0,
          23,
          59,
          59,
          999
        );
        query.eventStartTime.$gte = startOfNextMonth;
        query.eventStartTime.$lte = endOfNextMonth;
        break;

      case "lastMonth":
        // Last month: entire previous month
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
          0,
          0,
          0,
          0
        );
        const endOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999
        );
        query.eventStartTime.$gte = startOfLastMonth;
        query.eventStartTime.$lte = endOfLastMonth;
        break;

      default:
        // Default case - don't apply specific date preset filter
        delete query.eventStartTime;
    }
  }

  if (showPastBookings !== "true") {
    if (!query.eventStartTime) {
      query.eventStartTime = { $gte: startOfToday };
    }
  } else if (!datePreset) {
    // If showing past bookings and no datePreset specified,
    // we don't need any eventStartTime filter
    delete query.eventStartTime;
  }

  // Location filter - fixed to query the nested type field
  if (location) {
    query["location.type"] = location;
  }

  let userIds = [];
  if (search) {
    const users = await User.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    userIds = users.map((user) => user._id);
    if (userIds.length > 0) {
      query.userId = { $in: userIds };
    } else {
      return res.json({
        page,
        limit,
        totalBookings: 0,
        totalPages: 0,
        bookings: [],
      });
    }
  }

  try {
    // Handle payment overdue filter
    let paymentOverdueIds = [];
    if (paymentOverdue === "true") {
      // Find all completed bookings that have payments and payments are not completed
      const bookingsWithOverduePayments = await Booking.aggregate([
        {
          $match: { status: "Completed" },
        },
        {
          $lookup: {
            from: "payments",
            localField: "paymentId",
            foreignField: "_id",
            as: "payment",
          },
        },
        {
          $match: {
            $or: [
              { payment: { $size: 0 } }, // No payment record
              { "payment.transactionStatus": { $ne: "Completed" } }, // Payment not completed
            ],
          },
        },
        {
          $project: { _id: 1 },
        },
      ]);

      paymentOverdueIds = bookingsWithOverduePayments.map((b) => b._id);

      if (paymentOverdueIds.length > 0) {
        query._id = { $in: paymentOverdueIds };
      } else if (paymentOverdue === "true") {
        // If no overdue payments found, return empty result
        return res.json({
          page,
          limit,
          totalBookings: 0,
          totalPages: 0,
          bookings: [],
        });
      }
    }

    // Only select fields needed for the table display
    const bookings = await Booking.find(query)
      .skip(skip)
      .limit(limit)
      .select("_id status eventStartTime eventEndTime")
      .populate({
        path: "userId",
        select: "name email",
      })
      .sort({ eventStartTime: -1 })
      .lean()
      .exec();

    const totalBookings = await Booking.countDocuments(query);

    res.json({
      page,
      limit,
      totalBookings,
      totalPages: Math.ceil(totalBookings / limit),
      bookings,
    });
  } catch (error) {
    logger.error(`Error retrieving bookings: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve bookings" });
  }
});

//@desc returns upcoming booking timeline for display in /admin/upcoming
//@param valid admin jwt token
//@route GET /admin/bookings
//@access Private(admin)
const getBookingTimeline = asyncHandler(async (req, res) => {
  try {
    // Get today's date at 00:00:00
    const now = new Date();
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
        select: "name email phone",
      })
      .populate({
        path: "paymentId",
        select:
          "transactionStatus transactionReferenceNumber amount currency paymentCompletedDate paymentMethod paymentRefundedDate refundRequestedDate",
      })
      .lean()
      .exec();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json(booking);
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
