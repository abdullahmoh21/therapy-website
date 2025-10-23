const { checkRedisQueueAvailability } = require("../redisClient");

async function getRedisConnection() {
  const redisAvailable = await checkRedisQueueAvailability();
  if (!redisAvailable) throw new Error("Redis Queue unavailable");

  return {
    host: process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || "localhost",
    port:
      process.env.REDIS_QUEUE_PORT ||
      (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) + 1 : 6380),
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    lazyConnect: false,
    retryDelayOnFailover: 100,
  };
}

module.exports = { getRedisConnection };
