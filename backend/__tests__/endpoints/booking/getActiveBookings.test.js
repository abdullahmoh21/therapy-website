const {
  setupBookingApp,
  setupDatabase,
  createObjectId,
  Booking,
  Payment,
  Config,
  verifyJWT,
} = require("../testSetup");
const request = require("supertest");

describe("GET /bookings - Get Active Bookings", () => {
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

  it("should return active bookings with payment details", async () => {
    // Create user ID
    const userId = createObjectId();

    // Override verifyJWT for this test
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString(), _id: userId };
      next();
    });

    // Create a booking in the database
    const booking = await Booking.create({
      _id: createObjectId(),
      bookingId: "12345",
      userId: userId,
      eventStartTime: new Date(Date.now() + 86400000), // Tomorrow
      eventEndTime: new Date(Date.now() + 90000000),
      eventName: "1 Hour Session",
      status: "Active",
      source: "admin", // Required for query to match
      location: { type: "online", join_url: "https://zoom.us/j/123" },
      calendly: {
        cancelURL: "https://calendly.com/cancel/event123",
      },
    });

    // Create a payment for this booking
    await Payment.create({
      _id: createObjectId(),
      bookingId: booking._id,
      userId: userId,
      amount: 100,
      currency: "USD",
      transactionStatus: "Not Initiated",
    });

    const res = await request(app).get("/bookings");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].bookingId).toBe(208);
    // Check for payment properties (flattened from payment object in aggregation)
    expect(res.body[0]).toHaveProperty("amount");
    expect(res.body[0]).toHaveProperty("currency");
    expect(res.body[0]).toHaveProperty("transactionStatus");
    // Note: paymentId is not returned in the response (only payment details)
  });

  it("should return 204 when no active bookings are found", async () => {
    // Create user ID - missing in original test
    const userId = createObjectId();

    // Override verifyJWT for this test
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString(), _id: userId };
      next();
    });

    const res = await request(app).get("/bookings");

    expect(res.statusCode).toBe(204);
  });

  it("should strip cancelURL when cancellation window has passed", async () => {
    // Create user ID
    const userId = createObjectId();

    // Override verifyJWT for this test
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString(), _id: userId };
      next();
    });

    // Mock a booking that's within the cancellation window
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 4); // 4 days in future

    // Create a booking with future date
    const booking = await Booking.create({
      _id: createObjectId(),
      bookingId: "12345", // Changed to string
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: new Date(futureDate.getTime() + 3600000),
      eventName: "1 Hour Session",
      status: "Active",
      source: "admin", // Required for query to match
      location: { type: "online", join_url: "https://zoom.us/j/123" },
      calendly: {
        cancelURL: "https://calendly.com/cancel/event123",
      },
    });

    // Set noticePeriod to 3 days
    Config.getValue = jest.fn().mockImplementation((key) => {
      if (key === "noticePeriod") return Promise.resolve(3);
      return Promise.resolve(null);
    });

    const res = await request(app).get("/bookings");

    expect(res.statusCode).toBe(200);
    expect(res.body[0]).toHaveProperty("calendly");
    expect(res.body[0].calendly).toHaveProperty("cancelURL");

    // Now test with a booking that's outside the cancellation window
    await Booking.findByIdAndUpdate(booking._id, {
      eventStartTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days in future
    });

    // Override verifyJWT again for the second request
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString(), _id: userId };
      next();
    });

    const res2 = await request(app).get("/bookings");

    expect(res2.statusCode).toBe(200);
    expect(res2.body[0].calendly?.cancelURL).toBeUndefined();
  });
});
