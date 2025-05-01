require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const https = require("https");
const mongoose = require("mongoose");
const helmet = require("helmet"); // Security middleware
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const credentials = require("./middleware/credentials");
const requireHttps = require("./middleware/requireHttps");
const compression = require("compression");
const connectDB = require("./utils/connectDB");
const connectCalendly = require("./utils/connectCalendly");
const conditionalRateLimiter = require("./middleware/rateLimiting/generalRateLimit");
const checkBlocked = require("./middleware/rateLimiting/checkBlocked");
const {
  deleteOldBookingsAndPayments,
} = require("./controllers/bookingController");
const cron = require("node-cron");
const logger = require("./logs/logger");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 3200;
const { queueWorker } = require("./utils/myQueue");
const Config = require("./models/Config"); // Import Config model
const { sendAdminAlert } = require("./utils/emailTransporter");

// Initialize global state
global.wasMongoDisconnected = false;

// SSL/TLS certificate options
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "/config/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "./config/cert.pem")),
};

// Start database connection
(async () => {
  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.error("Failed to connect to MongoDB. Application startup aborted.");
    process.exit(1);
  }
})();

// Security Headers
app.use(
  helmet.hsts({
    // HTTP Strict Transport Security (HSTS)
    maxAge: 15552000,
    includeSubDomains: true,
    preload: true,
  })
);

app.use(
  helmet.contentSecurityPolicy({
    // CSP configuration ere
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
    reportOnly: false,
  })
);

// for X-Forwarded-For header
app.set("trust proxy", 1);

//----------------- MIDDLEWARE ------------------//
app.use(checkBlocked); // exit if ip is blocked
app.use(conditionalRateLimiter); // Rate limit certain endpoints

// Only require HTTPS in production
if (process.env.NODE_ENV === "production") {
  app.use(requireHttps);
}

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(requestLogger);
app.use(credentials);
app.use(cors(corsOptions));
// ----------------------------------------------//

//----------------- ENDPOINTS------------------//
app.use("/auth", require("./endpoints/authEndpoints"));
app.use("/user", require("./endpoints/userEndpoints"));
app.use("/bookings", require("./endpoints/bookingEndpoints"));
app.use("/payments", require("./endpoints/paymentEndpoints"));
app.use("/admin", require("./endpoints/adminEndpoints"));
app.use("/contactMe", require("./endpoints/contactMeEndpoints"));
// app.use('/email', require('./endpoints/emailEndpoints.js'));
// ---------------------------------------------//

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// The "catchall" handler: for any request that doesn't match one above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
});

// Error handler
app.use(errorHandler);

// Will run every Sunday at 3:30 AM
cron.schedule("30 3 * * 0", () => {
  deleteOldBookingsAndPayments();
});

//------------------ SERVER STARTUP ------------------//
let server;

// Initialize the application server after DB connection
const initServer = async () => {
  try {
    // Try to initialize Config only when MongoDB is connected
    if (mongoose.connection.readyState === 1) {
      await Config.initializeConfig();
    }

    // Only proceed with Calendly connection if MongoDB is ready
    try {
      const webhookLive = await connectCalendly();
      if (webhookLive) {
        // Create HTTPS server
        server = https.createServer(sslOptions, app).listen(PORT, () => {
          logger.success(`Server running on port ${PORT} with HTTPS`);
        });
      } else {
        logger.error("Webhook is not live. Server startup aborted.");
        if (process.env.NODE_ENV === "production") {
          await sendAdminAlert("serverDown");
        }
      }
    } catch (error) {
      logger.error(
        "Failed to connect Calendly or check webhook status:",
        error
      );
      if (process.env.NODE_ENV === "production") {
        await sendAdminAlert("serverDown", { error: error.message });
      }
    }
  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`);
  }
};

// Listen for MongoDB connection
mongoose.connection.on("connected", async () => {
  // Initialize server when MongoDB connects
  await initServer();
});

//------------------ GRACEFUL SHUTDOWN ------------------//
let isShuttingDown = false;

process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received.");
  gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received.");
  gracefulShutdown("SIGINT");
});

const gracefulShutdown = (signal) => {
  if (isShuttingDown) {
    logger.info(
      `Already shutting down due to ${signal}, ignoring additional signal.`
    );
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully.`);

  closeQueue(signal)
    .then(() => {
      logger.info("BullMQ worker closed.");
      if (server) {
        server.close(() => {
          logger.info("Graceful shutdown complete.");
          process.exit(0);
        });
      } else {
        logger.info("Server was not initialized. Exiting process.");
        process.exit(0);
      }
    })
    .catch((error) => {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    });

  // Force shutdown after a timeout
  setTimeout(() => {
    logger.error("Forcing shutdown due to timeout.");
    process.exit(1);
  }, 10000); // 10 seconds
};

const closeQueue = async (signal) => {
  try {
    if (queueWorker) {
      await queueWorker.close();
    } else {
      logger.error("BullMQ worker is not defined.");
    }
  } catch (error) {
    logger.error(`Error closing BullMQ worker: ${error.message}`);
    throw error; // Propagate the error to be handled in the gracefulShutdown function
  }
};
