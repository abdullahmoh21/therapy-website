// Import specialized controller modules
const userController = require("./adminUserController");
const invitationController = require("./adminInvitationController");
const bookingController = require("./adminBookingController");
const paymentController = require("./adminPaymentController");
const metricsController = require("./adminMetricsController");
const systemController = require("./adminSystemController");

module.exports = {
  // User controller functions
  getAllUsers: userController.getAllUsers,
  deleteUser: userController.deleteUser,
  updateUser: userController.updateUser,

  // Invitation controller functions
  inviteUser: invitationController.inviteUser,
  getAllInvitations: invitationController.getAllInvitations,
  deleteInvitation: invitationController.deleteInvitation,
  resendInvitation: invitationController.resendInvitation,

  // Booking controller functions
  getAllBookings: bookingController.getAllBookings,
  updateBooking: bookingController.updateBooking,
  deleteBooking: bookingController.deleteBooking,

  // Payment controller functions
  getAllPayments: paymentController.getAllPayments,
  updatePayment: paymentController.updatePayment,
  markCashPaid: paymentController.markCashPaid,

  // Metrics controller functions
  getStatistics: metricsController.getStatistics,

  // System controller functions
  getSystemHealth: systemController.getSystemHealth,
  updateConfig: systemController.updateConfig,
};
