const redisClient = require("../utils/redisClient");
const logger = require("../logs/logger");
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const zlib = require("zlib");
const inflateAsync = promisify(zlib.inflate);
const deflateAsync = promisify(zlib.deflate);

/* 
    Endpoints that will be cached:
    -  GET  /users              (getMyData)
    -  GET  /bookings/calendly  (getNewBookingLink) 
    -  GET  /bookings           (getMyBookings)
    -  GET  /payments           (getMyPayments)
  
    Invalidation scenarios:
    - User updates their profile
    - Admin deletes a user
    - Calendly webhook triggers a new booking,cancellation or reschedule
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
    try {
      const invalidationFilePath = path.join(__dirname, '../utils/invalidationRequests.bin');
      const buffer = Buffer.from(keyName + '\0', 'utf8'); // Null-terminated string
      fs.appendFileSync(invalidationFilePath, buffer);
      logger.info(`Appended ${keyName} to invalidationRequests.bin`);
    } catch (fileError) {
      logger.error(`Failed to append ${keyName} to invalidationRequests.bin`, fileError);
    }
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
async function addToCache(keyName, data, options = { EX: 21600 }) {
  // Even if Redis is down, we still send the response. Client will retry periodically. If Redis comes back up, response will be cached.
  let dataString;

  // Sometimes response sent using res.send() is already a valid JSON string so we need to make sure we dont double stringify it
  if (typeof data === 'string' && isValidJsonString(data)) {
    dataString = data;
  } else {
    // Otherwise, stringify the data
    dataString = JSON.stringify(data);
  }

  try {
    const buffer = await deflateAsync(dataString);
    const compressedData = buffer.toString('base64');
    await redisClient.set(keyName, compressedData, 'EX', options.EX);
    logger.info(`Compressed data added to cache for key: ${keyName}`);
  } catch (error) {
    logger.error(`Failed to compress data for key=${keyName}`, error);
  }
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
          keyBase = `payments:${userId}`;
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
    return new Error("Redis is not working, cannot retrieve cache."); 
  }

  try {
    const cachedValue = await redisClient.get(key);
    if (cachedValue) {
      const buffer = await inflateAsync(Buffer.from(cachedValue, "base64"));
      let data = buffer.toString();

      try {
        let parsedData = JSON.parse(data);
        // Check if the parsedData is still a string and parse it again if necessary
        if (typeof parsedData === 'string') {
          parsedData = JSON.parse(parsedData);
          logger.debug(`Double-parsed cache data for key=${key} with type ${typeof parsedData}: ${JSON.stringify(parsedData, null, 2)}`);
        }
        logger.debug(`Cache data retrieved for key=${key} with type ${typeof parsedData}:\n ${JSON.stringify(parsedData, null, 2)}\n`);
        return parsedData; // Return parsed JSON data
      } catch (err) {
        logger.error(`Error parsing JSON for key=${key}: ${err.message}`);
        return data; // Return as-is if not JSON
      }
    }
  } catch (err) {
    logger.error(`Error retrieving or decompressing cache for key=${key}: ${err.message}`);
  }

  // catch-all return
  return null; 
}



// Middleware to cache responses with cache refreshing logic
function redisCaching(options = { EX: 21600 }) {
  return async (req, res, next) => {
    if (req.method !== "GET" ) {
      return next();
    }
    const key = generateKey(req);
    try { 
      //attempt to retrieve from cache
      const cachedValue = await getFromCache(key);  
      if (cachedValue) {
        logger.debug(`Cache hit for key: ${key}`);
        // Reset the TTL for the cache entry
        await redisClient.expire(key, options.EX);
        res.send(cachedValue);
      } else {                                      
        logger.debug(`Cache miss for key: ${key}`); 
        //if miss then cache the response
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

//Helper functions for JSON parsing
function isValidJsonString(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { redisCaching, addToCache, invalidateCache, getFromCache };
