module.exports = {
  sendEmail: jest.fn().mockResolvedValue(true),
  initializeQueue: jest.fn().mockResolvedValue(true),
};
