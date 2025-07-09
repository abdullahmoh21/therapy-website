module.exports = {
  verifyJWT: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: "userId123", email: "test@example.com", role: "user" };
    next();
  }),
};
