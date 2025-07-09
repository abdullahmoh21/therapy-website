const {
  setupApp,
  setupDatabase,
  bcrypt,
  invalidateByEvent,
  User,
} = require("./testSetup");
const request = require("supertest");

describe("Auth Login Endpoint", () => {
  const app = setupApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;

  // Spin up the in-memory MongoDB once for the suite
  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  // Tear it down when all tests finish
  afterAll(async () => {
    await closeDB();
  });

  // Reset DB and Jest mocks between cases
  afterEach(async () => {
    await clearCollections();
    jest.restoreAllMocks();
  });

  describe("POST /auth (Login)", () => {
    const baseUser = {
      email: "test@example.com",
      password: "hashed_testPassword123", // stored hash; we stub compare()
      name: "Test User",
      role: "user",
      accountType: "domestic",
    };

    it("logs in successfully with valid credentials", async () => {
      await User.create({ ...baseUser, emailVerified: { state: true } });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app).post("/auth").send({
        email: "test@example.com",
        password: "testPassword123",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(invalidateByEvent).toHaveBeenCalled();
    });

    it("returns 401 with non-existent email", async () => {
      const res = await request(app).post("/auth").send({
        email: "nonexistent@example.com",
        password: "testPassword123",
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 401 with wrong password", async () => {
      await User.create({ ...baseUser, emailVerified: { state: true } });
      bcrypt.compare.mockResolvedValueOnce(false);

      const res = await request(app).post("/auth").send({
        email: "test@example.com",
        password: "wrongPassword",
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 401 when email is not verified", async () => {
      await User.create({ ...baseUser, emailVerified: { state: false } });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app).post("/auth").send({
        email: "test@example.com",
        password: "testPassword123",
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for Joi validation errors", async () => {
      const res = await request(app).post("/auth").send({
        email: "test@example.com", // missing password
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
