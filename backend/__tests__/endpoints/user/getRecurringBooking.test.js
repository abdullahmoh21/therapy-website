const {
  setupUserApp,
  setupDatabase,
  User,
  Booking,
  Payment,
  createObjectId,
  verifyJWT,
} = require("../testSetup");
const request = require("supertest");

describe("GET /users/recurring - Get Recurring Booking", () => {
  const app = setupUserApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;
  let userId;
  let recurringSeriesId;

  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // Create a test user with recurring schedule
    userId = createObjectId();
    recurringSeriesId = createObjectId();

    await User.create({
      _id: userId,
      name: "Test User",
      email: "testuser@example.com",
      password: "hashedpassword123",
      phone: "1234567890",
      role: "user", // lowercase 'user' to match enum
      accountType: "domestic",
      emailVerified: {
        state: true,
      },
      recurring: {
        state: true,
        interval: "weekly",
        day: 1, // Monday
        time: "10:00",
        location: {
          type: "online",
        },
        recurringSeriesId: recurringSeriesId,
      },
    });
  });

  describe("Success Cases", () => {
    it("should return recurring schedule and next active booking", async () => {
      // Mock verifyJWT to return our user ID
      verifyJWT.mockImplementationOnce((req, res, next) => {
        req.user = { id: userId.toString() };
        next();
      });

      // Create multiple bookings
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Create first active booking (should be returned as next)
      const booking1 = await Booking.create({
        userId: userId,
        eventStartTime: tomorrow,
        eventEndTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: recurringSeriesId,
          interval: "weekly",
          day: 1,
          time: "10:00",
        },
        location: {
          type: "online",
          meetingLink: "https://zoom.us/test",
        },
      });

      // Create payment for first booking
      await Payment.create({
        bookingId: booking1._id,
        userId: userId,
        amount: 100,
        currency: "PKR",
        transactionStatus: "Completed",
        source: "system",
      });

      // Create second active booking
      await Booking.create({
        userId: userId,
        eventStartTime: nextWeek,
        eventEndTime: new Date(nextWeek.getTime() + 60 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: recurringSeriesId,
          interval: "weekly",
          day: 1,
          time: "10:00",
        },
        location: {
          type: "online",
          meetingLink: "https://zoom.us/test",
        },
      });

      const res = await request(app).get("/users/recurring").expect(200);

      expect(res.body).toHaveProperty("recurringSchedule");
      expect(res.body.recurringSchedule).toEqual({
        interval: "weekly",
        day: 1,
        time: "10:00",
        location: {
          type: "online",
        },
      });

      expect(res.body).toHaveProperty("nextRecurringBooking");
      expect(res.body.nextRecurringBooking).toBeTruthy();
      expect(res.body.nextRecurringBooking.amount).toBe(100);
      expect(res.body.nextRecurringBooking.currency).toBe("PKR");
      expect(res.body.nextRecurringBooking.transactionStatus).toBe("Completed");
    });

    it("should skip cancelled bookings and return next active one", async () => {
      // Mock verifyJWT to return our user ID
      verifyJWT.mockImplementationOnce((req, res, next) => {
        req.user = { id: userId.toString() };
        next();
      });

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Create a CANCELLED booking (should be skipped)
      await Booking.create({
        userId: userId,
        eventStartTime: tomorrow,
        eventEndTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        status: "Cancelled", // This one is cancelled
        source: "system",
        recurring: {
          state: true,
          seriesId: recurringSeriesId,
          interval: "weekly",
          day: 1,
          time: "10:00",
        },
        location: {
          type: "online",
        },
        cancellation: {
          reason: "User cancelled",
          date: new Date(),
          cancelledBy: "User",
        },
      });

      // Create an active booking (should be returned)
      const activeBooking = await Booking.create({
        userId: userId,
        eventStartTime: nextWeek,
        eventEndTime: new Date(nextWeek.getTime() + 60 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: recurringSeriesId,
          interval: "weekly",
          day: 1,
          time: "10:00",
        },
        location: {
          type: "online",
          meetingLink: "https://zoom.us/test2",
        },
      });

      const res = await request(app).get("/users/recurring").expect(200);

      expect(res.body).toHaveProperty("nextRecurringBooking");
      expect(res.body.nextRecurringBooking).toBeTruthy();
      // Should return the next week's booking, not the cancelled one
      expect(res.body.nextRecurringBooking.location.meetingLink).toBe(
        "https://zoom.us/test2"
      );
      expect(
        new Date(res.body.nextRecurringBooking.eventStartTime).getTime()
      ).toBe(nextWeek.getTime());
    });

    it("should return null nextRecurringBooking when all sessions are cancelled", async () => {
      // Mock verifyJWT to return our user ID
      verifyJWT.mockImplementationOnce((req, res, next) => {
        req.user = { id: userId.toString() };
        next();
      });

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create only cancelled bookings
      await Booking.create({
        userId: userId,
        eventStartTime: tomorrow,
        eventEndTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        status: "Cancelled",
        source: "system",
        recurring: {
          state: true,
          seriesId: recurringSeriesId,
          interval: "weekly",
          day: 1,
          time: "10:00",
        },
        location: {
          type: "online",
        },
        cancellation: {
          reason: "User cancelled",
          date: new Date(),
          cancelledBy: "User",
        },
      });

      const res = await request(app).get("/users/recurring").expect(200);

      expect(res.body).toHaveProperty("recurringSchedule");
      expect(res.body).toHaveProperty("nextRecurringBooking");
      expect(res.body.nextRecurringBooking).toBeNull();
    });

    it("should return empty object when recurring is not enabled", async () => {
      // Mock verifyJWT to return our user ID
      verifyJWT.mockImplementationOnce((req, res, next) => {
        req.user = { id: userId.toString() };
        next();
      });

      // Update user to disable recurring
      await User.findByIdAndUpdate(userId, {
        "recurring.state": false,
      });

      const res = await request(app).get("/users/recurring").expect(200);

      expect(res.body).toEqual({});
    });
  });

  describe("Error Cases", () => {
    it("should return 401 without valid token", async () => {
      // Mock verifyJWT to simulate an unauthenticated request
      verifyJWT.mockImplementationOnce((req, res, next) => {
        return res.status(401).json({ message: "Unauthorized" });
      });

      const res = await request(app).get("/users/recurring");

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });
});
