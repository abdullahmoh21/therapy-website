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

describe("Admin Delete Booking Endpoint", () => {
  // Setup mock app
  const app = express();
  app.use(express.json());
  app.delete("/admin/bookings", adminBookingController.deleteBooking);

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

  describe("DELETE /admin/bookings", () => {
    it("should delete booking successfully", async () => {
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

      const res = await request(app).delete("/admin/bookings").send({
        bookingId: booking._id,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Booking successfully deleted");
      expect(res.body.deletedBookingId).toBe(booking._id.toString());

      // Verify booking was deleted
      const deletedBooking = await Booking.findById(booking._id);
      expect(deletedBooking).toBeNull();
    });

    it("should delete booking and associated payment", async () => {
      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
      });

      // Create a payment
      const payment = await Payment.create({
        userId: testUser._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Completed",
      });

      // Create a booking with payment
      const booking = await Booking.create({
        userId: testUser._id,
        paymentId: payment._id,
        eventStartTime: new Date(Date.now() + 86400000),
        eventEndTime: new Date(Date.now() + 86400000 + 3600000),
        eventName: "Test Booking with Payment",
        status: "Active",
      });

      const res = await request(app).delete("/admin/bookings").send({
        bookingId: booking._id,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Booking successfully deleted");

      // Verify booking was deleted
      const deletedBooking = await Booking.findById(booking._id);
      expect(deletedBooking).toBeNull();

      // Verify payment was deleted
      const deletedPayment = await Payment.findById(payment._id);
      expect(deletedPayment).toBeNull();
    });

    it("should return 400 when bookingId is missing", async () => {
      const res = await request(app).delete("/admin/bookings").send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Booking ID is required");
    });

    it("should return 404 when booking is not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app).delete("/admin/bookings").send({
        bookingId: nonExistentId,
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Booking not found");
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

      const res = await request(app).delete("/admin/bookings").send({
        bookingId: booking._id,
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to delete booking");
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
