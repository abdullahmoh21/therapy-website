const axios = require("axios");
const logger = require("../logs/logger");
const { sendAdminAlert } = require("./emailTransporter");

// Global availability flag
global.calendlyAvailable = false;

// Configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_INTERVAL = 5000; // 5 seconds

// Retry counter
let retryCount = 0;

const getApiPrefixedUrl = (originalUrlString) => {
  if (!originalUrlString) {
    logger.warn("CALENDLY_WEBHOOK_URL is not set. Cannot prefix with /api.");
    return originalUrlString;
  }
  try {
    const url = new URL(originalUrlString);
    let path = url.pathname;

    // If path already starts with /api/, return original string to preserve it exactly
    if (path.startsWith("/api/")) {
      return originalUrlString;
    }

    // Normalize path to always start with a single slash
    path = path.startsWith("/") ? path : "/" + path;
    path = path.replace(/^\/+/, "/"); // Consolidate multiple leading slashes

    if (path === "/") {
      // Original path was just "/" or empty
      url.pathname = "/api";
    } else {
      url.pathname = "/api" + path; // path already starts with a single slash here
    }
    return url.toString();
  } catch (error) {
    logger.error(
      `Invalid CALENDLY_WEBHOOK_URL format: ${originalUrlString}. Error: ${error.message}`
    );
    return originalUrlString; // Fallback to original URL on parsing error
  }
};

const manageWebhookSubscription = async () => {
  try {
    let webhookSubscriptions = await fetchWebhookSubscriptions();

    // If there's exactly one subscription and it matches the desired configuration, do nothing
    if (webhookSubscriptions.length === 1) {
      const webhook = await getWebhook(webhookSubscriptions[0].uri);
      if (webhook && isWebhookConfigCorrect(webhook)) {
        logger.info(`Webhook subscription is active. No changes made.`);
        global.calendlyAvailable = true;
        return true;
      }
    }
    // If there's more than one subscription or the existing one doesn't match, delete all and create a new one
    await deleteAllWebhookSubscriptions(webhookSubscriptions);
    const result = await createWebhookSubscription();
    global.calendlyAvailable = result;
    return result;
  } catch (error) {
    global.calendlyAvailable = false;
    logger.error(
      "[ERROR] An error occurred connecting to calendly:",
      error.message || error.data || error
    );
    return false;
  }
};

// Main connection function with retries
const connectCalendly = async () => {
  // Initialize global availability flag if not defined
  if (global.calendlyAvailable === undefined) {
    global.calendlyAvailable = false;
  }

  try {
    // Directly call the webhook management function
    const result = await manageWebhookSubscription();
    if (result) {
      logger.info("Successfully connected to Calendly webhook");
    }
    return result;
  } catch (error) {
    global.calendlyAvailable = false;
    logger.error(
      `Calendly webhook connection error: ${error.message || error}`
    );

    // Send alert on first connection failure
    if (retryCount === 0) {
      try {
        await sendAdminAlert("calendlyDisconnected", {
          error: error.message || "Unknown error",
        });
      } catch (alertError) {
        logger.error(`Failed to send Calendly alert: ${alertError.message}`);
      }
    }

    // Retry logic
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryCount++;
      logger.info(
        `Retrying Calendly connection (${retryCount}/${MAX_RETRY_ATTEMPTS}) in ${
          RETRY_INTERVAL / 1000
        }s...`
      );

      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await connectCalendly();
          resolve(result);
        }, RETRY_INTERVAL);
      });
    } else {
      logger.error(
        `Failed to connect to Calendly after ${MAX_RETRY_ATTEMPTS} attempts.`
      );
      return false;
    }
  }
};

// Helper function to check if Calendly is available
const isCalendlyAvailable = () => {
  return global.calendlyAvailable === true;
};

const fetchWebhookSubscriptions = async () => {
  const options = {
    method: "GET",
    url: "https://api.calendly.com/webhook_subscriptions",
    params: {
      organization: process.env.CALENDLY_ORGANIZATION_URI,
      user: process.env.CALENDLY_USER_URI,
      scope: "user",
    },
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
    },
  };
  const response = await axios.request(options);
  return response.status === 200 ? response.data.collection : [];
};

const getWebhook = async (webhookUri) => {
  const response = await axios.get(webhookUri, {
    headers: { Authorization: `Bearer ${process.env.CALENDLY_API_KEY}` },
  });
  return response.data.resource;
};

const deleteAllWebhookSubscriptions = async (webhookSubscriptions) => {
  await Promise.all(
    webhookSubscriptions.map((subscription) =>
      axios.delete(subscription.uri, {
        headers: { Authorization: `Bearer ${process.env.CALENDLY_API_KEY}` },
      })
    )
  );
};

const createWebhookSubscription = async () => {
  const calendlyWebhookUrlFromEnv = process.env.CALENDLY_WEBHOOK_URL
    ? process.env.CALENDLY_WEBHOOK_URL.trim()
    : "";
  const targetWebhookUrl = getApiPrefixedUrl(calendlyWebhookUrlFromEnv);

  if (!targetWebhookUrl) {
    logger.error(
      "Cannot create Calendly webhook subscription: CALENDLY_WEBHOOK_URL is not configured or is invalid after prefixing."
    );
    return false;
  }

  const webhookData = {
    url: targetWebhookUrl,
    events: ["invitee.created", "invitee.canceled"],
    organization: process.env.CALENDLY_ORGANIZATION_URI,
    user: process.env.CALENDLY_USER_URI,
    scope: "user",
  };

  try {
    const response = await axios.post(
      "https://api.calendly.com/webhook_subscriptions",
      webhookData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
        },
      }
    );
    return response.status === 201;
  } catch (error) {
    logger.error(`Failed to create webhook subscription: ${error.message}`);
    return false;
  }
};

function isWebhookConfigCorrect(webhook) {
  const calendlyWebhookUrlFromEnv = process.env.CALENDLY_WEBHOOK_URL
    ? process.env.CALENDLY_WEBHOOK_URL.trim()
    : "";
  const expectedWebhookUrl = getApiPrefixedUrl(calendlyWebhookUrlFromEnv);

  if (!expectedWebhookUrl) {
    logger.warn(
      "Cannot verify Calendly webhook: CALENDLY_WEBHOOK_URL is not configured or is invalid after prefixing."
    );
    return false;
  }

  return (
    webhook.callback_url.trim() === expectedWebhookUrl &&
    arraysEqual(webhook.events, ["invitee.created", "invitee.canceled"]) &&
    webhook.organization.trim() ===
      process.env.CALENDLY_ORGANIZATION_URI.trim() &&
    webhook.user.trim() === process.env.CALENDLY_USER_URI.trim() &&
    webhook.scope === "user" &&
    webhook.state === "active"
  );
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const cleanA = a.map((item) => item.trim().toLowerCase());
  const cleanB = b.map((item) => item.trim().toLowerCase());
  return (
    new Set(cleanA).size === new Set(cleanB).size &&
    cleanA.every((value) => cleanB.includes(value))
  );
}

module.exports = connectCalendly;
module.exports.isCalendlyAvailable = isCalendlyAvailable;
