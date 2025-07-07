const Redis = require("ioredis");
const logger = require("../logs/logger");
const net = require("net");

let wasDisconnected = false;
let retryAttempts = 0;
let thresholdReached = false;

// Create a Redis client with connection and error handling
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true,
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
        import("./queue/myQueue.js")
          .then((queueModule) => {
            queueModule
              .sendEmail("adminAlert", {
                alertType: "redisDisconnectedInitial",
              })
              .catch((err) => {
                logger.error(
                  `Failed to send Redis connection alert: ${err.message}`
                );
              });
          })
          .catch((err) => {
            logger.error(`Failed to import queue module: ${err.message}`);
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
    if (process.env.NODE_ENV == "production") {
      import("./queue/myQueue.js")
        .then((queueModule) => {
          queueModule
            .sendEmail("adminAlert", { alertType: "redisReconnected" })
            .catch((err) => {
              logger.error(
                `Failed to send Redis reconnection alert: ${err.message}`
              );
            });
        })
        .catch((err) => {
          logger.error(`Failed to import queue module: ${err.message}`);
        });
    }
  }
});

redisClient.on("error", function (err) {
  if (!wasDisconnected) {
    logger.error(`Redis error: ${err.message}`);
    wasDisconnected = true;
    retryAttempts++;

    if (retryAttempts === 1) {
      // Send disconnection alert only on first error using dynamic import
      import("./queue/index.js")
        .then((queueModule) => {
          queueModule
            .sendEmail("adminAlert", {
              alertType: "redisDisconnected",
              extraData: { error: err.message },
            })
            .catch((alertErr) => {
              logger.error(
                `Failed to send Redis disconnection alert: ${alertErr.message}`
              );
            });
        })
        .catch((importErr) => {
          logger.error(`Failed to import queue module: ${importErr.message}`);
        });
    }
  }
});

redisClient.on("end", function () {
  logger.warn("Redis connection closed");
});

const checkRedisAvailability = () => {
  return new Promise((resolve) => {
    const client = net.createConnection({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    });

    client.setTimeout(1000);

    client.on("connect", () => {
      client.end();
      resolve(true);
    });

    client.on("timeout", () => {
      client.destroy();
      resolve(false);
    });

    client.on("error", () => {
      resolve(false);
    });
  });
};

module.exports = { redisClient, checkRedisAvailability };
