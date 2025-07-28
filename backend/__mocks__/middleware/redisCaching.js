module.exports = {
  redisCaching: jest.fn().mockImplementation(() => (req, res, next) => next()),
  invalidateByEvent: jest.fn().mockResolvedValue(true),
};
