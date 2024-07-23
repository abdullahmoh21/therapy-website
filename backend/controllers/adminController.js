const react = require('react');
const User = require('../models/User'); 
const Booking = require('../models/Booking'); 
const Payment = require('../models/Payment'); 
const ROLES_LIST = require('../config/roles_list');
const asyncHandler = require('express-async-handler');
const logger = require('../logs/logger');
const zlib = require('zlib');
const { promisify } = require('util');
const compress = promisify(zlib.gzip); // Promisify zlib.gzip for easier async usage

//@desc Get all users
//@param {Object} req with valid role
//@route GET /admin/users
//@access Private
const getAllUsers = asyncHandler(async (req, res) => {
    // Check if the user has the Admin role
    if (req.role !== ROLES_LIST.Admin) return res.sendStatus(401);

    // Retrieve pagination parameters from the query string
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page

    // Validate pagination parameters
    if (page < 1 || limit < 1|| limit > 40) {
        return res.status(400).json({ message: 'Page and limit must be positive integers and limit should not exceed 40'});
    }

    try {
        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;

        // Retrieve users with pagination
        const users = await User.find({})
            .select('email name phone DOB')
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();

        // Get the total number of documents for pagination info
        const totalUsers = await User.countDocuments();

        // Send paginated response
        res.status(200).json({
            page,
            limit,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            users
        });
    } catch (error) {
        // Handle any errors that occurred during the query
        res.status(500).json({ message: 'An error occurred while retrieving users', error });
    }
});


//@desc Delete a user
//@param {Object} req with valid role and email
//@route DELETE /admin/users
//@access Private
const deleteUser = asyncHandler(async (req, res) => {
    if (req.role !== ROLES_LIST.Admin) return res.sendStatus(401);
    const { userId } = req.body;

    try {
        const [bookings, payments, user] = await Promise.all([
            Bookings.deleteMany({userId}),
            Payments.deleteMany({userId}),
            User.deleteOne({_id: userId})
        ]);
        logger.debug(`User deletion count: ${user.deletedCount}\nBooking deleted count: ${bookings.deletedCount}\nPayment deleted count: ${payments.deletedCount}`);
        res.sendStatus(201);
    } catch (error) {
        logger.error(`Error deleting user: ${error}`);
        res.sendStatus(500).json({'message':'Error deleting user'});
    }
});


//@desc returns all bookings 
//@param valid admin jwt token
//@route GET /admin/bookings
//@access Private(admin)
const getAllBookings = asyncHandler(async (req, res) => {
    if (req?.role !== ROLES_LIST.Admin) return res.sendStatus(401);

    // Get pagination parameters from the query string
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 40) {
        return res.status(400).json({ message: 'Page and limit must be positive integers and limit should not exceed 40' });
    }

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Get the current timestamp
    const currentTimestamp = new Date().getTime();

    // Retrieve paginated bookings
    const bookings = await Booking.find({
        eventStartTime: { $gt: currentTimestamp }
    })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

    // Get the total number of bookings
    const totalBookings = await Booking.countDocuments({
        eventStartTime: { $gt: currentTimestamp }
    });

    if (bookings.length === 0) return res.status(204).end();

    // Log data for debugging purposes (optional)
    console.log(`ADMIN booking data sent: ${JSON.stringify(bookings, null, 2)}`);

    // Send paginated data along with metadata
    res.json({
        page,
        limit,
        totalBookings,
        totalPages: Math.ceil(totalBookings / limit),
        bookings
    });
});

