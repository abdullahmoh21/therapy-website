const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const logger = require("../logs/logger");

//@desc returns all bookings
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
    sessionType,
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
        query.eventStartTime.$gte = startOfToday.getTime();
        query.eventStartTime.$lte = endOfToday.getTime();
        break;

      case "tomorrow":
        // Tomorrow: from start of tomorrow to end of tomorrow
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        query.eventStartTime.$gte = startOfTomorrow.getTime();
        query.eventStartTime.$lte = endOfTomorrow.getTime();
        break;

      case "thisWeek":
        // This week: from start of today to end of this week (Sunday)
        const endOfThisWeek = new Date(startOfToday);
        const daysUntilSunday = 7 - startOfToday.getDay();
        endOfThisWeek.setDate(endOfThisWeek.getDate() + daysUntilSunday);
        endOfThisWeek.setHours(23, 59, 59, 999);
        query.eventStartTime.$gte = startOfToday.getTime();
        query.eventStartTime.$lte = endOfThisWeek.getTime();
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
        query.eventStartTime.$gte = startOfToday.getTime();
        query.eventStartTime.$lte = endOfThisMonth.getTime();
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
        query.eventStartTime.$gte = startOfNextMonth.getTime();
        query.eventStartTime.$lte = endOfNextMonth.getTime();
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
        query.eventStartTime.$gte = startOfLastMonth.getTime();
        query.eventStartTime.$lte = endOfLastMonth.getTime();
        break;

      default:
        // Default case - don't apply specific date preset filter
        delete query.eventStartTime;
    }
  }

  if (showPastBookings !== "true") {
    if (!query.eventStartTime) {
      query.eventStartTime = { $gte: startOfToday.getTime() };
    }
  } else if (!datePreset) {
    // If showing past bookings and no datePreset specified,
    // we don't need any eventStartTime filter
    delete query.eventStartTime;
  }

  if (sessionType) {
    if (sessionType === "15min") {
      query.eventName = "15 Minute Consultation";
    } else if (sessionType === "1hour") {
      query.eventName = "1 Hour Session";
    }
    // Add more session types if necessary
  }

  if (location) {
    query.location = location;
  }

  // Payment overdue filter (requires logic based on payment status and booking date)
  // This is complex and depends on how 'overdue' is defined.
  // Example: Find bookings where payment is not 'Completed' and booking is in the past
  if (paymentOverdue === "true") {
    console.warn(
      "Payment overdue filter logic needs implementation based on schema."
    );
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
    const bookings = await Booking.find(query)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "paymentId",
        select:
          "transactionStatus tracker transactionReferenceNumber amount currency paymentCompletedDate",
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

module.exports = {
  getAllBookings,
  updateBooking,
  deleteBooking,
};
