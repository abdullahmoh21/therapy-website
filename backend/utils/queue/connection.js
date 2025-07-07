const { checkRedisAvailability } = require("../redisClient");

async function getRedisConnection() {
  const redisAvailable = await checkRedisAvailability();
  if (!redisAvailable) throw new Error("Redis unavailable");

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    lazyConnect: false,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1,
  };
}

module.exports = { getRedisConnection };