//@desc returns all payments 
//@param valid admin jwt token
//@route GET /payments/admin
//@access Private(admin)
const getAllPayments = asyncHandler(async (req, res) => {
    if (req?.role !== ROLES_LIST.Admin) return res.sendStatus(401);

    // Get pagination parameters from the query string
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 40) {
        return res.status(400).json({ message: 'Page and limit must be positive integers and limit should not exceed 40' });
    }

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Retrieve paginated payments
    const payments = await Payment.find({})
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

    // Get the total number of payments
    const totalPayments = await Payment.countDocuments();

    if (payments.length === 0) return res.status(204).end();

    // Log data for debugging purposes (optional)
    console.log(`Admin payment data sent: ${JSON.stringify(payments, null, 2)}`);

    // Send paginated data along with metadata
    res.json({
        page,
        limit,
        totalPayments,
        totalPages: Math.ceil(totalPayments / limit),
        payments
    });
});

//@desc gets all statistics
//@param valid admin jwt token
//@route Get /admin/statistics
//@access Private(admin)
const getStatistics = asyncHandler(async (req, res) => {
    if (req?.role !== ROLES_LIST.Admin) {
        logger.error(`Unauthorized access to statistics\n user role: ${req?.role}\n required role: ${ROLES_LIST.Admin}`);
        return res.sendStatus(401);
    }

    const currentTimestamp = new Date();
    const sixMonthsAgo = new Date();
    const thirtyDaysAgo = new Date();
    sixMonthsAgo.setMonth(currentTimestamp.getMonth() - 6);
    thirtyDaysAgo.setDate(currentTimestamp.getDate() - 30);

    const [totalRevenue, totalProfit, totalUsers, totalBookings, totalBookingsLast30Days, newClients] = await Promise.all([
        Payment.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Payment.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: null, total: { $sum: '$netAmountReceived' } } }
        ]),
        User.countDocuments({}),
        Booking.countDocuments({ status: { $ne: 'Cancelled' } }),
        Booking.countDocuments({ eventStartTime: { $gte: thirtyDaysAgo.getTime() }, status: { $ne: 'Cancelled' } }),
        User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    const stats = {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalProfit: totalProfit[0]?.total || 0,
        totalUsers,
        totalBookings,
        totalBookingsLast30Days,
        newClients
    };

    res.status(200).json(stats);
});


//----------------------------------------- STATISTIC COLLECTION-----------------------------------------//

// Collects and stores monthly statistics in keyDB, After which we clean up the old data
const collectMonthlyStats = async () => {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Create an array of promises for all the necessary queries
    const promises = [
        // Total Revenue for the month
        Payment.aggregate([
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]),
        // Total Profit for the month
        Payment.aggregate([
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, totalProfit: { $sum: "$netAmountReceived" } } }
        ]),
        // Total New Users for the month
        User.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
        // Total New Bookings for the month
        Booking.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: 'Cancelled' } }),
        // Total Canceled Bookings for the month
        Booking.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: 'Cancelled' })
    ];

    // Await the results of all the promises
    const [
        totalRevenueResult,
        totalProfitResult,
        totalNewUsers,
        totalNewBookings,
        totalCanceledBookings
    ] = await Promise.all(promises);

    // Extract values from aggregation results
    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
    const totalProfit = totalProfitResult[0]?.totalProfit || 0;

    const stats = {
        totalRevenue,
        totalProfit,
        totalNewUsers,
        totalNewBookings,
        totalCanceledBookings
    };

    // Convert stats object to JSON string
    const statsJson = JSON.stringify(stats);


    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    await keyDB.hset('monthlyStats', monthKey, statsJson);

    // Call cleanup function to manage retention
    await cleanOldStats();

    return stats; // Return JSON data for immediate use
};

// Function to clean up old stats beyond the retention period
const cleanOldStats = async () => {
    const currentDate = new Date();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Retention period of 6 months

    const keys = await keyDB.hkeys('monthlyStats');
    const oldKeys = keys.filter(key => {
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month - 1);
        return date < cutoffDate;
    });

    if (oldKeys.length > 0) {
        await keyDB.hdel('monthlyStats', ...oldKeys);
    }
};






module.exports = {
    getAllUsers,
    deleteUser,
    getAllBookings,
    getAllPayments,
    getStatistics
};