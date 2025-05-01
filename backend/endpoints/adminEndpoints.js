const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/verifyJWT");

// All routes in this file are protected by JWT
router.use(verifyAdmin);

// User routes - collection endpoints
router.route("/users").get(adminController.getAllUsers);

// User routes - document endpoints
router
  .route("/users/:userId")
  .patch(adminController.updateUser)
  .delete(adminController.deleteUser);

// Booking routes
router
  .route("/bookings")
  .get(adminController.getAllBookings)
  .patch(adminController.updateBooking)
  .delete(adminController.deleteBooking);

// Payment routes
router
  .route("/payments")
  .get(adminController.getAllPayments)
  .patch(adminController.updatePayment);

// Statistics routes
router.route("/statistics").get(adminController.getStatistics);

// Invitation routes
router.route("/invite").post(adminController.inviteUser);
router.route("/invitations").get(adminController.getAllInvitations);
router
  .route("/invitations/:invitationId")
  .delete(adminController.deleteInvitation);
router.route("/invite/:inviteId/resend").post(adminController.resendInvitation);

// System Health & Config routes
router.route("/system-health").get(adminController.getSystemHealth);
router.route("/config/:key").patch(adminController.updateConfig);

// TODO: broadcast email
// router.route("/broadcast").post(adminController.broadcast);

//formats any joi error into JSON for the client
router.use((err, req, res, next) => {
  if (err?.error?.isJoi) {
    return res.status(400).json({
      type: err.type,
      message: err.error.details[0].message,
      context: err.error.details[0].context,
    });
  } else {
    next(err);
  }
});

module.exports = router;
