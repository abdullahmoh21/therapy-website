const Redis = require('ioredis');

process.env.DEBUG = 'ioredis:*';
const redisClient = new Redis({
  port: 6379,          
  host: '127.0.0.1',   
  password: process.env.KEYDB_PASSWORD, 
  db: 0, // Default DB index
});

module.exports = redisClient;