const {
  setupAdminApp,
  setupDatabase,
  User,
  Booking,
  Payment,
  logger,
  invalidateByEvent,
  createObjectId,
  request,
} = require("../../testSetup");

describe("Admin User Controller - deleteUser", () => {
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

  it("should delete a user and related data", async () => {
    // Mock delete operations
    jest.spyOn(User, "deleteOne").mockResolvedValue({ deletedCount: 1 });
    jest.spyOn(Booking, "deleteMany").mockResolvedValue({ deletedCount: 2 });
    jest.spyOn(Payment, "deleteMany").mockResolvedValue({ deletedCount: 2 });

    const response = await request(app).delete(`/admin/users/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "User deleted successfully"
    );
    expect(response.body).toHaveProperty("deletedCount", 1);

    // Verify all delete operations were called with correct userId
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: userId.toString() });
    expect(Booking.deleteMany).toHaveBeenCalledWith({
      userId: userId.toString(),
    });
    expect(Payment.deleteMany).toHaveBeenCalledWith({
      userId: userId.toString(),
    });

    // Verify cache invalidation
    expect(invalidateByEvent).toHaveBeenCalledWith("user-deleted", {
      userId: userId.toString(),
    });
    expect(invalidateByEvent).toHaveBeenCalledWith("admin-data-changed");

    // Verify logging
    expect(logger.debug).toHaveBeenCalled();
  });

  it("should handle non-existent user ID", async () => {
    // Mock delete returning 0 deleted documents
    jest.spyOn(User, "deleteOne").mockResolvedValue({ deletedCount: 0 });
    jest.spyOn(Booking, "deleteMany").mockResolvedValue({ deletedCount: 0 });
    jest.spyOn(Payment, "deleteMany").mockResolvedValue({ deletedCount: 0 });

    const nonExistentId = createObjectId();
    const response = await request(app).delete(`/admin/users/${nonExistentId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("deletedCount", 0);
  });

  it("should return 404 for undefined route", async () => {
    // Test with a route that doesn't exist
    const response = await request(app).delete(`/admin/users`); // No trailing slash

    expect(response.status).toBe(404);
  });

  it("should handle database errors", async () => {
    // Mock database error
    jest.spyOn(User, "deleteOne").mockImplementation(() => {
      throw new Error("Database error");
    });

    const response = await request(app).delete(`/admin/users/${userId}`);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message", "Error deleting user");
    expect(logger.error).toHaveBeenCalled();
  });
});
