// Using the 'mock' prefix to avoid Jest's variable scope limitations
const mockObjectId = () => {
  return {
    toString: () => "mockObjectId123",
    toHexString: () => "mockObjectId123",
  };
};

module.exports = {
  verifyJWT: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: mockObjectId(), email: "test@example.com", role: "user" };
    next();
  }),
  verifyAdmin: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: mockObjectId(), email: "test@example.com", role: "admin" };
    next();
  }),
};
