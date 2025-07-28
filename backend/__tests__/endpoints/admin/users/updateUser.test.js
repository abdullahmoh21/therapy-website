const {
  setupAdminApp,
  setupDatabase,
  User,
  logger,
  invalidateByEvent,
  createObjectId,
  request,
} = require("../../testSetup");

describe("Admin User Controller - updateUser", () => {
  const app = setupAdminApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;
  const userId = createObjectId();

  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearCollections();
    jest.clearAllMocks();
  });

  // Mock user for tests
  const mockUser = {
    _id: userId,
    name: "Original Name",
    email: "original@example.com",
    role: "user",
    accountType: "domestic",
    emailVerified: { state: true },
  };

  it("should update user name successfully", async () => {
    // Mock User.findById as a function that returns the mock user
    User.findById = jest.fn().mockReturnValue(mockUser);

    // Mock User.findByIdAndUpdate as a function that returns the updated user
    User.findByIdAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        ...mockUser,
        name: "Updated Name",
      }),
    });

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "User updated successfully"
    );
    expect(response.body.user).toHaveProperty("name", "Updated Name");
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId.toString(),
      { $set: { name: "Updated Name" } },
      { new: true, runValidators: true }
    );
    expect(invalidateByEvent).toHaveBeenCalledWith("user-updated", {
      userId: userId.toString(),
    });
    expect(invalidateByEvent).toHaveBeenCalledWith("admin-data-changed");
  });

  it("should update user email and reset verification status", async () => {
    // Mock User.findById as a function that returns the mock user
    User.findById = jest.fn().mockReturnValue(mockUser);

    // Mock User.findByIdAndUpdate as a function that returns the updated user
    User.findByIdAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        ...mockUser,
        email: "new@example.com",
        emailVerified: { state: false },
      }),
    });

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ email: "new@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty("email", "new@example.com");
    expect(response.body.user.emailVerified).toHaveProperty("state", false);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId.toString(),
      {
        $set: {
          email: "new@example.com",
          "emailVerified.state": false,
          "emailVerified.encryptedToken": undefined,
          "emailVerified.expiresIn": undefined,
        },
      },
      { new: true, runValidators: true }
    );
  });

  it("should update user role successfully", async () => {
    // Properly mock the User.findById and User.findByIdAndUpdate methods
    User.findById = jest.fn().mockResolvedValue(mockUser);

    // Mock User.findByIdAndUpdate to return a value that works with chained select()
    const mockUpdatedUser = {
      ...mockUser,
      role: "admin",
    };

    User.findByIdAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUpdatedUser),
    });

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ role: "admin" });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty("role", "admin");
  });

  it("should update account type successfully", async () => {
    // Properly mock the User.findById and User.findByIdAndUpdate methods
    User.findById = jest.fn().mockResolvedValue(mockUser);

    // Mock User.findByIdAndUpdate to return a value that works with chained select()
    const mockUpdatedUser = {
      ...mockUser,
      accountType: "international",
    };

    User.findByIdAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUpdatedUser),
    });

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ accountType: "international" });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty("accountType", "international");
  });

  it("should return 404 for non-existent user", async () => {
    // Mock finding no user
    jest.spyOn(User, "findById").mockResolvedValue(null);

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "User not found");
  });

  it("should return 400 for invalid name", async () => {
    // Mock finding the existing user
    jest.spyOn(User, "findById").mockResolvedValue(mockUser);

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ name: "" }); // Empty name

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Name must be a non-empty string");
  });

  it("should return 400 for invalid email", async () => {
    // Mock finding the existing user
    jest.spyOn(User, "findById").mockResolvedValue(mockUser);

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ email: "invalid-email" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid email format");
  });

  it("should return 400 for invalid role", async () => {
    // Mock finding the existing user
    jest.spyOn(User, "findById").mockResolvedValue(mockUser);

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ role: "superuser" }); // Invalid role

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Role must be either");
  });

  it("should return 400 for invalid account type", async () => {
    // Mock finding the existing user
    jest.spyOn(User, "findById").mockResolvedValue(mockUser);

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ accountType: "invalid" }); // Invalid account type

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Account type must be either");
  });

  it("should handle database errors", async () => {
    // Mock finding the existing user
    jest.spyOn(User, "findById").mockResolvedValue(mockUser);

    // Mock database error
    jest.spyOn(User, "findByIdAndUpdate").mockImplementation(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .patch(`/admin/users/${userId}`)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Error updating user");
    expect(logger.error).toHaveBeenCalled();
  });
});
