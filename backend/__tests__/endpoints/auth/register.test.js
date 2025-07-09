const {
  setupApp,
  setupDatabase,
  bcrypt,
  sendEmail,
  User,
  Invitee,
  mongoose,
} = require("./testSetup");
const request = require("supertest");
const { v4: uuid } = require("uuid"); // for random tokens

describe("Auth Register Endpoint", () => {
  const app = setupApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;

  // ────────────────────────────────────────────────────────────
  // In-memory MongoDB lifecycle
  // ────────────────────────────────────────────────────────────
  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Ensure bcrypt.hash is mocked to return a predictable value
    bcrypt.hash.mockImplementation(async (password) => `hashed_${password}`);

    // Ensure sendEmail is mocked to resolve successfully by default
    sendEmail.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    await clearCollections();
    jest.restoreAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────
  const insertInvitation = async (overrides = {}) => {
    const token = overrides.token || uuid();
    await Invitee.create({
      email: overrides.email,
      token,
      isUsed: false,
      expiresAt: overrides.expiresAt || new Date(Date.now() + 86_400_000), // +24 h
      accountType: "domestic",
      name: "New User",
      invitedBy: new mongoose.Types.ObjectId(),
      ...overrides,
    });
    return token;
  };

  // Add this at the beginning of your test file, before your tests
  it("should be properly configured", () => {
    // Verify mocks are working
    expect(typeof bcrypt.hash).toBe("function");
    expect(typeof sendEmail).toBe("function");

    // Ensure validation bypassing works
    const validator = require("express-joi-validation")
      .createValidator()
      .body();
    expect(typeof validator).toBe("function");
  });

  // ────────────────────────────────────────────────────────────
  // Tests
  // ────────────────────────────────────────────────────────────
  describe("POST /auth/register", () => {
    it("registers successfully with a valid invitation", async () => {
      const email = "newuser@example.com";
      const token = await insertInvitation({ email });

      bcrypt.hash.mockResolvedValueOnce("hashed_securePassword123");

      const res = await request(app).post("/auth/register").send({
        email,
        password: "securePassword123",
        name: "New User",
        DOB: "1990-01-01",
        phone: "+12345678901",
        token,
      });

      // Add this for debugging
      if (res.statusCode !== 201) {
        console.log("Response body:", res.body);
      }

      expect(res.statusCode).toBe(201);

      const user = await User.findOne({ email });
      expect(user).toBeTruthy();
      expect(user.name).toBe("New User");

      const invitation = await Invitee.findOne({ email });
      expect(invitation.isUsed).toBe(true);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "newuser@example.com",
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 409 when email already exists", async () => {
      await User.create({
        email: "existing@example.com",
        password: "hashed_password123",
        name: "Existing User",
        phone: "+11111111111",
        DOB: new Date("1990-01-01"),
        accountType: "domestic",
      });

      const token = await insertInvitation({ email: "existing@example.com" });

      const res = await request(app).post("/auth/register").send({
        email: "existing@example.com",
        password: "securePassword123",
        name: "New User",
        DOB: "1990-01-01",
        phone: "+99999999999",
        token,
      });

      expect(res.statusCode).toBe(409);
    });

    it("returns 409 when phone already exists", async () => {
      const existingPhone = "+12345678901";

      await User.create({
        email: "different@example.com",
        password: "hashed_password123",
        name: "Existing User",
        phone: existingPhone,
        DOB: new Date("1990-01-01"),
        accountType: "domestic",
      });

      const token = await insertInvitation({ email: "newuser@example.com" });

      const res = await request(app).post("/auth/register").send({
        email: "newuser@example.com",
        password: "securePassword123",
        name: "New User",
        DOB: "1990-01-01",
        phone: existingPhone,
        token,
      });

      expect(res.statusCode).toBe(409);
    });

    it("returns 400 with an invalid invitation token", async () => {
      const res = await request(app).post("/auth/register").send({
        email: "newuser@example.com",
        password: "securePassword123",
        name: "New User",
        DOB: "1990-01-01",
        phone: "+12345678901",
        token: "totally-invalid-token",
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 with an expired invitation", async () => {
      const email = "newuser@example.com";
      const token = await insertInvitation({
        email,
        expiresAt: new Date(Date.now() - 86_400_000), // expired
      });

      const res = await request(app).post("/auth/register").send({
        email,
        password: "securePassword123",
        name: "New User",
        DOB: "1990-01-01",
        phone: "+12345678901",
        token,
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when invitation has already been used", async () => {
      const email = "newuser@example.com";
      const token = await insertInvitation({
        email,
        isUsed: true,
        usedAt: new Date(),
      });

      const res = await request(app).post("/auth/register").send({
        email,
        password: "securePassword123!",
        name: "New User",
        DOB: "1990-01-01",
        phone: "+923082182122",
        token,
      });

      expect(res.statusCode).toBe(400);
    });

    it("still responds 201 when email-sending fails", async () => {
      sendEmail.mockRejectedValueOnce(new Error("Email service error"));

      const email = "newuser@example.com";
      const token = await insertInvitation({ email });

      bcrypt.hash.mockResolvedValueOnce("hashed_securePassword123");

      const res = await request(app).post("/auth/register").send({
        email,
        password: "securePassword123",
        name: "New User",
        DOB: "1990-01-01",
        phone: "+12345678901",
        token,
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(res.statusCode).toBe(201);

      const user = await User.findOne({ email });
      expect(user).toBeTruthy();
    });
  });
});
