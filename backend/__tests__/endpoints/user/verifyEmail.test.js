const {
  setupUserApp,
  setupDatabase,
  User,
  encrypt,
  logger,
  sendEmail,
} = require("../testSetup");
const request = require("supertest");

describe("POST /users/verifyEmail - Verify Email", () => {
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
    jest.clearAllMocks();
  });

  it("should verify email with valid token", async () => {
    const token = "valid-verification-token";
    const encryptedToken = encrypt(token);

    // Create a user with an unverified email
    await User.create({
      email: "unverified@example.com",
      name: "Unverified User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: false,
        encryptedToken: encryptedToken,
        expiresIn: Date.now() + 3600000, // 1 hour from now
      },
    });

    const res = await request(app).post("/users/verifyEmail").send({ token });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Email Verified!");

    // Verify the user's email state was updated
    const user = await User.findOne({ email: "unverified@example.com" });
    expect(user.emailVerified.state).toBe(true);
  });

  it("should return 400 when token is missing", async () => {
    const res = await request(app).post("/users/verifyEmail").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid request");
  });

  it("should return 400 when token is invalid", async () => {
    const res = await request(app)
      .post("/users/verifyEmail")
      .send({ token: "invalid-token" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid or expired verification token");
    expect(logger.error).toHaveBeenCalled();
  });

  it("should return 400 when token is expired", async () => {
    const token = "expired-verification-token";
    const encryptedToken = encrypt(token);

    // Create a user with an expired verification token
    await User.create({
      email: "expired@example.com",
      name: "Expired Token User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: false,
        encryptedToken: encryptedToken,
        expiresIn: Date.now() - 3600000, // 1 hour ago (expired)
      },
    });

    const res = await request(app).post("/users/verifyEmail").send({ token });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid or expired verification token");
  });

  it("should return 204 when email is already verified", async () => {
    const token = "already-verified-token";
    const encryptedToken = encrypt(token);

    // Create a user with an already verified email
    await User.create({
      email: "already-verified@example.com",
      name: "Already Verified User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: true,
        encryptedToken: encryptedToken,
        expiresIn: Date.now() + 3600000,
      },
    });

    const res = await request(app).post("/users/verifyEmail").send({ token });

    expect(res.statusCode).toBe(204);
  });

  it("should log information about the verification process", async () => {
    const token = "logging-test-token";
    const encryptedToken = encrypt(token);

    // Create a user
    await User.create({
      email: "logging@example.com",
      name: "Logging Test User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: false,
        encryptedToken: encryptedToken,
        expiresIn: Date.now() + 3600000,
      },
    });

    // Clear the mock before the test
    logger.info.mockClear();

    await request(app).post("/users/verifyEmail").send({ token });

    // Check if the expected log message was called
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Email verified for user: logging@example.com!`)
    );
  });
});
