const mockClient = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  on: jest.fn(),
  status: "ready",
};

module.exports = {
  checkRedisAvailability: jest.fn().mockResolvedValue(true),
  client: mockClient,
  redisCacheClient: mockClient,
  redisQueueClient: mockClient,
};
