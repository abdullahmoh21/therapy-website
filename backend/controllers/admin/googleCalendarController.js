const { google } = require("googleapis");
const asyncHandler = require("express-async-handler");
const logger = require("../../logs/logger");
const {
  createOAuth2Client,
  saveTokens,
  clearTokens,
  getConnectionStatus: getOAuthStatus,
  testConnection: testOAuthConnection,
} = require("../../utils/googleOAuth");

/**
 * @desc Get Google Calendar connection status (lightweight, no API calls)
 * @route GET /admin/google-calendar/status
 * @access Private (admin only)
 */
const getConnectionStatus = asyncHandler(async (req, res) => {
  try {
    const status = await getOAuthStatus();
    logger.debug("Google Calendar connection status check completed");
    res.json(status);
  } catch (error) {
    logger.error(`Error checking Google Calendar status: ${error.message}`);
    res.status(500).json({
      connected: false,
      message: "Error checking Google Calendar connection",
      error: error.message,
    });
  }
});

/**
 * @desc Get Google OAuth authorization URL
 * @route GET /admin/google-calendar/auth-url
 * @access Private (admin only)
 */
const getAuthUrl = asyncHandler(async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        message: "Google OAuth credentials not configured",
        error:
          "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables",
      });
    }

    const oauth2Client = await createOAuth2Client();

    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Force consent screen to get refresh token
      include_granted_scopes: true,
    });

    logger.info("Generated Google Calendar auth URL");

    res.json({
      authUrl,
      message: "Redirect user to this URL for Google Calendar authorization",
    });
  } catch (error) {
    logger.error(`Error generating Google Calendar auth URL: ${error.message}`);
    res.status(500).json({
      message: "Error generating authorization URL",
      error: error.message,
    });
  }
});

/**
 * @desc Handle Google OAuth callback and exchange code for tokens
 * @route POST /admin/google-calendar/callback
 * @access Private (admin only)
 */
const handleCallback = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      message: "Authorization code is required",
    });
  }

  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        message: "Google OAuth credentials not configured",
        error:
          "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables",
      });
    }

    const oauth2Client = await createOAuth2Client();

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      logger.error("No refresh token received from Google");
      return res.status(400).json({
        message:
          "No refresh token received. Please ensure you granted all permissions and try again.",
        error: "missing_refresh_token",
      });
    }

    // Test the connection with the new tokens
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const calendarList = await calendar.calendarList.list({ maxResults: 1 });

    // Get user info to store email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Save tokens and user info to Config model
    await saveTokens(tokens, userInfo.data.email);

    logger.info(
      "Google Calendar successfully connected and tokens saved to Config model"
    );

    res.json({
      success: true,
      message:
        "Google Calendar connected successfully and tokens saved securely",
      connectionInfo: {
        connected: true,
        calendarsAccessible: calendarList.data.items?.length || 0,
        tokenExpiry: tokens.expiry_date,
      },
    });
  } catch (error) {
    logger.error(`Error handling Google Calendar callback: ${error.message}`);

    // If it's a token saving error, try to clear any partial tokens
    if (
      error.message.includes("Config") ||
      error.message.includes("database")
    ) {
      try {
        await clearTokens();
      } catch (clearError) {
        logger.error(
          `Failed to clear tokens after callback error: ${clearError.message}`
        );
      }
    }

    res.status(500).json({
      message: "Error processing Google Calendar authorization",
      error: error.message,
    });
  }
});

/**
 * @desc Test Google Calendar connection
 * @route POST /admin/google-calendar/test
 * @access Private (admin only)
 */
/**
 * @desc Minimal deep test for Google Calendar (single lightweight API call)
 * @route POST /admin/google-calendar/probe
 * @access Private (admin only)
 */
const testConnection = asyncHandler(async (req, res) => {
  try {
    await testOAuthConnection(); // This now marks tokens as invalidated on failure

    logger.info("Google Calendar probe successful");

    res.json({
      success: true,
      message: "Google Calendar connection test successful",
    });
  } catch (error) {
    logger.error(`Google Calendar probe failed: ${error.message}`);

    let statusCode = 500;
    let message = "Google Calendar probe failed";

    // Common auth/token issues
    if (
      error.code === 401 ||
      (typeof error.message === "string" &&
        error.message.includes("invalid_grant"))
    ) {
      statusCode = 401;
      message =
        "Google Calendar authentication failed. Please reconnect your account.";
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: error.message,
    });
  }
});

/**
 * @desc Disconnect Google Calendar (clear stored tokens)
 * @route POST /admin/google-calendar/disconnect
 * @access Private (admin only)
 */
const disconnectCalendar = asyncHandler(async (req, res) => {
  try {
    await clearTokens();
    logger.info(
      "Google Calendar disconnected - tokens cleared from Config model"
    );

    res.json({
      success: true,
      message: "Google Calendar disconnected successfully",
      connected: false,
    });
  } catch (error) {
    logger.error(`Error disconnecting Google Calendar: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error disconnecting Google Calendar",
      error: error.message,
    });
  }
});

module.exports = {
  getConnectionStatus,
  getAuthUrl,
  handleCallback,
  testConnection,
  disconnectCalendar,
};
