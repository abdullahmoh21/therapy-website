module.exports = {
  sendEmail: jest.fn().mockImplementation((jobName, jobData) => {
    // Always return a successful promise for tests
    return Promise.resolve({ success: true });
  }),
  initializeQueue: jest.fn().mockResolvedValue(true),
  addJob: jest.fn().mockResolvedValue({ success: true }),
  fallbackExecute: jest.fn().mockResolvedValue({ success: true }),
};
