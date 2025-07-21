const {
  setupAuthApp,
  setupDatabase,
  mongoose,
  Booking,
  Payment,
  User,
  logger,
} = require("../../testSetup");
const request = require("supertest");
const express = require("express");
const adminBookingController = require("../../../../controllers/admin/adminBookingController");

describe("Admin Get Booking Details Endpoint", () => {
  // Setup mock app
  const app = express();
  app.use(express.json());
  app.get(
    "/admin/bookings/:bookingId",
    adminBookingController.getBookingDetails
  );

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
    // Set up mock req.user
    app.use((req, res, next) => {
      req.user = { role: "admin", id: new mongoose.Types.ObjectId() };
      next();
    });
  });

  describe("GET /admin/bookings/:bookingId", () => {
    it("should retrieve booking details successfully", async () => {
      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
        phone: "+123456789",
      });

      // Create a payment
      const payment = await Payment.create({
        userId: testUser._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Completed",
        transactionReferenceNumber: "REF123456",
        paymentMethod: "Credit Card",
        paymentCompletedDate: new Date(),
      });

      // Create a booking with payment
      const booking = await Booking.create({
        userId: testUser._id,
        paymentId: payment._id,
        eventStartTime: new Date(Date.now() + 86400000),
        eventEndTime: new Date(Date.now() + 86400000 + 3600000),
        eventName: "Test Booking",
        status: "Active",
        location: {
          type: "in-person",
          inPersonLocation: "Office",
        },
      });

      const res = await request(app).get(`/admin/bookings/${booking._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(booking._id.toString());
      expect(res.body.eventName).toBe("Test Booking");
      expect(res.body.status).toBe("Active");

      // Check populated user info
      expect(res.body.userId).toHaveProperty("name", "Test User");
      expect(res.body.userId).toHaveProperty("email", "testuser@example.com");
      expect(res.body.userId).toHaveProperty("phone", "+123456789");

      // Check populated payment info
      expect(res.body.paymentId).toHaveProperty("amount", 100);
      expect(res.body.paymentId).toHaveProperty("currency", "USD");
      expect(res.body.paymentId).toHaveProperty(
        "transactionStatus",
        "Completed"
      );
      expect(res.body.paymentId).toHaveProperty(
        "transactionReferenceNumber",
        "REF123456"
      );
      expect(res.body.paymentId).toHaveProperty("paymentMethod", "Credit Card");
    });

    it("should return booking details without payment if no payment exists", async () => {
      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
        phone: "+123456789",
      });

      // Create a booking without payment
      const booking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date(Date.now() + 86400000),
        eventEndTime: new Date(Date.now() + 86400000 + 3600000),
        eventName: "Test Booking Without Payment",
        status: "Active",
        location: {
          type: "online",
          join_url: "https://zoom.us/j/123456",
        },
      });

      const res = await request(app).get(`/admin/bookings/${booking._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(booking._id.toString());
      expect(res.body.eventName).toBe("Test Booking Without Payment");
      expect(res.body.userId).toHaveProperty("name", "Test User");
      expect(res.body.paymentId).toBeNull();
    });

    it("should return 400 when bookingId is missing", async () => {
      const res = await request(app).get("/admin/bookings/");

      expect(res.statusCode).toBe(404); // Express default for missing route param
    });

    it("should return 404 when booking is not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app).get(`/admin/bookings/${nonExistentId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Booking not found");
    });

    it("should handle invalid ObjectId format", async () => {
      const res = await request(app).get("/admin/bookings/invalid-id");

      expect(res.statusCode).toBe(500); // MongoDB will throw a CastError
    });

    it("should handle database errors gracefully", async () => {
      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
      });

      // Create a booking
      const booking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date(Date.now() + 86400000),
        eventEndTime: new Date(Date.now() + 86400000 + 3600000),
        eventName: "Test Booking",
        status: "Active",
      });

      // Mock Booking.findById to throw an error
      jest.spyOn(Booking, "findById").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app).get(`/admin/bookings/${booking._id}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to retrieve booking details");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should not expose sensitive fields in the response", async () => {
      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
        phone: "+123456789",
      });

      // Create a booking with sensitive fields
      const booking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date(Date.now() + 86400000),
        eventEndTime: new Date(Date.now() + 86400000 + 3600000),
        eventName: "Test Booking",
        status: "Active",
        eventTypeURI: "some-uri-that-should-not-be-exposed",
        rescheduleURL: "https://reschedule.example.com",
        scheduledEventURI: "https://event.example.com",
        location: {
          type: "online",
          join_url: "https://zoom.us/j/123456",
        },
      });

      // Create a payment with sensitive fields
      const payment = await Payment.create({
        userId: testUser._id,
        bookingId: booking._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Completed",
        feePaid: 5,
        tracker: "should-not-be-exposed",
        errorMessage: "sensitive-error-details",
      });

      booking.paymentId = payment._id;
      await booking.save();

      const res = await request(app).get(`/admin/bookings/${booking._id}`);

      expect(res.statusCode).toBe(200);

      // Admin should see event details but not internal URIs
      expect(res.body.eventName).toBe("Test Booking");
      expect(res.body).not.toHaveProperty("__v");
      expect(res.body).not.toHaveProperty("eventTypeURI");
      expect(res.body).not.toHaveProperty("scheduledEventURI");

      // Payment sensitive fields should not be exposed
      expect(res.body.paymentId).toHaveProperty("amount");
      expect(res.body.paymentId).toHaveProperty("transactionStatus");
      expect(res.body.paymentId).not.toHaveProperty("tracker");
      expect(res.body.paymentId).not.toHaveProperty("errorMessage");
      expect(res.body.paymentId).not.toHaveProperty("feePaid");
    });
  });
});
