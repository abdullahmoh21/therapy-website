const {
  setupAuthApp,
  setupDatabase,
  mongoose,
  Booking,
  User,
  Payment,
} = require("../../testSetup");
const request = require("supertest");
const express = require("express");
const adminBookingController = require("../../../../controllers/admin/adminBookingController");

describe("Admin Get Booking Timeline Endpoint", () => {
  // Setup mock app
  const app = express();
  app.use(express.json());
  app.get(
    "/admin/bookings/timeline",
    adminBookingController.getBookingTimeline
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

  describe("GET /admin/bookings/timeline", () => {
    it("should retrieve upcoming booking timeline successfully", async () => {
      // Mock Date.now to make test predictable
      const originalDateNow = Date.now;
      const mockNow = new Date("2023-01-10T12:00:00Z").getTime();
      global.Date.now = jest.fn(() => mockNow);

      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
        phone: "+123456789",
      });

      // Create payment for one booking
      const payment = await Payment.create({
        userId: testUser._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Completed",
        paymentMethod: "Credit Card",
        paymentCompletedDate: new Date(),
      });

      // Create bookings in the next week
      const bookings = [];

      // Today's booking
      const booking1 = await Booking.create({
        userId: testUser._id,
        paymentId: payment._id,
        eventStartTime: new Date("2023-01-10T15:00:00Z"), // Same day
        eventEndTime: new Date("2023-01-10T16:00:00Z"),
        eventName: "Today's Booking",
        status: "Active",
        location: { type: "in-person", inPersonLocation: "Office" },
      });
      bookings.push(booking1);

      // Tomorrow's booking
      const booking2 = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-11T14:00:00Z"), // Tomorrow
        eventEndTime: new Date("2023-01-11T15:00:00Z"),
        eventName: "Tomorrow's Booking",
        status: "Active",
        location: { type: "online", join_url: "https://zoom.us/j/123456" },
      });
      bookings.push(booking2);

      // End of week booking
      const booking3 = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-16T10:00:00Z"), // Next week (within range)
        eventEndTime: new Date("2023-01-16T11:00:00Z"),
        eventName: "End of Week Booking",
        status: "Active",
        location: { type: "in-person", inPersonLocation: "Cafe" },
      });
      bookings.push(booking3);

      // Far future booking (outside the week range)
      const booking4 = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-25T09:00:00Z"), // Outside the week range
        eventEndTime: new Date("2023-01-25T10:00:00Z"),
        eventName: "Future Booking",
        status: "Active",
        location: { type: "online", join_url: "https://zoom.us/j/123456" },
      });

      // Cancelled booking (should be excluded)
      const booking5 = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-12T09:00:00Z"), // Within range but cancelled
        eventEndTime: new Date("2023-01-12T10:00:00Z"),
        eventName: "Cancelled Booking",
        status: "Cancelled",
        location: { type: "in-person", inPersonLocation: "Office" },
      });

      const res = await request(app).get("/admin/bookings/timeline");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("bookings");

      // Should have 3 bookings (exclude the far future and cancelled ones)
      expect(res.body.bookings.length).toBe(3);

      // Should be sorted by eventStartTime
      expect(
        new Date(res.body.bookings[0].eventStartTime).getTime()
      ).toBeLessThan(new Date(res.body.bookings[1].eventStartTime).getTime());

      // Verify populated fields
      expect(res.body.bookings[0].userId).toHaveProperty("name");
      expect(res.body.bookings[0].userId).toHaveProperty("email");
      expect(res.body.bookings[0].userId).toHaveProperty("phone");

      // One booking should have payment info
      const bookingWithPayment = res.body.bookings.find(
        (b) => b._id.toString() === booking1._id.toString()
      );
      expect(bookingWithPayment.paymentId).toHaveProperty("amount");
      expect(bookingWithPayment.paymentId).toHaveProperty("currency");
      expect(bookingWithPayment.paymentId).toHaveProperty("transactionStatus");

      // Restore original Date.now
      global.Date.now = originalDateNow;
    });

    it("should return an empty array when no bookings exist in the timeline", async () => {
      const res = await request(app).get("/admin/bookings/timeline");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("bookings");
      expect(res.body.bookings).toBeInstanceOf(Array);
      expect(res.body.bookings.length).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      // Mock Booking.find to throw an error
      jest.spyOn(Booking, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const res = await request(app).get("/admin/bookings/timeline");

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe("Failed to retrieve booking timeline");
    });

    it("should not include past bookings in the timeline", async () => {
      // Mock Date.now to make test predictable
      const originalDateNow = Date.now;
      const mockNow = new Date("2023-01-10T12:00:00Z").getTime();
      global.Date.now = jest.fn(() => mockNow);

      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
        phone: "+123456789",
      });

      // Create past bookings (yesterday and last week)
      const yesterdayBooking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-09T15:00:00Z"), // Yesterday
        eventEndTime: new Date("2023-01-09T16:00:00Z"),
        eventName: "Yesterday's Booking",
        status: "Completed",
        location: { type: "in-person", inPersonLocation: "Office" },
      });

      const lastWeekBooking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-03T14:00:00Z"), // Last week
        eventEndTime: new Date("2023-01-03T15:00:00Z"),
        eventName: "Last Week's Booking",
        status: "Completed",
        location: { type: "online", join_url: "https://zoom.us/j/123456" },
      });

      // Create one valid booking for today to ensure the query works
      const todayBooking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-10T15:00:00Z"), // Today
        eventEndTime: new Date("2023-01-10T16:00:00Z"),
        eventName: "Today's Booking",
        status: "Active",
        location: { type: "in-person", inPersonLocation: "Office" },
      });

      const res = await request(app).get("/admin/bookings/timeline");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("bookings");
      expect(res.body.bookings.length).toBe(1);

      // Only today's booking should be returned
      expect(res.body.bookings[0]._id.toString()).toBe(
        todayBooking._id.toString()
      );

      // Verify past bookings are not included
      const pastBookingIds = [
        yesterdayBooking._id.toString(),
        lastWeekBooking._id.toString(),
      ];
      const returnedBookingIds = res.body.bookings.map((b) => b._id.toString());
      expect(returnedBookingIds).not.toContain(pastBookingIds[0]);
      expect(returnedBookingIds).not.toContain(pastBookingIds[1]);

      // Restore original Date.now
      global.Date.now = originalDateNow;
    });

    it("should not include bookings beyond one week in the timeline", async () => {
      // Mock Date.now to make test predictable
      const originalDateNow = Date.now;
      const mockNow = new Date("2023-01-10T12:00:00Z").getTime();
      global.Date.now = jest.fn(() => mockNow);

      // Create test user
      const testUser = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "hashed_password",
        accountType: "domestic",
        phone: "+123456789",
      });

      // Create booking exactly one week from today (should be included)
      const oneWeekBooking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-17T11:59:59Z"), // Exactly one week from today
        eventEndTime: new Date("2023-01-17T12:59:59Z"),
        eventName: "One Week Booking",
        status: "Active",
        location: { type: "in-person", inPersonLocation: "Office" },
      });

      // Create booking beyond one week (should NOT be included)
      const beyondOneWeekBooking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-18T00:00:01Z"), // Just beyond one week
        eventEndTime: new Date("2023-01-18T01:00:01Z"),
        eventName: "Beyond One Week Booking",
        status: "Active",
        location: { type: "online", join_url: "https://zoom.us/j/123456" },
      });

      // Create booking for tomorrow (should be included as control)
      const tomorrowBooking = await Booking.create({
        userId: testUser._id,
        eventStartTime: new Date("2023-01-11T15:00:00Z"), // Tomorrow
        eventEndTime: new Date("2023-01-11T16:00:00Z"),
        eventName: "Tomorrow's Booking",
        status: "Active",
        location: { type: "in-person", inPersonLocation: "Office" },
      });

      const res = await request(app).get("/admin/bookings/timeline");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("bookings");
      expect(res.body.bookings.length).toBe(2);

      // Verify correct bookings are included
      const returnedBookingIds = res.body.bookings.map((b) => b._id.toString());
      expect(returnedBookingIds).toContain(oneWeekBooking._id.toString());
      expect(returnedBookingIds).toContain(tomorrowBooking._id.toString());

      // Verify booking beyond one week is not included
      expect(returnedBookingIds).not.toContain(
        beyondOneWeekBooking._id.toString()
      );

      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
  });
});
