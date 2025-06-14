// Import specialized controller modules
const userController = require("./adminControllers/adminUserController");
const invitationController = require("./adminControllers/adminInvitationController");
const bookingController = require("./adminControllers/adminBookingController");
const paymentController = require("./adminControllers/adminPaymentController");
const metricsController = require("./adminControllers/adminMetricsController");
const systemController = require("./adminControllers/adminSystemController");

module.exports = {
  // User controller functions
  getAllUsers: userController.getAllUsers,
  deleteUser: userController.deleteUser,
  updateUser: userController.updateUser,
  getUserDetails: userController.getUserDetails,

  // Invitation controller functions
  inviteUser: invitationController.inviteUser,
  getAllInvitations: invitationController.getAllInvitations,
  deleteInvitation: invitationController.deleteInvitation,
  resendInvitation: invitationController.resendInvitation,

  // Booking controller functions
  getAllBookings: bookingController.getAllBookings,
  getBookingTimeline: bookingController.getBookingTimeline,
  updateBooking: bookingController.updateBooking,
  deleteBooking: bookingController.deleteBooking,
  getBookingDetails: bookingController.getBookingDetails,

  // Payment controller functions
  getAllPayments: paymentController.getAllPayments,
  markAsPaid: paymentController.markAsPaid,

  // Metrics controller functions
  getGeneralMetrics: metricsController.getGeneralMetrics,
  getMonthlyMetrics: metricsController.getMonthlyMetrics,
  getYearlyMetrics: metricsController.getYearlyMetrics,

  // System controller functions
  getSystemHealth: systemController.getSystemHealth,
  updateConfig: systemController.updateConfig,
};
