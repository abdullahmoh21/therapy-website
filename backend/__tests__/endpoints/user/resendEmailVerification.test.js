const {
  setupUserApp,
  setupDatabase,
  User,
  sendEmail,
  encrypt,
  logger,
} = require("../testSetup");
const request = require("supertest");
const userController = require("../../../controllers/userController");

// Add spy to see what the controller's encrypt function is actually doing
jest.spyOn(userController, "encrypt");

describe("POST /users/resendEmailVerification - Resend Email Verification", () => {
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
    // Reset all mocks
    jest.clearAllMocks();
  });

  it("should resend verification email when valid email is provided", async () => {
    // Create a user with unverified email
    await User.create({
      email: "test@example.com",
      name: "Test User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: false,
        encryptedToken: encrypt("old-token"),
        expiresIn: Date.now() + 3600000, // 1 hour from now
      },
    });

    const res = await request(app)
      .post("/users/resendEmailVerification")
      .send({ email: "test@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Verification email sent");
    expect(sendEmail).toHaveBeenCalledWith(
      "verifyEmail",
      expect.objectContaining({
        recipient: "test@example.com",
        name: "Test User",
      })
    );
  });

  it("should resend verification email when valid token is provided", async () => {
    const token = "0123456789012345678901234567890123456789";

    const encryptedToken = userController.encrypt(token);

    const user = await User.create({
      email: "test@example.com",
      name: "Test User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: false,
        encryptedToken: encryptedToken,
        expiresIn: Date.now() + 3600000, // 1 hour from now
      },
    });

    const res = await request(app)
      .post("/users/resendEmailVerification")
      .send({ token: token });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Verification email sent");
    expect(sendEmail).toHaveBeenCalled();
  });

  it("should return 400 when no user is found with provided email", async () => {
    const res = await request(app)
      .post("/users/resendEmailVerification")
      .send({ email: "nonexistent@example.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("No user found");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should return 400 when email is already verified", async () => {
    // Create a user with verified email
    await User.create({
      email: "verified@example.com",
      name: "Verified User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: true,
        encryptedToken: encrypt("some-token"),
        expiresIn: Date.now() + 3600000,
      },
    });

    const res = await request(app)
      .post("/users/resendEmailVerification")
      .send({ email: "verified@example.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email already verified");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should return 400 when neither token nor email is provided", async () => {
    const res = await request(app)
      .post("/users/resendEmailVerification")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should generate new token if existing token is expired", async () => {
    // Create a user with expired token
    const originalExpiration = Date.now() - 3600000; // 1 hour ago (expired)

    await User.create({
      email: "expired@example.com",
      name: "Expired Token User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: false,
        encryptedToken: encrypt("expired-token"),
        expiresIn: originalExpiration,
      },
    });

    const res = await request(app)
      .post("/users/resendEmailVerification")
      .send({ email: "expired@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Verification email sent");
    expect(sendEmail).toHaveBeenCalled();

    // Verify a new token was generated
    const user = await User.findOne({ email: "expired@example.com" });

    // Convert Date object to timestamp if necessary
    const newExpiresIn =
      user.emailVerified.expiresIn instanceof Date
        ? user.emailVerified.expiresIn.getTime()
        : user.emailVerified.expiresIn;

    expect(newExpiresIn).toBeGreaterThan(originalExpiration);
  });

  it("should handle error when email sending fails", async () => {
    // Create a user with unverified email
    await User.create({
      email: "test@example.com",
      name: "Test User",
      password: "hashed_password123",
      accountType: "domestic",
      emailVerified: {
        state: false,
        encryptedToken: encrypt("old-token"),
        expiresIn: Date.now() + 3600000,
      },
    });

    // Mock sendEmail to fail
    sendEmail.mockRejectedValueOnce(new Error("Email service error"));

    const res = await request(app)
      .post("/users/resendEmailVerification")
      .send({ email: "test@example.com" });

    expect(res.statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
