/**
 * Google OAuth Refresh Token Generator
 *
 * This script helps you generate a new refresh token for Google Calendar API.
 * Run with: node generateRefreshToken.js
 */

const { google } = require("googleapis");
const http = require("http");
const url = require("url");
require("dotenv").config();

// Replace with your OAuth credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Define the scopes we need
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

// Generate the authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // This will return a refresh token
  scope: SCOPES,
  prompt: "consent", // Force to get refresh token
});

console.log("=== Google OAuth Refresh Token Generator ===");
console.log("\n1. Opening your browser to authorize the application...");
console.log(
  "2. Log in with the Google account you want to use for calendar events"
);
console.log("3. After authorization, you'll be redirected to localhost");
console.log("\nManually open this URL in your browser:", authUrl);
console.log("\nWaiting for authorization...");

// Create a simple server to receive the authorization code
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const { code } = parsedUrl.query;

    if (code) {
      console.log("\nAuthorization code received, exchanging for tokens...");

      // Exchange the authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      console.log("\n=== Your New Refresh Token ===");
      console.log("\nRefresh Token:");
      console.log(tokens.refresh_token);
      console.log("\n=== Instructions ===");
      console.log("1. Copy the refresh token above");
      console.log("2. Update your .env file with:");
      console.log("   GOOGLE_REFRESH_TOKEN=your_refresh_token");
      console.log("3. Restart your application");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <h1>Authentication Successful!</h1>
            <p>Your refresh token has been generated. You can see it in your terminal.</p>
            <p>You can close this window now.</p>
          </body>
        </html>
      `);

      // Close the server after a delay
      setTimeout(() => {
        server.close(() => {
          console.log(
            "\nServer closed. You can now update your environment variables."
          );
          process.exit(0);
        });
      }, 2000);
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("Authorization code not received");
    }
  } catch (error) {
    console.error("Error during token exchange:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Error during authentication");

    setTimeout(() => {
      server.close(() => process.exit(1));
    }, 2000);
  }
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log(
    "\nLocal server started at http://localhost:3000 to receive the authorization code"
  );
});
