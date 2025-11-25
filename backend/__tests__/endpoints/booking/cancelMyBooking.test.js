const {
  setupBookingApp,
  setupDatabase,
  createObjectId,
  Booking,
  Payment,
  User,
  Config,
  verifyJWT,
} = require("../testSetup");
const request = require("supertest");
const { addJob } = require("../../../utils/queue");
const { invalidateByEvent } = require("../../../middleware/redisCaching");

// Mock the queue and cache invalidation
jest.mock("../../../utils/queue");
jest.mock("../../../middleware/redisCaching");

describe("PUT /bookings/:bookingId/cancel - Cancel User Booking", () => {
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
    jest.clearAllMocks();

    // Set default config values
    await Config.create({
      key: "noticePeriod",
      value: 3,
      type: "number",
      displayName: "Cancellation Notice Period",
      description: "Notice period in days for cancellations",
    });

    // Mock invalidateByEvent to resolve successfully
    invalidateByEvent.mockResolvedValue(true);

    // Mock addJob to resolve successfully
    addJob.mockResolvedValue({ id: "job-123" });
  });

  it("should successfully cancel an admin-created booking within notice period", async () => {
    const userId = createObjectId();

    // Override verifyJWT
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    // Create a test user
    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "hashedpassword",
      role: "user",
      accountType: "domestic",
    });

    // Create a booking 10 days in the future (well within notice period)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Active",
      source: "admin",
      location: { type: "online" },
      googleEventId: "google-event-123",
      syncStatus: {
        google: "synced",
      },
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "Personal emergency" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty(
      "message",
      "Booking cancelled successfully"
    );
    expect(res.body.booking).toHaveProperty("status", "Cancelled");
    expect(res.body.booking.cancellation).toMatchObject({
      reason: "Personal emergency",
      cancelledBy: "User",
    });

    // Verify database update
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.status).toBe("Cancelled");
    expect(updatedBooking.cancellation.cancelledBy).toBe("User");
    expect(updatedBooking.syncStatus.google).toBe("pending");

    // Verify cache invalidation
    expect(invalidateByEvent).toHaveBeenCalledWith("booking-updated", {
      userId: userId,
    });
  });

  it("should successfully cancel a system-created recurring booking", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "hashedpassword",
      role: "user",
      accountType: "domestic",
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    // Create first recurring booking (the one we'll cancel)
    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Active",
      source: "system",
      location: { type: "in-person", inPersonLocation: "Office" },
      recurring: {
        state: true,
        interval: "weekly",
      },
    });

    // Create a second recurring booking so we're not cancelling the last one
    const futureDate2 = new Date(futureDate);
    futureDate2.setDate(futureDate2.getDate() + 7); // 1 week later
    const endDate2 = new Date(futureDate2);
    endDate2.setHours(endDate2.getHours() + 1);

    await Booking.create({
      userId: userId,
      eventStartTime: futureDate2,
      eventEndTime: endDate2,
      status: "Active",
      source: "system",
      location: { type: "in-person", inPersonLocation: "Office" },
      recurring: {
        state: true,
        interval: "weekly",
      },
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "Schedule conflict" });

    expect(res.statusCode).toBe(200);
    expect(res.body.booking.status).toBe("Cancelled");
  });

  it("should reject cancellation for Calendly bookings", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Active",
      source: "calendly",
      calendly: {
        eventName: "1 Hour Session",
        cancelURL: "https://calendly.com/cancel/xyz",
      },
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "Changed my mind" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("Calendly");
    expect(res.body.message).toContain("Calendly link");
  });

  it("should reject cancellation outside notice period", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "hashedpassword",
      role: "user",
      accountType: "domestic",
    });

    // Create a booking 2 days in the future (less than 3 day notice period)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Active",
      source: "admin",
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "Too late" });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain("at least");
    expect(res.body.message).toContain("days before the session");
    expect(res.body).toHaveProperty("cutoffDays");
  });

  it("should return 404 when booking does not belong to user", async () => {
    const userId = createObjectId();
    const otherUserId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    // Create booking for a different user
    const booking = await Booking.create({
      userId: otherUserId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Active",
      source: "admin",
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "Not my booking" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain("Booking not found");
  });

  it("should return 400 when booking is already cancelled", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Cancelled",
      source: "admin",
      cancellation: {
        reason: "Already cancelled",
        date: new Date(),
        cancelledBy: "Admin",
      },
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "Cancel again" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("already cancelled");
  });

  it("should return 400 when reason is missing", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: new Date(futureDate.getTime() + 3600000),
      status: "Active",
      source: "admin",
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("reason is required");
  });

  it("should return 400 when reason is empty string", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: new Date(futureDate.getTime() + 3600000),
      status: "Active",
      source: "admin",
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "   " });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("reason is required");
  });

  it("should return 404 for invalid booking ID format", async () => {
    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: createObjectId().toString() };
      next();
    });

    const res = await request(app)
      .put("/bookings/invalid-id/cancel")
      .send({ reason: "Test" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain("Invalid booking ID format");
  });

  it("should handle bookings without Google Calendar events", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "hashedpassword",
      role: "user",
      accountType: "domestic",
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    // Booking without googleEventId
    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Active",
      source: "admin",
      location: { type: "online" },
    });

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "No Google event" });

    expect(res.statusCode).toBe(200);

    // Should NOT queue Google Calendar job
    expect(addJob).not.toHaveBeenCalledWith(
      "cancelGoogleCalendarEvent",
      expect.anything()
    );
  });

  it("should continue even if queue fails", async () => {
    const userId = createObjectId();

    verifyJWT.mockImplementationOnce((req, res, next) => {
      req.user = { id: userId.toString() };
      next();
    });

    await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "hashedpassword",
      role: "user",
      accountType: "domestic",
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const endDate = new Date(futureDate);
    endDate.setHours(endDate.getHours() + 1);

    const booking = await Booking.create({
      userId: userId,
      eventStartTime: futureDate,
      eventEndTime: endDate,
      status: "Active",
      source: "admin",
      googleEventId: "google-event-123",
    });

    // Mock addJob to fail
    addJob.mockRejectedValueOnce(new Error("Queue unavailable"));

    const res = await request(app)
      .put(`/bookings/${booking._id}/cancel`)
      .send({ reason: "Queue failure test" });

    // Should still succeed
    expect(res.statusCode).toBe(200);
    expect(res.body.booking.status).toBe("Cancelled");
  });
});
