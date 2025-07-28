const {
  setupBookingApp,
  setupDatabase,
  verifyJWT,
  createObjectId,
  Booking,
  mongoose,
} = require("../testSetup");
const request = require("supertest");

describe("GET /bookings/all - Get All User Bookings", () => {
  const app = setupBookingApp();
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

  it("should return paginated past bookings with payment details", async () => {
    // Create test bookings and set up aggregation results
    const mockBookingId = createObjectId();
    const userId = createObjectId();

    // Create a real booking in the database
    await Booking.create({
      _id: mockBookingId,
      userId: userId,
      bookingId: 12345, // Number instead of string
      eventStartTime: new Date("2023-01-01T10:00:00Z"),
      eventEndTime: new Date("2023-01-01T11:00:00Z"),
      eventName: "1 Hour Session",
      status: "Completed",
    });

    // Override verifyJWT for this test to use our userId
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const res = await request(app).get("/bookings/all");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("bookings");
    expect(Array.isArray(res.body.bookings)).toBe(true);
    expect(res.body).toHaveProperty("totalBookings");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
  });

  it("should filter bookings by search parameters", async () => {
    // Create test booking
    const mockBookingId = createObjectId();
    const userId = createObjectId();

    await Booking.create({
      _id: mockBookingId,
      userId: userId,
      bookingId: 12345, // Number instead of string
      eventStartTime: new Date("2023-01-01T10:00:00Z"),
      eventEndTime: new Date("2023-01-01T11:00:00Z"),
      eventName: "1 Hour Session",
      status: "Completed",
    });

    // Override verifyJWT for this test to use our userId
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    // Test with query parameters
    const res = await request(app)
      .get("/bookings/all")
      .query({ search: "12345" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("bookings");
  });

  it("should handle invalid date format", async () => {
    const res = await request(app).get("/bookings/all").query({
      startDate: "invalid-date",
      endDate: "2023-12-31",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("Invalid date format");
  });

  it("should handle invalid ObjectId", async () => {
    // Mock verifyJWT to return a non-ObjectId userId
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = {
        id: "not-an-object-id",
        email: "test@example.com",
        role: "user",
      };
      next();
    });

    // Mock mongoose.Types.ObjectId to throw an error
    const originalObjectId = mongoose.Types.ObjectId;
    mongoose.Types.ObjectId = jest.fn().mockImplementation(() => {
      throw new Error("Invalid ObjectId");
    });

    const res = await request(app).get("/bookings/all");

    // Restore original ObjectId implementation
    mongoose.Types.ObjectId = originalObjectId;

    // Should handle error and return empty results
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("bookings");
    expect(res.body.bookings).toEqual([]);
  });

  it("should return empty result when pagination exceeds available bookings", async () => {
    const res = await request(app).get("/bookings/all?page=10");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("bookings");
    expect(res.body.bookings).toEqual([]);
    expect(res.body.page).toBe(10);
  });
});
