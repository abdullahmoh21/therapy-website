const {
  setupUserApp,
  setupDatabase,
  User,
  sendEmail,
  encrypt,
  logger,
} = require("../testSetup");
const request = require("supertest");

describe("POST /users/forgotPassword - Forgot Password", () => {
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

  it("should send reset password email when valid email is provided", async () => {
    // Create a user
    await User.create({
      email: "test@example.com",
      name: "Test User",
      password: "hashed_password123",
      accountType: "domestic",
    });

    const res = await request(app)
      .post("/users/forgotPassword")
      .send({ email: "test@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Reset password link added to email queue");
    expect(sendEmail).toHaveBeenCalledWith(
      "UserPasswordResetEmail",
      expect.objectContaining({
        userId: expect.any(String),
        resetToken: expect.any(String),
      })
    );

    // Verify resetPasswordEncryptedToken was set
    const user = await User.findOne({ email: "test@example.com" });
    expect(user.resetPasswordEncryptedToken).toBeDefined();
    expect(user.resetPasswordExp.getTime()).toBeGreaterThan(Date.now());
  });

  it("should return 400 when no user found with provided email", async () => {
    const res = await request(app)
      .post("/users/forgotPassword")
      .send({ email: "nonexistent@example.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("No user found with that email");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should reuse existing token if not expired", async () => {
    // Create a user with existing reset token
    const existingToken = "existing-reset-token";
    await User.create({
      email: "test@example.com",
      name: "Test User",
      password: "hashed_password123",
      accountType: "domestic",
      resetPasswordEncryptedToken: encrypt(existingToken),
      resetPasswordExp: Date.now() + 3600000, // 1 hour from now
    });

    logger.info.mockClear();

    const res = await request(app)
      .post("/users/forgotPassword")
      .send({ email: "test@example.com" });

    expect(res.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Existing token found")
    );

    // Verify the token was not changed
    const user = await User.findOne({ email: "test@example.com" });
    expect(user.resetPasswordEncryptedToken).toBe(encrypt(existingToken));
  });

  it("should generate new token if existing token is expired", async () => {
    // Create a user with expired reset token
    await User.create({
      email: "expired@example.com",
      name: "Expired Token User",
      password: "hashed_password123",
      accountType: "domestic",
      resetPasswordEncryptedToken: encrypt("expired-token"),
      resetPasswordExp: Date.now() - 3600000, // 1 hour ago (expired)
    });

    const res = await request(app)
      .post("/users/forgotPassword")
      .send({ email: "expired@example.com" });

    expect(res.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalled();

    // Verify a new token was generated
    const user = await User.findOne({ email: "expired@example.com" });
    expect(user.resetPasswordExp.getTime()).toBeGreaterThan(Date.now());
  });

  it("should handle error when email sending fails", async () => {
    // Create a user
    await User.create({
      email: "test@example.com",
      name: "Test User",
      password: "hashed_password123",
      accountType: "domestic",
    });

    // Mock sendEmail to fail
    sendEmail.mockRejectedValueOnce(new Error("Email service error"));

    const res = await request(app)
      .post("/users/forgotPassword")
      .send({ email: "test@example.com" });

    expect(res.statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
