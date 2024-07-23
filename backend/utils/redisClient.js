const Redis = require('ioredis');
const logger = require('../logs/logger');
const { transporter, sendAdminAlert} = require('./emailTransporter');
const fs = require('fs');
const path = require('path');

let wasDisconnected = false;
let retryAttempts = 0;
let thresholdReached = false;

const syncPendingInvalidations = () => {
  const invalidationFilePath = path.join(__dirname, '../utils/invalidationRequests.bin');

  if (fs.existsSync(invalidationFilePath)) {
    try {
      const data = fs.readFileSync(invalidationFilePath);
      const keys = data.toString('utf8').split('\0').filter(key => key);  // Split by null character and extract keys to remove
      if (keys.length > 0) {
        logger.info(`Processing ${keys.length} invalidation requests from invalidationRequests.bin`);
        Promise.all(keys.map(key => redisClient.del(key)))
          .then(() => {
            fs.unlinkSync(invalidationFilePath); // Delete the file after processing
            logger.info(`Processed and removed invalidationRequests.bin`);
          })
          .catch(error => {
            logger.error(`Failed to process invalidation requests from invalidationRequests.bin`, error);
          });
      }
    } catch (error) {
      logger.error(`Failed to read invalidationRequests.bin`, error);
    }
  }
}

const redisClient = new Redis({
  port: 6379,
  host: 'localhost',
  password: process.env.KEYDB_PASSWORD,
  db: 0,
  maxRetriesPerRequest: null,
  retryStrategy: times => {
    
    if(times === 1) {
      wasDisconnected = true;
      sendAdminAlert('redisDisconnectedInitial');
    }

    if (thresholdReached) {
      const options = {times: ++retryAttempts};
      sendAdminAlert('redisThresholdReached',options);
      return 24 * 60 * 60 * 1000; // Retry once every 24 hours
    }

    // Stop exponential backoff after 24 hours
    if (retryAttempts * 100 >= (24 * 60 * 60 * 1000)) {
      sendAdminAlert('redisThresholdReached');
      thresholdReached = true;
      retryAttempts = 0;
    }
    // Retry with exponential backoff until 24 hours
    const delay = Math.min(2 ** times * 100, (24 * 60 * 60 * 1000) - (retryAttempts * 100));
    retryAttempts++;
    logger.warn(`[IOREDIS] Redis connection failed. Retrying in ${delay/1000}s. Attempt ${times}.`);
    return delay;
  }
});



redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('ready', () => {
  // Redis was disconnected and now reconnected
  if (wasDisconnected) {
    logger.info('Redis reconnected. Sending alert to admin...');
    sendAdminAlert('redisReconnected'); // Send alert when reconnecting after a disconnect
    wasDisconnected = false; 
  }
  // Process any pending invalidations to ensure cache consistency
  syncPendingInvalidations(); 
});

redisClient.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    logger.warn(`[IOREDIS] Could not connect to Redis. ECONNREFUSED`);
  } else if (err.name === 'MaxRetriesPerRequestError') {
    logger.error(`[IOREDIS] Critical Redis error: ${err.message}. Shutting down.`);
  } else {
    logger.error(`[IOREDIS] Redis encountered a different error: ${err.message}.`);
  }
});


module.exports = redisClient;
