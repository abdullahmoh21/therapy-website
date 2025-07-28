module.exports = {
  checkRedisAvailability: jest.fn().mockResolvedValue(true),
  client: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  },
};
