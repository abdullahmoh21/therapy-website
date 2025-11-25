const {
  setupUserApp,
  setupDatabase,
  User,
  verifyJWT,
  createObjectId,
} = require("../testSetup");
const request = require("supertest");

describe("GET /users - Get My Data", () => {
  const app = setupUserApp();
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

  it("should return user data when authenticated", async () => {
    const userId = createObjectId();

    // Create a user
    await User.create({
      _id: userId,
      email: "test@example.com",
      name: "Test User",
      phone: "+12345678901",
      DOB: new Date("1990-01-01"),
      role: "user",
      password: "hashed_password123",
      accountType: "domestic",
    });

    // Mock verifyJWT to return our user ID
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const res = await request(app).get("/users");

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      email: "test@example.com",
      name: "Test User",
      phone: "+12345678901",
      role: "user",
    });
    // Password should not be returned
    expect(res.body.password).toBeUndefined();
  });

  it("should return 404 when user is not found", async () => {
    // Mock verifyJWT to return non-existent ID
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: createObjectId().toString() };
      next();
    });

    const res = await request(app).get("/users");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "User not found");
  });

  it("should select only necessary fields from the user", async () => {
    const userId = createObjectId();

    // Create a user with various fields
    await User.create({
      _id: userId,
      email: "test@example.com",
      name: "Test User",
      phone: "+12345678901",
      DOB: new Date("1990-01-01"),
      role: "user",
      password: "hashed_password123",
      accountType: "domestic",
      resetPasswordEncryptedToken: "some-token",
      resetPasswordExp: Date.now(),
      emailVerified: {
        state: true,
        encryptedToken: "some-token",
        expiresIn: Date.now(),
      },
    });

    // Mock verifyJWT to return our user ID
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const res = await request(app).get("/users");

    expect(res.statusCode).toBe(200);

    // Should include these fields
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("phone");
    expect(res.body).toHaveProperty("role");
    expect(res.body).toHaveProperty("DOB");
    expect(res.body).toHaveProperty("accountType"); // Now included in response

    // Should NOT include these sensitive fields
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("resetPasswordEncryptedToken");
    expect(res.body).not.toHaveProperty("resetPasswordExp");
    expect(res.body).not.toHaveProperty("emailVerified");
  });

  it("should handle unauthenticated requests", async () => {
    // This test should be handled by verifyJWT middleware
    // For testing purposes, we'll bypass the middleware and simulate an unauthenticated request

    // Mock verifyJWT to simulate an unauthenticated request
    verifyJWT.mockImplementationOnce((req, res, next) => {
      return res.status(401).json({ message: "Unauthorized" });
    });

    const res = await request(app).get("/users");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });
});
