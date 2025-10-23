/**
 * Utility script to verify Google OAuth credentials and check token validity
 *
 * Run this script with: node utils/checkGoogleAuth.js
 */

const { google } = require("googleapis");
const { OAuth2 } = google.auth;

async function checkGoogleAuth() {
  console.log("=== Google OAuth Credential Check ===");

  try {
    // Check if required environment variables are set
    console.log("Checking environment variables...");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId) {
      console.error("❌ GOOGLE_CLIENT_ID is not set");
      return false;
    }

    if (!clientSecret) {
      console.error("❌ GOOGLE_CLIENT_SECRET is not set");
      return false;
    }

    if (!refreshToken) {
      console.error("❌ GOOGLE_REFRESH_TOKEN is not set");
      return false;
    }

    console.log("✅ All required environment variables are set");

    // Initialize OAuth client
    console.log("\nInitializing OAuth client...");
    const oauth2Client = new OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Try to get a new access token
    console.log("\nAttempting to get a new access token...");
    try {
      const accessToken = await oauth2Client.getAccessToken();
      console.log("✅ Successfully obtained new access token");
      console.log(`Token type: ${accessToken.token_type}`);
      console.log(`Expires in: ${accessToken.expiry_date - Date.now()}ms`);

      // Test with Calendar API
      console.log("\nTesting Calendar API access...");
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Get calendar list as test
      const response = await calendar.calendarList.list();
      console.log(`✅ Successfully accessed Calendar API`);
      console.log(`Found ${response.data.items.length} calendars`);

      console.log("\n=== Summary ===");
      console.log("✅ Your Google OAuth credentials are working correctly");
      console.log("✅ The refresh token is valid");
      console.log("✅ You have access to the Calendar API");

      return true;
    } catch (error) {
      console.error("\n❌ Failed to get access token:");
      console.error(`   Error: ${error.message}`);

      if (error.message === "invalid_grant") {
        console.error('\nThe "invalid_grant" error usually means:');
        console.error("1. Your refresh token has expired or been revoked");
        console.error("2. The client ID/secret don't match the refresh token");
        console.error("\nTo fix this:");
        console.error(
          "1. Generate a new refresh token in the Google Cloud Console"
        );
        console.error(
          "2. Update your GOOGLE_REFRESH_TOKEN environment variable"
        );
      }

      return false;
    }
  } catch (error) {
    console.error("\n❌ Unexpected error:");
    console.error(error);
    return false;
  }
}

// If this script is run directly
if (require.main === module) {
  // Load environment variables if needed
  try {
    require("dotenv").config();
  } catch (e) {
    console.log("dotenv not available, using existing environment variables");
  }

  checkGoogleAuth()
    .then((result) => {
      if (!result) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}

module.exports = { checkGoogleAuth };
