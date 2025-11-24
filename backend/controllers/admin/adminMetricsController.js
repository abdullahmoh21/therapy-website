const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const Inquiry = require("../../models/Inquiry");
const asyncHandler = require("express-async-handler");

//@desc gets user and general statistics that don't change with time period
//@param valid admin jwt token
//@route Get /admin/statistics/general
//@access Private(admin)
const getGeneralMetrics = asyncHandler(async (req, res) => {
  const [
    // User metrics
    totalUsersCount,
    averageUserAge,

    // Platform metrics
    totalBookingsAllTime,
    totalInquiriesAllTime,

    // User activity metrics
    mostActiveUsers,
  ] = await Promise.all([
    // Total number of users
    User.countDocuments({}),

    // Average user age
    User.aggregate([
      {
        $match: { DOB: { $exists: true, $ne: null } },
      },
      {
        $project: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), "$DOB"] },
                365 * 24 * 60 * 60 * 1000,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          averageAge: { $avg: "$age" },
        },
      },
    ]),

    // Total bookings all time
    Booking.countDocuments({}),

    // Total inquiries all time
    Inquiry.countDocuments({}),

    // Most active users (by booking count)
    Booking.aggregate([
      {
        $group: {
          _id: "$userId",
          bookingCount: { $sum: 1 },
        },
      },
      {
        $sort: { bookingCount: -1 },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $project: {
          userId: "$_id",
          bookingCount: 1,
          name: { $arrayElemAt: ["$userDetails.name", 0] },
          email: { $arrayElemAt: ["$userDetails.email", 0] },
          _id: 0,
        },
      },
    ]),
  ]);

  // Build the response object
  const generalStats = {
    users: {
      totalCount: totalUsersCount,
      averageAge: averageUserAge[0]?.averageAge || 0,
    },
    platform: {
      totalBookingsAllTime,
      totalInquiriesAllTime,
    },
    userActivity: {
      mostActiveUsers,
    },
  };

  res.status(200).json(generalStats);
});

/**
 * Helper to resolve a period string into { from, to } dates.
 * Supported: last_7d, last_30d, last_90d, this_month, last_month, all_time
 */
function resolvePeriod(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "last_7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { from, to: today };
    }
    case "last_30d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return { from, to: today };
    }
    case "last_90d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 90);
      return { from, to: today };
    }
    case "this_month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: today };
    }
    case "last_month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to };
    }
    case "all_time":
    default: {
      const from = new Date(0); // epoch
      return { from, to: today };
    }
  }
}

//@desc gets dashboard-style metrics (time-filtered + snapshots)
//@param valid admin jwt token
//@route Get /admin/statistics/dashboard
//@access Private(admin)
const getDashboardMetrics = asyncHandler(async (req, res) => {
  const period = req.query.period || "last_30d";
  const { from, to } = resolvePeriod(period);

  const now = new Date();

  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const sevenDaysAhead = new Date(now);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

  const [
    // time-filtered metrics
    sessionsCompleted,
    newUsers,
    cancellations,
    profitForPeriod,
    inquiriesInPeriod,

    // snapshot metrics
    upcomingSessionsNext7d,
    unpaidSessionsAgg,
    activeClientsAgg,
    recurringClientsCount,
  ] = await Promise.all([
    // Completed sessions in selected period
    Booking.countDocuments({
      status: "Completed",
      eventStartTime: { $gte: from.getTime(), $lt: to.getTime() },
    }),

    // New users in selected period
    User.countDocuments({
      createdAt: { $gte: from, $lt: to },
    }),

    // Cancellations in selected period
    Booking.countDocuments({
      status: "Cancelled",
      createdAt: { $gte: from, $lt: to },
    }),

    // Profit in selected period (convert USD to PKR using stored exchange rates)
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lt: to },
          transactionStatus: "Completed",
        },
      },
      {
        $project: {
          netAmountInPKR: {
            $cond: {
              if: { $eq: ["$currency", "USD"] },
              then: { $multiply: ["$netAmountReceived", "$exchangeRate"] },
              else: "$netAmountReceived",
            },
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$netAmountInPKR" } } },
    ]),

    // Inquiries in selected period (no status field, so just total)
    Inquiry.countDocuments({
      createdAt: { $gte: from, $lt: to },
    }),

    // Upcoming sessions next 7 days
    Booking.countDocuments({
      status: "Active",
      eventStartTime: {
        $gte: now.getTime(),
        $lt: sevenDaysAhead.getTime(),
      },
    }),

    // Unpaid sessions snapshot:
    // Completed bookings whose payment is missing or not "Completed"
    Booking.aggregate([
      {
        $match: {
          status: "Completed",
        },
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
        $unwind: {
          path: "$payment",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { payment: { $exists: false } },
            { "payment.transactionStatus": { $ne: "Completed" } },
          ],
        },
      },
      {
        $count: "count",
      },
    ]),

    // Active clients last 60 days: distinct userIds with a completed session
    Booking.aggregate([
      {
        $match: {
          status: "Completed",
          eventStartTime: {
            $gte: sixtyDaysAgo.getTime(),
            $lt: now.getTime(),
          },
        },
      },
      {
        $group: {
          _id: "$userId",
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]),

    // Recurring clients: users whose recurring.state is active
    User.countDocuments({
      "recurring.state": true,
    }),
  ]);

  const estimatedRevenue = profitForPeriod[0]?.total || 0;

  const unpaidSessions =
    unpaidSessionsAgg && unpaidSessionsAgg[0]?.count
      ? unpaidSessionsAgg[0].count
      : 0;

  const activeClientsLast60d =
    activeClientsAgg && activeClientsAgg[0]?.count
      ? activeClientsAgg[0].count
      : 0;

  const response = {
    period: {
      key: period,
      from,
      to,
    },
    timeFiltered: {
      sessionsCompleted,
      newUsers,
      cancellations,
      estimatedRevenue,
      inquiries: inquiriesInPeriod,
    },
    snapshot: {
      upcomingSessionsNext7d,
      unpaidSessions,
      activeClientsLast60d,
      recurringClientsCount,
    },
  };

  res.status(200).json(response);
});

module.exports = {
  getGeneralMetrics,
  getDashboardMetrics,
};
