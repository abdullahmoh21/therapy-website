const {
  setupAdminApp,
  setupDatabase,
  User,
  logger,
  invalidateByEvent,
  createObjectId,
  request,
} = require("../../testSetup");

describe("Admin User Controller - getAllUsers", () => {
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

  // Helper function to create mock users
  const createMockUsers = (count) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push({
        _id: createObjectId(),
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 5 === 0 ? "admin" : "user",
        phone: `123456789${i}`,
      });
    }
    return users;
  };

  it("should return paginated users with default pagination", async () => {
    // Mock 25 users
    const mockUsers = createMockUsers(25);
    jest.spyOn(User, "find").mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUsers.slice(0, 10)),
    }));

    jest.spyOn(User, "countDocuments").mockResolvedValue(25);

    const response = await request(app).get("/admin/users");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("users");
    expect(response.body.users).toHaveLength(10);
    expect(response.body).toHaveProperty("page", 1);
    expect(response.body).toHaveProperty("limit", 10);
    expect(response.body).toHaveProperty("totalUsers", 25);
    expect(response.body).toHaveProperty("totalPages", 3);
  });

  it("should support custom pagination parameters", async () => {
    const mockUsers = createMockUsers(25);
    jest.spyOn(User, "find").mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUsers.slice(10, 15)),
    }));

    jest.spyOn(User, "countDocuments").mockResolvedValue(25);

    const response = await request(app).get("/admin/users?page=3&limit=5");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("users");
    expect(response.body).toHaveProperty("page", 3);
    expect(response.body).toHaveProperty("limit", 5);
  });

  it("should filter users by search term", async () => {
    const mockUsers = [createMockUsers(1)[0]]; // Just one user for search result

    jest.spyOn(User, "find").mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUsers),
    }));

    jest.spyOn(User, "countDocuments").mockResolvedValue(1);

    const response = await request(app).get("/admin/users?search=user0");

    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(1);
    expect(User.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "user0", $options: "i" } },
        { email: { $regex: "user0", $options: "i" } },
      ],
    });
  });

  it("should filter users by role", async () => {
    const adminUsers = createMockUsers(3).map((user) => ({
      ...user,
      role: "admin",
    }));

    jest.spyOn(User, "find").mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(adminUsers),
    }));

    jest.spyOn(User, "countDocuments").mockResolvedValue(3);

    const response = await request(app).get("/admin/users?role=admin");

    expect(response.status).toBe(200);
    expect(User.find).toHaveBeenCalledWith({ role: "admin" });
  });

  it("should return 400 for invalid pagination parameters", async () => {
    const response = await request(app).get("/admin/users?page=0&limit=100");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("Page and limit must be positive");
  });

  it("should handle database errors", async () => {
    jest.spyOn(User, "find").mockImplementation(() => {
      throw new Error("Database connection error");
    });

    const response = await request(app).get("/admin/users");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message");
    expect(logger.error).toHaveBeenCalled();
  });
});
