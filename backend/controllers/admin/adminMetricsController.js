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

//@desc gets monthly statistics
//@param valid admin jwt token
//@route Get /admin/statistics/month
//@access Private(admin)
const getMonthlyMetrics = asyncHandler(async (req, res) => {
  const currentTimestamp = new Date();
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const [
    // Profit metrics - updated to handle multiple currencies
    totalProfitLastMonth,

    // User metrics
    newUsersLastMonth,

    // Booking metrics
    completedBookingsLastMonth,
    canceledBookingsLastMonth,

    // Meeting type breakdown
    onlineMeetingsCompletedLastMonth,
    inPersonMeetingsCompletedLastMonth,

    // Inquiry metrics
    totalInquiriesLastMonth,
    inquiriesByTypeLastMonth,
  ] = await Promise.all([
    // Profit for last month (convert USD to PKR using stored exchange rates)
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: lastMonth },
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

    // New users in last month
    User.countDocuments({ createdAt: { $gte: lastMonth } }),

    // Completed bookings in last month
    Booking.countDocuments({
      status: "Completed",
      eventStartTime: { $lte: currentTimestamp, $gte: lastMonth.getTime() },
    }),
    // Canceled bookings in last month
    Booking.countDocuments({
      status: "Cancelled",
      createdAt: { $gte: lastMonth },
    }),

    // Online meetings - completed in last month
    Booking.countDocuments({
      "location.type": "online",
      status: "Completed",
      eventStartTime: { $lte: currentTimestamp, $gte: lastMonth.getTime() },
    }),
    // In-person meetings - completed in last month
    Booking.countDocuments({
      "location.type": "in-person",
      status: "Completed",
      eventStartTime: { $lte: currentTimestamp, $gte: lastMonth.getTime() },
    }),

    // Inquiries in last month
    Inquiry.countDocuments({ createdAt: { $gte: lastMonth } }),
    // Inquiry types in last month
    Inquiry.aggregate([
      { $match: { createdAt: { $gte: lastMonth } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
  ]);

  // Calculate total bookings for last month
  const totalBookingsLastMonth = completedBookingsLastMonth;

  // Format inquiry types - limit to top 3
  const inquiryTypeDistributionLastMonth = {};
  inquiriesByTypeLastMonth
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .forEach((type) => {
      inquiryTypeDistributionLastMonth[type._id] = type.count;
    });

  // Calculate total meetings by type
  const onlineMeetingsLastMonth = onlineMeetingsCompletedLastMonth;
  const inPersonMeetingsLastMonth = inPersonMeetingsCompletedLastMonth;

  // Build the response object
  const monthlyStats = {
    period: {
      startDate: lastMonth,
      label: `${lastMonth.toLocaleString("default", {
        month: "long",
      })} ${lastMonth.getFullYear()}`,
    },
    profit: totalProfitLastMonth[0]?.total || 0,
    users: {
      new: newUsersLastMonth,
    },
    bookings: {
      completed: completedBookingsLastMonth,
      canceled: canceledBookingsLastMonth,
      total: totalBookingsLastMonth,
      meetingTypes: {
        online: onlineMeetingsLastMonth,
        inPerson: inPersonMeetingsLastMonth,
      },
    },
    inquiries: {
      total: totalInquiriesLastMonth,
      typeDistribution: inquiryTypeDistributionLastMonth,
    },
  };

  res.status(200).json(monthlyStats);
});

//@desc gets yearly statistics
//@param valid admin jwt token
//@route Get /admin/statistics/year
//@access Private(admin)
const getYearlyMetrics = asyncHandler(async (req, res) => {
  const currentTimestamp = new Date();
  const lastYear = new Date();
  lastYear.setMonth(0);
  lastYear.setDate(1);
  lastYear.setFullYear(lastYear.getFullYear() - 1);

  const [
    // Profit metrics - updated to handle multiple currencies
    totalProfitLastYear,

    // User metrics
    newUsersLastYear,

    // Booking metrics
    completedBookingsCount,
    canceledBookingsLastYear,

    // Meeting type breakdown
    onlineMeetingsCompleted,
    inPersonMeetingsCompleted,

    // Inquiry metrics
    totalInquiriesLastYear,
    inquiriesByTypeLastYear,

    // Monthly profit breakdown for the year - updated
    monthlyProfitBreakdown,
  ] = await Promise.all([
    // Profit for last year (convert USD to PKR using stored exchange rates)
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: lastYear },
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

    // New users in last year
    User.countDocuments({ createdAt: { $gte: lastYear } }),

    // Completed bookings
    Booking.countDocuments({
      status: "Completed",
      eventStartTime: { $lte: currentTimestamp }, // Completed = past events
    }),
    // Canceled bookings in last year
    Booking.countDocuments({
      status: "Cancelled",
      createdAt: { $gte: lastYear },
    }),

    // Online meetings - completed
    Booking.countDocuments({
      "location.type": "online",
      status: "Completed",
      eventStartTime: { $lte: currentTimestamp },
    }),
    // In-person meetings - completed
    Booking.countDocuments({
      "location.type": "in-person",
      status: "Completed",
      eventStartTime: { $lte: currentTimestamp },
    }),

    // Inquiries in last year
    Inquiry.countDocuments({ createdAt: { $gte: lastYear } }),
    // Inquiry types in last year
    Inquiry.aggregate([
      { $match: { createdAt: { $gte: lastYear } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),

    // Monthly profit breakdown for the year - updated
    Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: lastYear },
          transactionStatus: "Completed",
        },
      },
      {
        $project: {
          createdAt: 1,
          netAmountInPKR: {
            $cond: {
              if: { $eq: ["$currency", "USD"] },
              then: { $multiply: ["$netAmountReceived", "$exchangeRate"] },
              else: "$netAmountReceived",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          profit: { $sum: "$netAmountInPKR" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]),
  ]);

  // Calculate total bookings for last year
  const totalBookingsLastYear = completedBookingsCount;

  // Format inquiry types - limit to top 3
  const inquiryTypeDistributionLastYear = {};
  inquiriesByTypeLastYear
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .forEach((type) => {
      inquiryTypeDistributionLastYear[type._id] = type.count;
    });

  // Calculate total meetings by type
  const onlineMeetingsLastYear = onlineMeetingsCompleted;
  const inPersonMeetingsLastYear = inPersonMeetingsCompleted;

  // Format monthly profit breakdown
  const monthlyProfit = {};
  const profitData = [];
  const labels = [];

  monthlyProfitBreakdown.forEach((item) => {
    const monthName = new Date(
      item._id.year,
      item._id.month - 1,
      1
    ).toLocaleString("default", { month: "short" });

    monthlyProfit[monthName] = item.profit;
    labels.push(monthName);
    profitData.push(item.profit);
  });

  // Build the response object
  const yearlyStats = {
    period: {
      startDate: lastYear,
      endDate: new Date(),
      label: `${lastYear.getFullYear()} - ${new Date().getFullYear()}`,
    },
    profit: totalProfitLastYear[0]?.total || 0,
    profitChart: {
      labels,
      data: profitData,
    },
    users: {
      new: newUsersLastYear,
    },
    bookings: {
      completed: completedBookingsCount,
      canceled: canceledBookingsLastYear,
      total: totalBookingsLastYear,
      meetingTypes: {
        online: onlineMeetingsLastYear,
        inPerson: inPersonMeetingsLastYear,
      },
    },
    inquiries: {
      total: totalInquiriesLastYear,
      typeDistribution: inquiryTypeDistributionLastYear,
    },
    monthlyProfit,
  };

  res.status(200).json(yearlyStats);
});

module.exports = {
  getGeneralMetrics,
  getMonthlyMetrics,
  getYearlyMetrics,
};
