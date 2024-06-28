const RedisServer = require('redis-server');

const server = new RedisServer(6379);

server.open((err) => {
  if (err === null) {
    console.log('Redis server started on port 6379');
  }
});