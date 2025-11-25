const {
  setupAuthApp,
  setupDatabase,
  jwt,
  bcrypt,
  User,
  mongoose,
} = require("../testSetup");
const request = require("supertest");

describe("Auth Refresh Token Endpoint", () => {
  const app = setupAuthApp();
  let mongoServer;

  // Setup test environment
  beforeAll(async () => {
    // Mock mongoose to avoid actual database operations
    jest.spyOn(mongoose, "connect").mockResolvedValue(true);

    // Mock the collections
    mongoose.connection = {
      readyState: 1,
      collections: {},
      modelNames: jest.fn().mockReturnValue([]),
      close: jest.fn().mockResolvedValue(true),
    };
  });

  // Clean up after all tests
  afterAll(async () => {
    jest.restoreAllMocks();
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /auth/refresh", () => {
    // In each test, use unique identifiers to avoid conflicts
    it("should return new access token with valid refresh token", async () => {
      // Use a unique ID for this test
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        email: `test-${Date.now()}@example.com`,
        role: "user",
        refreshTokenHash: "hashed-value", // Must match crypto mock's digest() return value
      };

      // Setup mock implementation - must support .lean().exec() chaining
      jest.spyOn(User, "findById").mockImplementation(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      }));

      // Mock jwt.verify to return user data
      jwt.verify.mockImplementationOnce(() => ({
        user: {
          id: mockUser._id.toString(),
          email: mockUser.email,
          role: mockUser.role,
        },
      }));

      // Mock bcrypt.compare to return true
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app)
        .get("/auth/refresh")
        .set("Cookie", ["jwt=valid-token"]);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
    });

    it("should return 401 with no refresh token", async () => {
      const res = await request(app).get("/auth/refresh");
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 with expired refresh token", async () => {
      // Test will use the expired token case from jwt mock
      const res = await request(app)
        .get("/auth/refresh")
        .set("Cookie", ["jwt=expired-token"]);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty("message", "Refresh token expired");
    });

    it("should return 403 when user not found for token", async () => {
      // Mock jwt.verify to return a valid user ID
      jwt.verify.mockImplementationOnce(() => ({
        user: {
          id: new mongoose.Types.ObjectId().toString(),
          email: "nonexistent@example.com",
          role: "user",
        },
      }));

      // Mock User.findById to return null (user not found) - must support .lean().exec() chaining
      jest.spyOn(User, "findById").mockImplementation(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      }));

      const res = await request(app)
        .get("/auth/refresh")
        .set("Cookie", ["jwt=valid-token"]);

      expect(res.statusCode).toBe(403);
    });

    it("should return 403 when token hash does not match", async () => {
      // Mock user with a specific token hash
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        email: "test@example.com",
        role: "user",
        refreshTokenHash: "different-hash", // Different from what our token will match
      };

      // Setup mock implementation - must support .lean().exec() chaining
      jest.spyOn(User, "findById").mockImplementation(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      }));

      // Mock jwt.verify to return user data
      jwt.verify.mockImplementationOnce(() => ({
        user: {
          id: mockUser._id.toString(),
          email: mockUser.email,
          role: mockUser.role,
        },
      }));

      // Mock bcrypt.compare to return false
      bcrypt.compare.mockResolvedValueOnce(false);

      const res = await request(app)
        .get("/auth/refresh")
        .set("Cookie", ["jwt=valid-token"]);

      expect(res.statusCode).toBe(403);
    });
  });
});
