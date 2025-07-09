const {
  setupApp,
  setupDatabase,
  verifyJWT,
  jsonwebtoken,
  User,
  Booking,
  mongoose,
} = require("./testSetup");
const request = require("supertest");

describe("GET /bookings/calendly - Get New Booking Link", () => {
  const app = setupApp();
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

  it("should return a new booking link when user exists and has not reached max bookings", async () => {
    // Create a real user in the database with required fields
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      role: "user",
      password: "hashedPassword123", // Add required field
      bookingTokenJTI: "",
      accountType: "domestic", // Already had this field
    });

    // Mock verifyJWT to return our user ID
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: user._id.toString() };
      next();
    });

    const res = await request(app).get("/bookings/calendly");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("link");
    expect(res.body.link).toContain(process.env.CALENDLY_SESSION_URL);
    expect(jsonwebtoken.sign).toHaveBeenCalled();

    // Verify user was updated with JTI
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.bookingTokenJTI).toBeTruthy();
  });

  it("should return 401 when userId is not found in request", async () => {
    // Mock verifyJWT to not include userId
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = {}; // Empty user object without id
      next();
    });

    const res = await request(app).get("/bookings/calendly");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("No userId found");
  });

  it("should return 404 when user is not found", async () => {
    // Mock verifyJWT to return non-existent userId
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: new mongoose.Types.ObjectId() };
      next();
    });

    const res = await request(app).get("/bookings/calendly");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("User not found");
  });

  it("should return 403 when user has reached maximum allowed bookings", async () => {
    // Create a user with required fields
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      role: "user",
      password: "hashedPassword123", // Add required field
      accountType: "domestic", // Add required field
    });

    // Mock verifyJWT to return our user ID
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: user._id.toString() };
      next();
    });

    // Create multiple active bookings for this user
    for (let i = 0; i < 3; i++) {
      await Booking.create({
        userId: user._id,
        bookingId: 12340 + i, // Number instead of string
        eventStartTime: new Date(Date.now() + 86400000),
        eventEndTime: new Date(Date.now() + 90000000),
        eventName: "1 Hour Session",
        status: "Active",
      });
    }

    const res = await request(app).get("/bookings/calendly");

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("maximum amount of active bookings");
    expect(res.body).toHaveProperty("maxAllowedBookings", 2);
  });
});
