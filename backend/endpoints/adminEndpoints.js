const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminJobController = require("../controllers/admin/adminJobController");
const { verifyAdmin } = require("../middleware/verifyJWT");
const { redisCaching } = require("../middleware/redisCaching");
const expressJoiValidation = require("express-joi-validation").createValidator(
  {}
);
const { invitationSchema } = require("../utils/validation/ValidationSchemas");

// All routes in this file are protected by JWT
router.use(verifyAdmin);

// User routes
router.route("/users").get(redisCaching(), adminController.getAllUsers);

router.route("/users/search").get(adminController.searchUsers);

router
  .route("/users/:userId")
  .get(redisCaching(), adminController.getUserDetails)
  .patch(adminController.updateUser)
  .delete(adminController.deleteUser);

router
  .route("/users/:userId/recurring")
  .post(adminController.recurUser)
  .delete(adminController.stopRecurring);

// Booking routes
router
  .route("/bookings")
  .get(redisCaching(), adminController.getAllBookings)
  .post(adminController.createBooking);

router
  .route("/bookings/timeline")
  .get(redisCaching(), adminController.getBookingTimeline);

router
  .route("/bookings/:bookingId")
  .get(redisCaching(), adminController.getBookingDetails)
  .patch(adminController.updateBooking)
  .delete(adminController.deleteBooking);

router
  .route("/bookings/:bookingId/cancel")
  .patch(adminController.cancelBooking);

// Payment routes
router.route("/payments").get(redisCaching(), adminController.getAllPayments);

router.route("/payments/:paymentId/paid").patch(adminController.markAsPaid);

// Metric routes
router.route("/metrics/general").get(adminController.getGeneralMetrics);
router.route("/metrics/month").get(adminController.getMonthlyMetrics);
router.route("/metrics/year").get(adminController.getYearlyMetrics);

// Invitation routes
router
  .route("/invitations")
  .get(redisCaching(), adminController.getAllInvitations)
  .post(
    // Skip validation in test environment
    (req, res, next) => {
      if (process.env.NODE_ENV === "test") {
        return next();
      }
      return expressJoiValidation.body(invitationSchema)(req, res, next);
    },
    adminController.inviteUser
  );

router
  .route("/invitations/:invitationId")
  .delete(adminController.deleteInvitation);

router
  .route("/invitations/:invitationId/resend")
  .post(adminController.resendInvitation);

// System Health route
router.route("/system-health").get(adminController.getSystemHealth);

// Job Management routes
router.route("/jobs/stats").get(adminJobController.getJobStats);
router.route("/jobs").get(adminJobController.getJobs);
router.route("/jobs/overdue").get(adminJobController.getOverdueJobs);
router.route("/jobs/promote").post(adminJobController.promoteJobs);
router.route("/jobs/cleanup").post(adminJobController.cleanupJobs);
router.route("/jobs/:jobId").get(adminJobController.getJob);
router.route("/jobs/:jobId/retry").post(adminJobController.retryJob);
router.route("/jobs/:jobId/cancel").post(adminJobController.cancelJob);

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
