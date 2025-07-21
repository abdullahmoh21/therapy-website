const {
  setupBookingApp,
  setupDatabase,
  createObjectId,
  Booking,
  verifyJWT,
} = require("../testSetup");
const request = require("supertest");

describe("GET /bookings/:bookingId - Get Specific Booking", () => {
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

  it("should return a specific booking when valid ID is provided", async () => {
    // Create a user ID
    const userId = createObjectId();

    // Override verifyJWT for this test
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    // Create a test booking
    const booking = await Booking.create({
      userId: userId,
      bookingId: 12345, // This value might be ignored by the system
      eventStartTime: new Date(),
      eventEndTime: new Date(Date.now() + 3600000),
      eventName: "1 Hour Session",
      status: "Active",
    });

    const res = await request(app).get(`/bookings/${booking._id}`);

    expect(res.statusCode).toBe(200);
    // Use the actual bookingId from the booking object instead of hardcoded value
    expect(res.body).toHaveProperty("bookingId", booking.bookingId);
  });

  it("should return 404 when booking is not found", async () => {
    const nonExistingId = createObjectId();

    // Override verifyJWT for this test
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: createObjectId().toString() };
      next();
    });

    const res = await request(app).get(`/bookings/${nonExistingId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("No such booking found");
  });

  it("should return 404 for invalid booking ID format", async () => {
    const res = await request(app).get("/bookings/invalid-id");

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("Invalid booking ID format");
  });

  it("should return 400 when bookingId is missing", async () => {
    // This shouldn't actually happen due to Express routing, but test anyway
    const mockReq = { params: {}, user: { id: "userId123" } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const bookingController = require("../../../controllers/bookingController");
    await bookingController.getBooking(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("required"),
      })
    );
  });
});
