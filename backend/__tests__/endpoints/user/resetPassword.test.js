const {
  setupUserApp,
  setupDatabase,
  User,
  bcrypt,
  encrypt,
  logger,
} = require("../testSetup");
const request = require("supertest");

describe("POST /users/resetPassword - Reset Password", () => {
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

  it("should reset password with valid token", async () => {
    const token = "valid-reset-token";

    // Create a user with reset token
    await User.create({
      email: "reset@example.com",
      name: "Reset User",
      password: "hashed_oldpassword",
      accountType: "domestic",
      resetPasswordEncryptedToken: encrypt(token),
      resetPasswordExp: Date.now() + 3600000, // 1 hour from now
    });

    const res = await request(app)
      .post(`/users/resetPassword?token=${token}`)
      .send({ password: "newPassword123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Password reset successfully!");

    // Verify password was updated
    const user = await User.findOne({ email: "reset@example.com" });
    expect(user.password).toBe("hashed_newPassword123");
    expect(user.resetPasswordEncryptedToken).toBeUndefined();
    expect(user.resetPasswordExp).toBeUndefined();
  });

  it("should return 400 when token is invalid", async () => {
    const res = await request(app)
      .post("/users/resetPassword?token=invalid-token")
      .send({ password: "newPassword123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("should return 400 when token is expired", async () => {
    const token = "expired-reset-token";

    // Create a user with expired reset token
    await User.create({
      email: "expired@example.com",
      name: "Expired Reset Token User",
      password: "hashed_oldpassword",
      accountType: "domestic",
      resetPasswordEncryptedToken: encrypt(token),
      resetPasswordExp: Date.now() - 3600000, // 1 hour ago (expired)
    });

    const res = await request(app)
      .post(`/users/resetPassword?token=${token}`)
      .send({ password: "newPassword123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("should hash the new password before saving", async () => {
    const token = "hash-test-token";

    // Create a user with reset token
    await User.create({
      email: "hash@example.com",
      name: "Hash Test User",
      password: "hashed_oldpassword",
      accountType: "domestic",
      resetPasswordEncryptedToken: encrypt(token),
      resetPasswordExp: Date.now() + 3600000,
    });

    // Clear mock to test specific call
    bcrypt.hash.mockClear();

    await request(app)
      .post(`/users/resetPassword?token=${token}`)
      .send({ password: "newSecurePassword" });

    expect(bcrypt.hash).toHaveBeenCalledWith("newSecurePassword", 10);
  });

  it("should log information about the password reset", async () => {
    const token = "logging-test-token";

    // Create a user with reset token
    await User.create({
      email: "logging@example.com",
      name: "Logging Test User",
      password: "hashed_oldpassword",
      accountType: "domestic",
      resetPasswordEncryptedToken: encrypt(token),
      resetPasswordExp: Date.now() + 3600000,
    });

    logger.info.mockClear();

    await request(app)
      .post(`/users/resetPassword?token=${token}`)
      .send({ password: "newPassword123" });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Password reset")
    );
  });

  it("should return 400 when password is missing", async () => {
    const token = "valid-reset-token";

    // Create a user with reset token
    await User.create({
      email: "missing@example.com",
      name: "Missing Password User",
      password: "hashed_oldpassword",
      accountType: "domestic",
      resetPasswordEncryptedToken: encrypt(token),
      resetPasswordExp: Date.now() + 3600000,
    });

    const res = await request(app)
      .post(`/users/resetPassword?token=${token}`)
      .send({}); // No password

    expect(res.statusCode).toBe(400);
  });
});
