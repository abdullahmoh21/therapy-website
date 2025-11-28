const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const Config = require("../models/Config");
const logger = require("../logs/logger");

/**
 * Create and configure OAuth2 client with tokens from Config model
 */
const createOAuth2Client = async () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Google OAuth credentials not configured in environment variables"
    );
  }

  if (!process.env.FRONTEND_URL) {
    throw new Error(
      "FRONTEND_URL environment variable is required for OAuth redirect"
    );
  }

  const redirectUri = `${process.env.FRONTEND_URL}/admin/google-calendar-callback`;
  logger.debug(`Using OAuth redirect URI: ${redirectUri}`);

  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // Get tokens from Config model
  const refreshToken = await Config.getValue("googleRefreshToken");
  const accessToken = await Config.getValue("googleAccessToken");
  const tokenExpiry = await Config.getValue("googleTokenExpiry");

  if (refreshToken) {
    const credentials = {
      refresh_token: refreshToken,
    };

    if (accessToken && tokenExpiry) {
      credentials.access_token = accessToken;
      credentials.expiry_date = tokenExpiry;
    }

    oauth2Client.setCredentials(credentials);

    // Set up automatic token refresh and saving
    oauth2Client.on("tokens", async (tokens) => {
      try {
        logger.debug("Google OAuth tokens refreshed automatically");

        if (tokens.access_token) {
          await Config.setValue("googleAccessToken", tokens.access_token);
        }

        if (tokens.expiry_date) {
          await Config.setValue("googleTokenExpiry", tokens.expiry_date);
        }

        // Only update refresh token if a new one is provided
        if (tokens.refresh_token) {
          await Config.setValue("googleRefreshToken", tokens.refresh_token);
        }

        logger.info("Google OAuth tokens updated in Config model");
      } catch (error) {
        logger.error(
          `Failed to save refreshed Google tokens: ${error.message}`
        );
      }
    });
  }

  return oauth2Client;
};

/**
 * Get or refresh access token from Config model
 */
const getValidAccessToken = async () => {
  try {
    const oauth2Client = await createOAuth2Client();

    const refreshToken = await Config.getValue("googleRefreshToken");
    if (!refreshToken) {
      throw new Error("No Google refresh token available");
    }

    // Try to get a fresh access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Save the new tokens
    if (credentials.access_token) {
      await Config.setValue("googleAccessToken", credentials.access_token);
    }

    if (credentials.expiry_date) {
      await Config.setValue("googleTokenExpiry", credentials.expiry_date);
    }

    // Clear invalidation flag on successful refresh
    await Config.setValue("googleTokenInvalidated", "false");

    return credentials.access_token;
  } catch (error) {
    logger.error(`Failed to get valid access token: ${error.message}`);

    // If it's an auth error, mark tokens as invalidated
    if (error.code === 401 || error.message.includes("invalid_grant")) {
      logger.warn("Refresh token is invalid, marking as invalidated");
      await Config.setValue("googleTokenInvalidated", "true");
    }

    throw error;
  }
};

/**
 * Save new OAuth tokens to Config model
 */
const saveTokens = async (tokens, userEmail = null) => {
  try {
    const updates = [];

    if (tokens.access_token) {
      updates.push(Config.setValue("googleAccessToken", tokens.access_token));
    }

    if (tokens.refresh_token) {
      updates.push(Config.setValue("googleRefreshToken", tokens.refresh_token));
    }

    if (tokens.expiry_date) {
      updates.push(Config.setValue("googleTokenExpiry", tokens.expiry_date));
    }

    if (userEmail) {
      updates.push(Config.setValue("googleUserEmail", userEmail));
    }

    // Clear invalidation flag when new tokens are saved
    updates.push(Config.setValue("googleTokenInvalidated", "false"));

    await Promise.all(updates);
    logger.info("Google OAuth tokens saved to Config model");

    return true;
  } catch (error) {
    logger.error(`Failed to save Google tokens: ${error.message}`);
    throw error;
  }
};

/**
 * Clear all Google OAuth tokens from Config model
 */
const clearTokens = async () => {
  try {
    await Promise.all([
      Config.setValue("googleAccessToken", null),
      Config.setValue("googleRefreshToken", null),
      Config.setValue("googleTokenExpiry", null),
      Config.setValue("googleUserEmail", null),
      Config.setValue("googleTokenInvalidated", "false"),
      Config.setValue("googleSystemCalendarId", null),
    ]);

    logger.info("Google OAuth tokens cleared from Config model");
    return true;
  } catch (error) {
    logger.error(`Failed to clear Google tokens: ${error.message}`);
    throw error;
  }
};

/**
 * Check if valid Google tokens exist
 */
const hasValidTokens = async () => {
  try {
    const refreshToken = await Config.getValue("googleRefreshToken");
    return !!refreshToken;
  } catch (error) {
    logger.error(`Failed to check token validity: ${error.message}`);
    return false;
  }
};

