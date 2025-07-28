const {
  setupAdminApp,
  setupDatabase,
  User,
  logger,
  createObjectId,
  request,
} = require("../../testSetup");

describe("Admin User Controller - getUserDetails", () => {
  const app = setupAdminApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it("should return user details for a valid ID", async () => {
    const userId = createObjectId();
    const mockUser = {
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      role: "user",
      phone: "1234567890",
      emailVerified: { state: true },
      accountType: "domestic",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    jest.spyOn(User, "findById").mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUser),
    }));

    const response = await request(app).get(`/admin/users/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("name", "Test User");
    expect(response.body).toHaveProperty("email", "test@example.com");
    expect(response.body).toHaveProperty("role", "user");
    expect(User.findById).toHaveBeenCalledWith(userId.toString());
  });

  it("should return 404 for non-existent user", async () => {
    const userId = createObjectId();

    jest.spyOn(User, "findById").mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    }));

    const response = await request(app).get(`/admin/users/${userId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "User not found");
  });

  it("should return 404 for invalid user ID format", async () => {
    // Using an obviously invalid ID format
    const response = await request(app).get(`/admin/users/invalid-id`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });

  it("should handle database errors", async () => {
    const userId = createObjectId();

    jest.spyOn(User, "findById").mockImplementation(() => {
      throw new Error("Database error");
    });

    const response = await request(app).get(`/admin/users/${userId}`);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message");
    expect(logger.error).toHaveBeenCalled();
  });
});
