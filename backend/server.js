require("dotenv").config();
console.log("NODE_ENV from top of server.js:", process.env.NODE_ENV);
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorHandler");
const credentials = require("./middleware/credentials");
const conditionalRateLimiter = require("./middleware/rateLimiting/generalRateLimit");
const checkBlocked = require("./middleware/rateLimiting/checkBlocked");
const dependencyGuard = require("./middleware/dependencyGuard");
const { connectDB, isMongoAvailable } = require("./utils/connectDB");
const { redisCacheClient, redisQueueClient } = require("./utils/redisClient");
const {
  initializeQueue,
  sendEmail,
  shutdownQueue,
} = require("./utils/queue/index");
const connectCalendly = require("./utils/connectCalendly");
const startUpdateBookingStatusCron = require("./utils/cron/UpdateBookingStatus");
const startClearLogFilesCron = require("./utils/cron/ClearLogFiles");
const Config = require("./models/Config");
const logger = require("./logs/logger");

const PORT = process.env.PORT || 3200;
let server;

// --- Bootstrap sequence ---
async function bootstrap() {
  const dbOk = await connectDB();
  if (!dbOk) {
    logger.error("Could not connect to MongoDB — aborting startup.");
    process.exit(1);
  }

  try {
    calendlyOk = await connectCalendly();
    if (!calendlyOk)
      throw new Error("A webhook with calendly could not be established");
    if (process.env.NODE_ENV == "production") {
      // TODO: move back in
    }
  } catch (err) {
    logger.error("Could not connect to Calendly — aborting startup.");
    if (process.env.NODE_ENV === "production") {
      await sendEmail("adminAlert", {
        alertType: "calendlyWebhookDown",
      }).catch(() => {});
    }
    process.exit(1);
  }

  try {
    await redisCacheClient.connect();
    logger.info("Redis Cache connected");
  } catch (err) {
    logger.warn(`Redis Cache unavailable — caching disabled: ${err.message}`);
    if (process.env.NODE_ENV === "production") {
      await sendEmail("adminAlert", {
        alertType: "redisCacheDisconnectedInitial",
      }).catch(() => {});
    }
  }

  try {
    await redisQueueClient.connect();
    logger.info("Redis Queue connected");
  } catch (err) {
    logger.warn(
      `Redis Queue unavailable — jobs will be MongoDB-only: ${err.message}`
    );
    if (process.env.NODE_ENV === "production") {
      await sendEmail("adminAlert", {
        alertType: "redisQueueDisconnectedInitial",
      }).catch(() => {});
    }
  }

  try {
    await Config.initializeConfig();
  } catch (err) {
    logger.error(`Config init failed, using defaults: ${err.message}`);
  }

  initializeQueue();

  startUpdateBookingStatusCron();
  startClearLogFilesCron();

  server = app.listen(PORT, "0.0.0.0", () => {
    logger.success(`Server listening on port ${PORT}`);
  });

  server.on("error", async (error) => {
    logger.error(`Server error: ${error.message}`);
    if (process.env.NODE_ENV === "production") {
      await sendEmail("adminAlert", {
        alertType: "serverError",
        extraData: { error: error.message },
      }).catch(() => {});
    }
  });
}

// --- Express setup (no I/O here) ---
const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://www.google-analytics.com"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://www.google-analytics.com"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(credentials);
app.use(cors(require("./config/corsOptions").corsOptions));
app.use(checkBlocked);
app.use(conditionalRateLimiter);
app.use(dependencyGuard);

// Routes
app.use("/api/auth", require("./endpoints/authEndpoints"));
app.use("/api/user", require("./endpoints/userEndpoints"));
app.use("/api/bookings", require("./endpoints/bookingEndpoints"));
app.use("/api/payments", require("./endpoints/paymentEndpoints"));
app.use("/api/admin", require("./endpoints/adminEndpoints"));
app.use(
  "/api/admin/google-calendar",
  require("./endpoints/googleCalendarEndpoints")
);
app.use("/api/contactMe", require("./endpoints/contactMeEndpoints"));
app.use("/api/config", require("./endpoints/configEndpoints"));

// Global error handler
app.use(errorHandler);

// Graceful shutdown
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down…`);

  // Shutdown queue system (stops promoter and closes Redis queue)
  try {
    await shutdownQueue();
  } catch (err) {
    logger.error(`Error shutting down queue: ${err.message}`);
  }

  // Close Redis connections
  if (redisCacheClient && redisCacheClient.status === "ready") {
    await redisCacheClient.quit().catch(() => {});
  }
  if (redisQueueClient && redisQueueClient.status === "ready") {
    await redisQueueClient.quit().catch(() => {});
  }

  if (server) {
    server.close(() => {
      logger.info("Shutdown complete.");
      process.exit(0);
    });
  }
  setTimeout(() => {
    logger.error("Force exit after timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

bootstrap();
