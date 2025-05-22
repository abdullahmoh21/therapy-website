const redisClient = require("../utils/redisClient");
const logger = require("../logs/logger");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const inflateAsync = promisify(zlib.inflate);
const deflateAsync = promisify(zlib.deflate);
const crypto = require("crypto");

/* 
    Endpoints that will be cached:
    -  GET  /users              (getMyData)
    -  GET  /bookings           (getMyBookings)
    -  GET  /user/bookings      (getMyBookings)
  
    Invalidation scenarios:
    - User updates their profile
    - Admin deletes a user
    - Calendly webhook triggers a new booking,cancellation or reschedule
    - Safepay webhook triggers a change in payment status. 
*/

// Track Redis availability status to prevent repeated logs
let redisAvailable = null; // null means not checked yet
let lastRedisCheckTime = 0;
const REDIS_CHECK_INTERVAL = 60000; // Check at most once per minute

// Check if Redis is working
function isRedisWorking() {
  const now = Date.now();

  // Only check Redis status if we haven't checked recently or status is unknown
  if (
    redisAvailable === null ||
    now - lastRedisCheckTime > REDIS_CHECK_INTERVAL
  ) {
    lastRedisCheckTime = now;

    // Check Redis client status
    const isConnected =
      redisClient && redisClient.status === "ready" && !redisClient.connecting;

    // Only log when status changes to avoid spam
    if (redisAvailable !== isConnected) {
      if (isConnected) {
        logger.info("Redis is now available for caching");
      } else if (redisAvailable !== null) {
        // Only log if this is a change in status, not initial check
        logger.warn("Redis is unavailable, operating without caching");
      }
      redisAvailable = isConnected;
    }
  }

  return redisAvailable === true;
}

// Invalidate cache for a given key
async function invalidateCache(url, userId) {
  const keyName = generateKey(userId, url);
  if (!isRedisWorking()) {
    // Store invalidation request for future processing when Redis is back
    try {
      const invalidationFilePath = path.join(
        __dirname,
        "../utils/invalidationRequests.bin"
      );
      const buffer = Buffer.from(keyName + "\0", "utf8"); // Null-terminated
      fs.appendFileSync(invalidationFilePath, buffer);
    } catch (fileError) {
      logger.error(
        `Failed to append ${keyName} to invalidationRequests.bin: ${fileError.message}`
      );
    }
    return false;
  }

  try {
    await redisClient.del(keyName);
    return true;
  } catch (error) {
    logger.error(`Failed to invalidate cache for key: ${keyName}`, error);
    return false;
  }
}

// Add data to cache
async function addToCache(keyName, data, options = { EX: 21600 }) {
  if (!isRedisWorking()) {
    return; // Silently return without caching when Redis is unavailable
  }

  let dataString;

  if (typeof data === "string" && isValidJsonString(data)) {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  try {
    const buffer = await deflateAsync(dataString);
    const compressedData = buffer.toString("base64");
    await redisClient.set(keyName, compressedData, "EX", options.EX);
  } catch (error) {
    // Don't log every caching error to prevent log spam
    if (redisAvailable) {
      logger.error(
        `Failed to compress data for key=${keyName}: ${error.message}`
      );
      redisAvailable = false; // Mark Redis as unavailable to prevent further errors
    }
  }
}

// Generate a key based on the request
function generateKey(userId, fullPath) {
  const digest = crypto
    .createHash("md5")
    .update(`${userId}:${fullPath}`)
    .digest("hex");
  return `cache:${digest}`;
}

// Retrieve data from cache, parse if JSON, otherwise return as-is
async function getFromCache(key) {
  if (!isRedisWorking()) {
    return null; // Silently return null when Redis is unavailable
  }

  try {
    const cachedValue = await redisClient.get(key);
    if (cachedValue) {
      const buffer = await inflateAsync(Buffer.from(cachedValue, "base64"));
      let data = buffer.toString();

      try {
        let parsedData = JSON.parse(data);
        // Check if the parsedData is still a string and parse it again if necessary
        if (typeof parsedData === "string") {
          parsedData = JSON.parse(parsedData);
        }
        return parsedData; // Return parsed JSON data
      } catch (err) {
        logger.error(`Error parsing JSON for key=${key}: ${err.message}`);
        return data; // Return as-is if not JSON
      }
    }
  } catch (err) {
    // Only log if Redis was thought to be available
    if (redisAvailable) {
      logger.error(`Error retrieving cache for key=${key}: ${err.message}`);
      redisAvailable = false; // Mark Redis as unavailable
    }
  }

  return null;
}

// Middleware to cache responses with cache refreshing logic
function redisCaching(options = { EX: 21600 }) {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    // Skip caching logic entirely if Redis is known to be unavailable
    if (redisAvailable === false) {
      return next();
    }

    // Ensure req.user and req.user.id exist before trying to generate a key
    if (!req.user || !req.user.id) {
      return next();
    }

    const userId = req.user.id;
    let fullPath = req.originalUrl.split("?")[0];
    if (fullPath.length > 1 && fullPath.endsWith("/")) {
      fullPath = fullPath.slice(0, -1);
    }

    const key = generateKey(userId, fullPath);

    try {
      // Attempt to retrieve from cache
      const cachedValue = await getFromCache(key);
      if (cachedValue !== null) {
        if (isRedisWorking()) {
          await redisClient.expire(key, options.EX).catch(() => {}); // Ignore expire errors
        }
        return res.send(cachedValue);
      } else {
        const oldSend = res.send;
        res.send = async function (data) {
          res.send = oldSend;
          if (res.statusCode.toString().startsWith("2")) {
            await addToCache(key, data, options);
          }
          oldSend.call(res, data);
        };
        next();
      }
    } catch (error) {
      logger.error(`Error handling cache for key: ${key}`, error);
      next();
    }
  };
}

function isValidJsonString(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  redisCaching,
  addToCache,
  invalidateCache,
  getFromCache,
  isRedisWorking,
};
