require("dotenv").config();
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
const { redisClient } = require("./utils/redisClient");
const { initializeQueue } = require("./utils/myQueue");
const connectCalendly = require("./utils/connectCalendly");
const { sendAdminAlert } = require("./utils/emailTransporter");
const startUpdateBookingStatusCron = require("./utils/cron/UpdateBookingStatus");
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
    const calendlyOk = await connectCalendly();
    if (!calendlyOk) throw new Error("webhook not live");
  } catch (err) {
    logger.error("Could not connect to Calendly — aborting startup.");
    if (process.env.NODE_ENV === "production") {
      await sendAdminAlert("calendlyWebhookDown", { error: err.message }).catch(
        () => {}
      );
    }
    process.exit(1);
  }

  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn(
      `Redis unavailable — continuing in degraded mode: ${err.message}`
    );
    if (process.env.NODE_ENV === "production") {
      await sendAdminAlert("redisDisconnectedInitial").catch(() => {});
    }
  }

  try {
    await Config.initializeConfig();
  } catch (err) {
    logger.error(`Config init failed, using defaults: ${err.message}`);
  }

  initializeQueue();

  // Start cron jobs after database connection is established
  startUpdateBookingStatusCron();

  server = app.listen(PORT, "0.0.0.0", () => {
    logger.success(`Server listening on port ${PORT}`);
  });

  server.on("error", async (error) => {
    logger.error(`Server error: ${error.message}`);
    if (process.env.NODE_ENV === "production") {
      await sendAdminAlert("serverError", { error: error.message }).catch(
        () => {}
      );
    }
  });
}

// --- Express setup (no I/O here) ---
const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true, // keep Helmet’s sensible defaults for connectSrc, scriptSrc, etc.
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://www.google-analytics.com"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://www.google-analytics.com"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [], // force HTTPS for any subresources
      },
    },
  })
);

app.use(checkBlocked);
app.use(conditionalRateLimiter);
app.use(dependencyGuard);
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(credentials); // This MUST come before cors middleware
app.use(cors(require("./config/corsOptions")));

// Routes
app.use("/api/auth", require("./endpoints/authEndpoints"));
app.use("/api/user", require("./endpoints/userEndpoints"));
app.use("/api/bookings", require("./endpoints/bookingEndpoints"));
app.use("/api/payments", require("./endpoints/paymentEndpoints"));
app.use("/api/admin", require("./endpoints/adminEndpoints"));
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
  if (redisClient && redisClient.status === "ready") {
    await redisClient.quit().catch(() => {});
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
