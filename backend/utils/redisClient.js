const Redis = require("ioredis");
const logger = require("../logs/logger");
const fs = require("fs");
const path = require("path");

let wasDisconnected = false;
let retryAttempts = 0;
let thresholdReached = false;

const syncPendingInvalidations = () => {
  const invalidationFilePath = path.join(
    __dirname,
    "../utils/invalidationRequests.bin"
  );

  if (fs.existsSync(invalidationFilePath)) {
    try {
      const data = fs.readFileSync(invalidationFilePath);
      const keys = data
        .toString("utf8")
        .split("\0")
        .filter((key) => key); // Split by null character and extract keys to remove
      if (keys.length > 0) {
        logger.info(
          `Processing ${keys.length} invalidation requests from invalidationRequests.bin`
        );
        Promise.all(keys.map((key) => redisClient.del(key)))
          .then(() => {
            fs.unlinkSync(invalidationFilePath); // Delete the file after processing
          })
          .catch((error) => {
            logger.error(
              `Error processing invalidation requests: ${error.message}`
            );
          });
      }
    } catch (error) {
      logger.error(`Error reading invalidation file: ${error.message}`);
    }
  }
};

// Create a Redis client with connection and error handling
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: function (times) {
    logger.info(`Redis connection attempt ${times + 1}`);

    // Only try to reconnect a certain number of times
    if (times >= 5) {
      if (!thresholdReached) {
        thresholdReached = true;
        logger.error(
          "Redis connection retry threshold reached after 5 attempts"
        );
        // Send alert using dynamic import to avoid circular dependency
        import("./emailTransporter.js")
          .then((emailTransporter) => {
            emailTransporter
              .sendAdminAlert("redisDisconnectedInitial")
              .catch((err) => {
                logger.error(
                  `Failed to send Redis connection alert: ${err.message}`
                );
              });
          })
          .catch((err) => {
            logger.error(`Failed to import emailTransporter: ${err.message}`);
          });
      }
      return false; // Stop retrying
    }

    // Exponential backoff strategy: 200ms, 400ms, 800ms, 1600ms, 3200ms
    return Math.min(times * 200, 3000);
  },
});

redisClient.on("ready", function () {
  logger.info("Redis connected");
  retryAttempts = 0;
  thresholdReached = false;

  if (wasDisconnected) {
    logger.info("Redis reconnected after disconnection");
    wasDisconnected = false;

    // Send reconnection alert using dynamic import
    import("./emailTransporter.js")
      .then((emailTransporter) => {
        emailTransporter.sendAdminAlert("redisReconnected").catch((err) => {
          logger.error(
            `Failed to send Redis reconnection alert: ${err.message}`
          );
        });
      })
      .catch((err) => {
        logger.error(`Failed to import emailTransporter: ${err.message}`);
      });

    // Process any pending cache invalidation requests
    syncPendingInvalidations();
  }
});

redisClient.on("error", function (err) {
  if (!wasDisconnected) {
    logger.error(`Redis error: ${err.message}`);
    wasDisconnected = true;
    retryAttempts++;

    if (retryAttempts === 1) {
      // Send disconnection alert only on first error using dynamic import
      import("./emailTransporter.js")
        .then((emailTransporter) => {
          emailTransporter
            .sendAdminAlert("redisDisconnected", { error: err.message })
            .catch((alertErr) => {
              logger.error(
                `Failed to send Redis disconnection alert: ${alertErr.message}`
              );
            });
        })
        .catch((importErr) => {
          logger.error(
            `Failed to import emailTransporter: ${importErr.message}`
          );
        });
    }
  }
});

redisClient.on("end", function () {
  logger.warn("Redis connection closed");
});

module.exports = redisClient;
