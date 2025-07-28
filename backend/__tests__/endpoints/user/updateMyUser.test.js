const {
  setupUserApp,
  setupDatabase,
  User,
  verifyJWT,
  invalidateByEvent,
  createObjectId,
  logger,
} = require("../testSetup");
const request = require("supertest");

describe("PATCH /users - Update My User", () => {
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

  it("should update user data with valid inputs", async () => {
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

    const updateData = {
      name: "Updated Name",
      phone: "+10987654321",
      DOB: "1995-05-05",
    };

    const res = await request(app).patch("/users").send(updateData);

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      name: "Updated Name",
      phone: "+10987654321",
    });
    expect(invalidateByEvent).toHaveBeenCalledWith("user-profile-updated", {
      userId: userId.toString(),
    });
  });

  it("should only update allowed fields", async () => {
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

    // Attempt to update allowed and disallowed fields
    const updateData = {
      name: "Updated Name",
      phone: "+10987654321",
      email: "newemail@example.com", // Should be ignored
      role: "admin", // Should be ignored
      password: "newPassword123", // Should be ignored
    };

    const res = await request(app).patch("/users").send(updateData);

    expect(res.statusCode).toBe(201);

    // Verify allowed fields were updated
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.phone).toBe("+10987654321");

    // Verify disallowed fields were NOT updated
    expect(res.body.email).toBe("test@example.com");
    expect(res.body.role).toBe("user");
    expect(res.body.password).toBeUndefined(); // Password should never be returned
  });

  it("should return 409 when phone number is already registered", async () => {
    const userId1 = createObjectId();
    const userId2 = createObjectId();
    const existingPhone = "+12345678901";

    // Create two users, one with the phone we'll try to update to
    await User.create({
      _id: userId1,
      email: "test1@example.com",
      name: "Test User 1",
      phone: "+19876543210",
      DOB: new Date("1990-01-01"),
      role: "user",
      password: "hashed_password123",
      accountType: "domestic",
    });

    await User.create({
      _id: userId2,
      email: "test2@example.com",
      name: "Test User 2",
      phone: existingPhone, // This is the phone we'll try to update to
      DOB: new Date("1990-01-01"),
      role: "user",
      password: "hashed_password123",
      accountType: "domestic",
    });

    // Mock verifyJWT to return first user ID
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId1.toString() };
      next();
    });

    const updateData = {
      phone: existingPhone, // Try to update to the phone of the second user
    };

    const res = await request(app).patch("/users").send(updateData);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe(
      "This phone number is already registered with another account."
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Duplicate phone number detected")
    );
  });

  it("should return 404 when user is not found", async () => {
    // Mock verifyJWT to return non-existent ID
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: createObjectId().toString() };
      next();
    });

    const updateData = {
      name: "Updated Name",
    };

    const res = await request(app).patch("/users").send(updateData);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });
});
