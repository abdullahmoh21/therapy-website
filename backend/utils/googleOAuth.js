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

    return credentials.access_token;
  } catch (error) {
    logger.error(`Failed to get valid access token: ${error.message}`);
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

    return true;
  } catch (error) {
    logger.error(`Google Calendar connection test failed: ${error.message}`);

    // If it's an auth error, clear the tokens
    if (error.code === 401 || error.message.includes("invalid_grant")) {
      logger.warn("Invalid tokens detected, clearing stored tokens");
      await clearTokens();
    }

    throw error;
  }
};

/**
 * Get connection status (lightweight - no API calls)
 */
const getConnectionStatus = async () => {
  try {
    const refreshToken = await Config.getValue("googleRefreshToken");
    const accessToken = await Config.getValue("googleAccessToken");
    const tokenExpiry = await Config.getValue("googleTokenExpiry");
    const userEmail = await Config.getValue("googleUserEmail");

    if (!refreshToken) {
      return {
        connected: false,
        message: "No Google Calendar connection found",
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

module.exports = {
  createOAuth2Client,
  getValidAccessToken,
  saveTokens,
  clearTokens,
  hasValidTokens,
  testConnection,
  getConnectionStatus,
};
