const Redis = require('ioredis');

const redisClient = new Redis(); // Default connects to 127.0.0.1:6379

module.exports = redisClient;