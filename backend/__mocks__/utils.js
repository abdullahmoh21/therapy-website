// Mock email transporter
const transporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
};

// Mock logger
const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock queue utility
const queueUtils = {
  sendEmail: jest.fn().mockResolvedValue(true),
  initializeQueue: jest.fn().mockResolvedValue(true),
};

// Mock Redis client
const redisClient = {
  checkRedisAvailability: jest.fn().mockResolvedValue(true),
};

module.exports = {
  transporter,
  logger,
  queueUtils,
  redisClient,
};
