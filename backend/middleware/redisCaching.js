const redisClient = require("../utils/redisClient");
const { promisify } = require('util');
const zlib = require("zlib");
const inflateAsync = promisify(zlib.inflate);
const logger = require("../logs/logger");

/* 
    Endpoints that will be cached:
    -  GET  /users              (getMyData)
    -  GET  /bookings/calendly  (getNewBookingLink) 
    -  GET  /bookings           (getMyBookings)
    -  GET  /payments           (getMyPayments)
  
    Invalidation scenarios:
    - User updates their profile
    - Admin deletes a user
    - Calendly webhook triggers a new booking,canelation or reschedule
    - Safepay webhook triggers a change in payment status. 
*/

// Check if Redis is working
function isRedisWorking() {
  return redisClient.status === "ready";
}
// Invalidate cache for a given key
async function invalidateCache(keyName) {
  if (!isRedisWorking()) {
    logger.error("Redis is not working, cannot invalidate cache.");
    return false;
  }

  try {
    await redisClient.del(keyName);
    logger.info(`Cache invalidated for key: ${keyName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to invalidate cache for key: ${keyName}`, error);
    return false;
  }
}

// Add data to cache
function addToCache(keyName, data, options = { EX: 21600 }) {
  if (!isRedisWorking()) {
    logger.error("Redis is not working, cannot add to cache.");
    return;
  }

  const dataString = JSON.stringify(data);
  zlib.deflate(dataString, (err, buffer) => {
    if (err) {
      logger.error(`Failed to compress data for key=${keyName}`, err);
      return;
    }
    const compressedData = buffer.toString('base64');
    redisClient.set(keyName, compressedData, 'EX', options.EX)
      .then(() => {
        logger.info(`Compressed data added to cache for key: ${keyName}`);
      })
      .catch((error) => {
        logger.error(`Failed to add data to cache for key=${keyName}`, error);
      });
  });
}

// Generate a key based on the request. same input generates the same key
function generateKey(req) {
    const { userId } = req;
    let keyBase;
    const pathArray = req.originalUrl.split('/').filter(Boolean);

    if (pathArray.length > 0) {
        if (pathArray[0] === 'bookings') {
            if (pathArray.length > 1 && pathArray[1] === 'calendly') {
                keyBase = `bookingLink:${userId}`;
            } else {
                keyBase = `bookings:${userId}`; // Modified as per requirement
            }
        } else {
            switch (pathArray[0]) {
                case 'users':
                    keyBase = `user:${userId}`;
                    break;
                case 'payments':
                    keyBase = `payment:${userId}`;
                    break;
                default:
                    keyBase = `genericData:${pathArray[0]}`;
            }
        }
    } else {
        keyBase = 'unknownEndpoint';
    }
    return keyBase;
}

// Retrieve data from cache, parse if JSON, otherwise return as-is
async function getFromCache(key) {
  if (!isRedisWorking()) {
    logger.error("Redis is not working, cannot get from cache.");
    return null; 
  }

  try {
    const cachedValue = await redisClient.get(key);
    if (cachedValue) {
      const buffer = await inflateAsync(Buffer.from(cachedValue, "base64"));
      const data = buffer.toString();
      try {
        return JSON.parse(data); // Attempt to parse as JSON
      } catch (err) {
        return data; // Return as-is if not JSON
      }
    }
  } catch (err) {
    logger.error(`Error retrieving or decompressing cache for key=${key}`, err);
  }

  return null; // Return null in case of any failure
}

// Middleware to cache responses
function redisCaching(options = { EX: 21600 }) {
  return async (req, res, next) => {
    if (req.method !== "GET" || !isRedisWorking()) {
      return next();
    }

    const key = generateKey(req);
    logger.debug(`Checking cache for key: ${key}`);

    try {
      const cachedValue = await getFromCache(key);
      if (cachedValue) {
        logger.debug(`Cache hit for key: ${key} value: ${cachedValue}`);
        res.send(cachedValue);
      } else {
        logger.debug(`Cache miss for key: ${key}`);
        const oldSend = res.send;
        res.send = async function (data) {
          res.send = oldSend; // Restore original res.send immediately
          if (res.statusCode.toString().startsWith("2")) {
            await addToCache(key, data, options); // Perform caching asynchronously
          }
          oldSend.call(res, data); // Send the response using the original res.send
        };
        next();
      }
    } catch (error) {
      logger.error(`Error handling cache for key: ${key}`, error);
      next(); // Ensure request is not stalled due to cache failure
    }
  };
}

module.exports = { redisCaching, addToCache, invalidateCache, getFromCache };