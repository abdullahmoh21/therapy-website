const mongoose = require("mongoose");
const logger = require("../logs/logger");
const { sendAdminAlert } = require("./emailTransporter");

// Connection retry configuration
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL = 5000; // 5 seconds
let retryCount = 0;
let mongoConnected = false;

// MongoDB connection event listeners
const setupMongoEventListeners = () => {
  // Successfully connected
  mongoose.connection.on("connected", async () => {
    logger.info("MongoDB connected");
    mongoConnected = true;
    retryCount = 0;

    // If we were previously disconnected, send reconnection alert
    if (global.wasMongoDisconnected) {
      try {
        await sendAdminAlert("mongoReconnected");
        global.wasMongoDisconnected = false;
      } catch (error) {
        logger.error(
          `Failed to send MongoDB reconnection alert: ${error.message}`
        );
      }
    }
  });

  // Connection error
  mongoose.connection.on("error", async (err) => {
    if (mongoConnected) {
      logger.error(`MongoDB connection error: ${err.message}`);
      mongoConnected = false;
      global.wasMongoDisconnected = true;

      try {
        await sendAdminAlert("mongoDisconnected", { error: err.message });
      } catch (alertError) {
        logger.error(
          `Failed to send MongoDB disconnection alert: ${alertError.message}`
        );
      }
    }
  });

  // Disconnected
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    mongoConnected = false;
  });

  // Handle application termination
  process.on("SIGINT", async () => {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (err) {
      logger.error(`Error closing MongoDB connection: ${err.message}`);
      process.exit(1);
    }
  });
};

// Main connection function
const connectDB = async () => {
  try {
    // Check if we're already connected
    if (mongoose.connection.readyState === 1) {
      logger.info("MongoDB already connected");
      return true;
    }

    // Set up MongoDB connection options
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    };

    // Setup event listeners if not already set
    if (!mongoose.connection.listenerCount("connected")) {
      setupMongoEventListeners();
    }

    // Try to connect to MongoDB
    const DATABASE_URI = process.env.MONGO_URI;
    if (!DATABASE_URI) {
      throw new Error(
        "MongoDB connection string not found in environment variables"
      );
    }

    await mongoose.connect(DATABASE_URI, options);
    return true;
  } catch (error) {
    mongoConnected = false;
    logger.error(`MongoDB connection error: ${error.message}`);

    // Provide more context for specific errors
    if (
      error.message.includes("ENOTFOUND") ||
      error.message.includes("ECONNREFUSED")
    ) {
      logger.error(
        "DNS resolution failed or server not reachable. Check your MongoDB connection string and network connectivity."
      );
    } else if (error.message.includes("Authentication failed")) {
      logger.error(
        "MongoDB authentication failed. Check your username/password credentials."
      );
    } else if (error.message.includes("timed out")) {
      logger.error(
        "MongoDB connection timed out. Check your network or firewall settings."
      );
    }

    // Send alert on first connection failure
    if (retryCount === 0) {
      try {
        global.wasMongoDisconnected = true;
        await sendAdminAlert("mongoDisconnected", { error: error.message });
      } catch (alertError) {
        logger.error(
          `Failed to send MongoDB disconnection alert: ${alertError.message}`
        );
      }
    }

    // Retry logic
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      retryCount++;
      logger.info(
        `Retrying MongoDB connection (${retryCount}/${MAX_RETRY_ATTEMPTS}) in ${
          RETRY_INTERVAL / 1000
        }s...`
      );

      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await connectDB();
          resolve(result);
        }, RETRY_INTERVAL);
      });
    } else {
      logger.error(
        `Failed to connect to MongoDB after ${MAX_RETRY_ATTEMPTS} attempts.`
      );
      return false;
    }
  }
};

module.exports = connectDB;
