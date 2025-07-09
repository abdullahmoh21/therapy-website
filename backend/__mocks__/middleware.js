// Mock middleware
const verifyJWT = jest.fn().mockImplementation((req, res, next) => {
  req.user = { id: "userId123", email: "test@example.com", role: "user" };
  next();
});

const redisCaching = jest
  .fn()
  .mockImplementation(() => (req, res, next) => next());
const invalidateByEvent = jest.fn().mockResolvedValue(true);

module.exports = {
  verifyJWT,
  redisCaching,
  invalidateByEvent,
};
