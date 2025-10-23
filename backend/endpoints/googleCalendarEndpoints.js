const express = require("express");
const router = express.Router();
const {
  getConnectionStatus,
  getAuthUrl,
  handleCallback,
  testConnection,
  disconnectCalendar,
} = require("../controllers/admin/googleCalendarController");
const { verifyAdmin } = require("../middleware/verifyJWT");

// Apply JWT verification and admin role check to all routes
router.use(verifyAdmin);

// @route   GET /admin/google-calendar/status
// @desc    Get Google Calendar connection status
// @access  Private (admin only)
router.get("/status", getConnectionStatus);

// @route   GET /admin/google-calendar/auth-url
// @desc    Get Google OAuth authorization URL
// @access  Private (admin only)
router.get("/auth-url", getAuthUrl);

// @route   POST /admin/google-calendar/callback
// @desc    Handle Google OAuth callback
// @access  Private (admin only)
router.post("/callback", handleCallback);

// @route   POST /admin/google-calendar/test
// @desc    Test Google Calendar connection
// @access  Private (admin only)
router.post("/test", testConnection);

// @route   POST /admin/google-calendar/disconnect
// @desc    Disconnect Google Calendar and clear tokens
// @access  Private (admin only)
router.post("/disconnect", disconnectCalendar);

module.exports = router;
