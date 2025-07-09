module.exports = {
  buildWorker: jest.fn().mockResolvedValue({
    on: jest.fn(),
  }),
};
