const { setupApp, setupDatabase, jwt, User } = require("./testSetup");
const request = require("supertest");

describe("Auth Logout Endpoint", () => {
  const app = setupApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;

  // Setup test database
  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await closeDB();
  });

  // Clean up collections before each test
  beforeEach(async () => {
    await clearCollections();
  });

  describe("POST /auth/logout", () => {
    it("should logout successfully with valid token", async () => {
      // Create test user
      const user = await User.create({
        email: "test@example.com",
        password: "hashed_password",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        refreshTokenHash: "hashed-value", // Will be reset on logout
        refreshTokenExp: Date.now() + 3600000,
      });

      // Mock jwt.verify to return user email
      jwt.verify.mockImplementationOnce(() => ({
        email: user.email,
      }));

      const res = await request(app)
        .post("/auth/logout")
        .set("Cookie", ["jwt=valid-token"]);

      expect(res.statusCode).toBe(204);

      // Verify cookie was cleared
      expect(res.headers["set-cookie"]).toBeDefined();

      // Verify user token was cleared in database
      const updatedUser = await User.findOne({ email: user.email });
      expect(updatedUser.refreshTokenHash).toBe("");
    });

    it("should return 204 with no token", async () => {
      const res = await request(app).post("/auth/logout");
      expect(res.statusCode).toBe(204);
    });

    it("should return 204 with invalid token", async () => {
      // Mock jwt.verify to throw an error
      jwt.verify.mockImplementationOnce(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .post("/auth/logout")
        .set("Cookie", ["jwt=invalid-token"]);

      expect(res.statusCode).toBe(204);
    });

    it("should return 204 when user not found", async () => {
      // Mock jwt.verify to return non-existent email
      jwt.verify.mockImplementationOnce(() => ({
        email: "nonexistent@example.com",
      }));

      const res = await request(app)
        .post("/auth/logout")
        .set("Cookie", ["jwt=valid-token"]);

      expect(res.statusCode).toBe(204);
    });
  });
});
