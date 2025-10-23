const Redis = require("ioredis");
const logger = require("../logs/logger");
const net = require("net");

// Separate connection tracking for cache and queue
let cacheWasDisconnected = false;
let queueWasDisconnected = false;
let cacheRetryAttempts = 0;
let queueRetryAttempts = 0;
let cacheThresholdReached = false;
let queueThresholdReached = false;

/**
 * Redis Cache Client - For caching middleware
 * Uses REDIS_CACHE_HOST and REDIS_CACHE_PORT
 */
const redisCacheClient = new Redis({
  host: process.env.REDIS_CACHE_HOST || process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_CACHE_PORT || process.env.REDIS_PORT || 6379,
  lazyConnect: true,
  retryStrategy: function (times) {
    logger.info(`Redis Cache connection attempt ${times + 1}`);

    if (times >= 5) {
      if (!cacheThresholdReached) {
        cacheThresholdReached = true;
        logger.error(
          "Redis Cache connection retry threshold reached after 5 attempts"
        );
      }
      return false;
    }

    return Math.min(times * 200, 3000);
  },
});

redisCacheClient.on("ready", function () {
  logger.info("Redis Cache connected");
  cacheRetryAttempts = 0;
  cacheThresholdReached = false;

  if (cacheWasDisconnected) {
    logger.info("Redis Cache reconnected after disconnection");
    cacheWasDisconnected = false;
  }
});

redisCacheClient.on("error", function (err) {
  if (!cacheWasDisconnected) {
    logger.error(`Redis Cache error: ${err.message}`);
    cacheWasDisconnected = true;
    cacheRetryAttempts++;
  }
});

redisCacheClient.on("end", function () {
  logger.warn("Redis Cache connection closed");
});

/**
 * Redis Queue Client - For BullMQ job queues
 * Uses REDIS_QUEUE_HOST and REDIS_QUEUE_PORT
 */
const redisQueueClient = new Redis({
  host: process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || "localhost",
  port:
    process.env.REDIS_QUEUE_PORT ||
    (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) + 1 : 6380),
  lazyConnect: true,
  retryStrategy: function (times) {
    logger.info(`Redis Queue connection attempt ${times + 1}`);

    if (times >= 5) {
      if (!queueThresholdReached) {
        queueThresholdReached = true;
        logger.error(
          "Redis Queue connection retry threshold reached after 5 attempts"
        );
      }
      return false;
    }

    return Math.min(times * 200, 3000);
  },
});

redisQueueClient.on("ready", function () {
  logger.info("Redis Queue connected");
  queueRetryAttempts = 0;
  queueThresholdReached = false;

  if (queueWasDisconnected) {
    logger.info("Redis Queue reconnected after disconnection");
    queueWasDisconnected = false;
  }
});

redisQueueClient.on("error", function (err) {
  if (!queueWasDisconnected) {
    logger.error(`Redis Queue error: ${err.message}`);
    queueWasDisconnected = true;
    queueRetryAttempts++;
  }
});

redisQueueClient.on("end", function () {
  logger.warn("Redis Queue connection closed");
});

/**
 * Check Redis availability using TCP connection
 */
const checkRedisAvailability = (host, port) => {
  return new Promise((resolve) => {
    const client = net.createConnection({ host, port });
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

/**
 * Check cache Redis availability
 */
const checkRedisCacheAvailability = () => {
  const host =
    process.env.REDIS_CACHE_HOST || process.env.REDIS_HOST || "localhost";
  const port = process.env.REDIS_CACHE_PORT || process.env.REDIS_PORT || 6379;
  return checkRedisAvailability(host, port);
};

/**
 * Check queue Redis availability
 */
const checkRedisQueueAvailability = () => {
  const host =
    process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || "localhost";
  const port =
    process.env.REDIS_QUEUE_PORT ||
    (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) + 1 : 6380);
  return checkRedisAvailability(host, port);
};

// For backward compatibility, export the cache client as default
const redisClient = redisCacheClient;

module.exports = {
  // Primary exports
  redisCacheClient,
  redisQueueClient,

  // Backward compatibility
  redisClient,

  // Availability checks
  checkRedisAvailability: checkRedisCacheAvailability, // Default to cache for backward compatibility
  checkRedisCacheAvailability,
  checkRedisQueueAvailability,
};