/**
 * Test Google Calendar connection with current tokens
 */
const testConnection = async () => {
  try {
    const oauth2Client = await createOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Try to access the calendar list as a connection test
    await calendar.calendarList.list({ maxResults: 1 });

    // If test succeeds, ensure invalidation flag is cleared
    await Config.setValue("googleTokenInvalidated", "false");

    return true;
  } catch (error) {
    logger.error(`Google Calendar connection test failed: ${error.message}`);

    // If it's an auth error, mark tokens as invalidated
    if (error.code === 401 || error.message.includes("invalid_grant")) {
      logger.warn("Invalid tokens detected, marking as invalidated");
      await Config.setValue("googleTokenInvalidated", "true");
    }

    throw error;
  }
};

/**
 * Get connection status (lightweight - no API calls)
 * Note: This only checks if tokens exist, not if they're valid.
 * Use testConnection() to verify the tokens actually work.
 */
const getConnectionStatus = async () => {
  try {
    const refreshToken = await Config.getValue("googleRefreshToken");
    const accessToken = await Config.getValue("googleAccessToken");
    const tokenExpiry = await Config.getValue("googleTokenExpiry");
    const userEmail = await Config.getValue("googleUserEmail");
    const tokenInvalidated = await Config.getValue("googleTokenInvalidated");

    if (!refreshToken || tokenInvalidated === "true") {
      return {
        connected: false,
        message:
          tokenInvalidated === "true"
            ? "Google Calendar authentication expired - please reconnect"
            : "No Google Calendar connection found",
        needsAuth: true,
      };
    }

    // Check if access token is expired (with 5-minute buffer)
    const isTokenExpired =
      tokenExpiry && new Date() > new Date(tokenExpiry - 5 * 60 * 1000);

    return {
      connected: true,
      message: "Google Calendar is connected",
      needsAuth: false,
      userEmail,
      tokenInfo: {
        hasRefreshToken: !!refreshToken,
        hasAccessToken: !!accessToken,
        accessTokenExpiry: tokenExpiry,
        isTokenExpired,
      },
    };
  } catch (error) {
    logger.error(`Error checking Google Calendar status: ${error.message}`);
    return {
      connected: false,
      message: "Error checking Google Calendar connection",
      error: error.message,
    };
  }
};

/**
 * Get or create the system calendar for therapy bookings
 * This function is idempotent - it will:
 * 1. Try to fetch the calendar ID from Config
 * 2. Verify the calendar still exists in Google
 * 3. If not found, create a new calendar
 * 4. Fallback to "primary" if creation fails
 *
 * @returns {Promise<string>} Calendar ID to use for events
 */
const getSystemCalendar = async () => {
  const CALENDAR_NAME = "Therapy Sessions - Booking System";
  const CALENDAR_DESCRIPTION =
    "Automated calendar for managing therapy sessions. Please do not add or remove bookings from this calender. All changes should be made via https://fatimanaqvi.com";
  const CALENDAR_TIMEZONE = "Asia/Karachi";

  try {
    const oauth2Client = await createOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    let storedCalendarId = await Config.getValue("googleSystemCalendarId");

    if (storedCalendarId) {
      try {
        await calendar.calendars.get({ calendarId: storedCalendarId });
        logger.debug(`System calendar found: ${storedCalendarId}`);
        return storedCalendarId;
      } catch (error) {
        if (error.code === 404) {
          logger.warn(
            `Stored calendar ${storedCalendarId} no longer exists, will create new one`
          );
          storedCalendarId = null; // Clear it so we create a new one
        } else {
          throw error; // Re-throw other errors
        }
      }
    }

    logger.info("Creating new system calendar for therapy bookings");
    try {
      const response = await calendar.calendars.insert({
        requestBody: {
          summary: CALENDAR_NAME,
          description: CALENDAR_DESCRIPTION,
          timeZone: CALENDAR_TIMEZONE,
        },
      });

      const newCalendarId = response.data.id;
      logger.info(`Created new system calendar: ${newCalendarId}`);

      await Config.setValue("googleSystemCalendarId", newCalendarId);
      logger.debug("Saved new calendar ID to Config");

      return newCalendarId;
    } catch (createError) {
      logger.error(
        `Failed to create system calendar: ${createError.message}, falling back to primary`
      );
      logger.debug(`Error details: ${createError.stack}`);
      return "primary";
    }
  } catch (error) {
    logger.error(
      `Error in getSystemCalendar: ${error.message}, falling back to primary`
    );
    logger.debug(`Error details: ${error.stack}`);
    return "primary";
  }
};

module.exports = {
  createOAuth2Client,
  getValidAccessToken,
  saveTokens,
  clearTokens,
  hasValidTokens,
  testConnection,
  getConnectionStatus,
  getSystemCalendar,
};
