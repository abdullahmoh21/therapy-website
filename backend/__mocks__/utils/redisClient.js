const mockClient = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  call: jest.fn().mockResolvedValue("OK"), // For rate limiting
  on: jest.fn(),
  status: "ready",
};

module.exports = {
  checkRedisAvailability: jest.fn().mockResolvedValue(true),
  checkRedisCacheAvailability: jest.fn().mockResolvedValue(true),
  checkRedisQueueAvailability: jest.fn().mockResolvedValue(true),
  client: mockClient,
  redisClient: mockClient, // For backward compatibility (used by rate limiting)
  redisCacheClient: mockClient,
  redisQueueClient: mockClient,
};
