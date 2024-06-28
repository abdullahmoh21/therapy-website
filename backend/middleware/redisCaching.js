const redisClient = require("../utils/redisClient");
const zlib = require("zlib");
const logger = require("../logs/logger");

/* Endpoints that will be cached:
    GET     /users              (getMyData)
    GET     /bookings/calendly  (getNewBookingLink) //invalidate when new booking is created
    GET     /bookings           (getMyBookings)
    GET     /payments           (getMyPayments)
*/
/* Invalidation scenarios:
    - User updates their profile(as well as pwd change)
    - User verifies their email
    - User creates a payment
    - User logs out (delete session cache)
    - Admin deletes a user
    - Calendly webhook triggers a new booking,canelation or reschedule
    - Safepay webhook triggers a new payment, refund or an error
*/

async function invalidateCache(keyPattern) {
  if (isRedisWorking()) {
    // Fetch all keys matching the pattern
    const keys = await redisClient.keys(keyPattern);
    if (keys.length > 0) {
      // Delete all keys found
      const deletePromises = keys.map(key => redisClient.del(key));
      await Promise.all(deletePromises);
      logger.info(`Cache invalidated for keys matching pattern: ${keyPattern}`);
    } else {
      logger.info(`No keys found for pattern: ${keyPattern}`);
    }
  } else {
    logger.error("Redis is not working, cannot invalidate cache.");
  }
}



function requestToKey(req) {
    const { userId } = req; // From verifyJWT middleware
    let keyBase;
    const pathArray = req.originalUrl.split('/').filter(Boolean); // Remove empty strings from path
    // logger.debug(`In redisCaching userId: ${userId} Path array: ${pathArray}`);
    // logger.debug(`_id: ${userId}`)
    // logger.debug(`Path: ${req.originalUrl}`)
    if (pathArray.length > 0) {
      switch (pathArray[0]) {
        case 'bookings':
          keyBase = `booking:${userId}`;
          break;
        case 'users':
          keyBase = `user:${userId}`;
          break;
        case 'payments':
          keyBase = `payment:${userId}`;
          break;
        default:
          keyBase = `genericData:${pathArray[0]}`; // Fallback for other endpoints
      }
    } else {
      keyBase = 'unknownEndpoint';
    }
  
    return keyBase;
}

function isRedisWorking() {
  return redisClient.status === "ready";
}

async function writeData(key, data, options, compress) {
  if (isRedisWorking()) {
    let dataToCache = data;
    if (compress) {
      dataToCache = zlib.deflateSync(data).toString("base64");
    }

    try {
      // Assuming options is an object like { EX: 21600 }
      // Convert options object to an array of arguments if needed
      const optionsArgs = Object.entries(options).flat();
      await redisClient.set(key, dataToCache, ...optionsArgs);
    } catch (e) {
      console.error(`Failed to cache data for key=${key}`, e);
    }
  }
}

async function readData(key, compressed) {
  let cachedValue = undefined;
  if (isRedisWorking()) {
    // Try to get the cached response from Redis
    cachedValue = await redisClient.get(key);
    if (cachedValue && compressed) {
      // Decompress the cached value with ZLIB
      return zlib.inflateSync(Buffer.from(cachedValue, "base64")).toString();
    }
  }

  return cachedValue;
}

function redisCaching(options = { EX: 21600 }, compression = true) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET" ) {
        return next();
    }

    if (isRedisWorking()) {
      const key = requestToKey(req);
      const cachedValue = await readData(key, compression);
      if (cachedValue) {
        try {
          return res.json(JSON.parse(cachedValue));
        } catch {
          return res.send(cachedValue);
        }
      } else {
        const oldSend = res.send;
        res.send = async function (data) {
          res.send = oldSend;
          if (res.statusCode.toString().startsWith("2")) {
            await writeData(key, data, options, compression);
          }
          return res.send(data);
        };
        next();
      }
    } else {
      next();
    }
  };
}

module.exports = { redisCaching, invalidateCache } ;