const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const asyncHandler = require("express-async-handler");

//@desc gets all statistics
//@param valid admin jwt token
//@route Get /admin/statistics
//@access Private(admin)
const getStatistics = asyncHandler(async (req, res) => {
  const currentTimestamp = new Date();
  const sixMonthsAgo = new Date();
  const thirtyDaysAgo = new Date();
  sixMonthsAgo.setMonth(currentTimestamp.getMonth() - 6);
  thirtyDaysAgo.setDate(currentTimestamp.getDate() - 30);

  const [
    totalRevenue,
    totalProfit,
    totalUsers,
    totalBookings,
    totalBookingsLast30Days,
    newClients,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: null, total: { $sum: "$netAmountReceived" } } },
    ]),
    User.countDocuments({}),
    Booking.countDocuments({ status: { $ne: "Cancelled" } }),
    Booking.countDocuments({
      eventStartTime: { $gte: thirtyDaysAgo.getTime() },
      status: { $ne: "Cancelled" },
    }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);

  const stats = {
    totalRevenue: totalRevenue[0]?.total || 0,
    totalProfit: totalProfit[0]?.total || 0,
    totalUsers,
    totalBookings,
    totalBookingsLast30Days,
    newClients,
  };

  res.status(200).json(stats);
});

//----------------------------------------- STATISTIC COLLECTION-----------------------------------------//

// Collects and stores monthly statistics in keyDB, After which we clean up the old data
const collectMonthlyStats = async () => {
  const currentDate = new Date();
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const endOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Create an array of promises for all the necessary queries
  const promises = [
    // Total Revenue for the month
    Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]),
    // Total Profit for the month
    Payment.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, totalProfit: { $sum: "$netAmountReceived" } } },
    ]),
    // Total New Users for the month
    User.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    }),
    // Total New Bookings for the month
    Booking.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $ne: "Cancelled" },
    }),
    // Total Canceled Bookings for the month
    Booking.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: "Cancelled",
    }),
  ];

  // Await the results of all the promises
  const [
    totalRevenueResult,
    totalProfitResult,
    totalNewUsers,
    totalNewBookings,
    totalCanceledBookings,
  ] = await Promise.all(promises);

  // Extract values from aggregation results
  const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
  const totalProfit = totalProfitResult[0]?.totalProfit || 0;

  const stats = {
    totalRevenue,
    totalProfit,
    totalNewUsers,
    totalNewBookings,
    totalCanceledBookings,
  };

  // Convert stats object to JSON string
  const statsJson = JSON.stringify(stats);

  const monthKey = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;
  await keyDB.hset("monthlyStats", monthKey, statsJson);

  // Call cleanup function to manage retention
  await cleanOldStats();

  return stats; // Return JSON data for immediate use
};

// Function to clean up old stats beyond the retention period
const cleanOldStats = async () => {
  const currentDate = new Date();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Retention period of 6 months

  const keys = await keyDB.hkeys("monthlyStats");
  const oldKeys = keys.filter((key) => {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1);
    return date < cutoffDate;
  });

  if (oldKeys.length > 0) {
    await keyDB.hdel("monthlyStats", ...oldKeys);
  }
};

// Need to import keyDB for statistics collection
const redisClient = require("../utils/redisClient");
const keyDB = redisClient;

module.exports = {
  getStatistics,
  collectMonthlyStats,
};
