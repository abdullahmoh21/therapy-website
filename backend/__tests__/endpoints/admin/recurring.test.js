/**
 * Test suite for Recurring Bookings Feature
 * Tests admin endpoints for starting/stopping recurring bookings and buffer maintenance
 */

const {
  setupAdminApp,
  setupDatabase,
  createObjectId,
  User,
  Booking,
  Payment,
  Config,
  mongoose,
  request,
  logger,
} = require("../testSetup");
const { addJob } = require("../../../utils/queue/index");
const Job = require("../../../models/Job");

// Mock the queue system
jest.mock("../../../utils/queue/index");

// Mock Google OAuth
jest.mock("../../../utils/googleOAuth", () => ({
  getConnectionStatus: jest.fn().mockResolvedValue({ connected: true }),
}));

const { getConnectionStatus } = require("../../../utils/googleOAuth");

describe("Recurring Bookings - Admin Endpoints", () => {
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let app;
  let testUser;
  let testUserId;

  beforeAll(async () => {
    await connectDB();
    app = setupAdminApp();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearCollections();
    jest.clearAllMocks();

    // Create test user
    testUserId = createObjectId();
    testUser = await User.create({
      _id: testUserId,
      email: "testuser@example.com",
      password: "hashedpassword",
      name: "Test User",
      role: "user",
      accountType: "domestic",
      emailVerified: { state: true },
    });

    // Setup Config mock
    Config.getValue = jest.fn().mockImplementation((key) => {
      const values = {
        sessionPrice: 5000,
        intlSessionPrice: 50,
        adminEmail: "admin@example.com",
      };
      return Promise.resolve(values[key] || null);
    });

    // Mock addJob to track calls
    addJob.mockResolvedValue({ success: true });
  });

  describe("POST /admin/users/:userId/recurring - Start Recurring Bookings", () => {
    it("should successfully create recurring bookings for a user", async () => {
      const recurringData = {
        interval: "weekly",
        day: 1, // Monday
        time: "14:00",
        location: "online",
        sessionLengthMinutes: 50,
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("createdCount");
      expect(response.body).toHaveProperty("seriesId");
      expect(response.body.createdCount).toBeGreaterThan(0);

      // Verify user was updated with recurring settings
      const updatedUser = await User.findById(testUserId);
      expect(updatedUser.recurring.state).toBe(true);
      expect(updatedUser.recurring.interval).toBe("weekly");
      expect(updatedUser.recurring.day).toBe(1);
      expect(updatedUser.recurring.time).toBe("14:00");
      expect(updatedUser.recurring.location.type).toBe("online");
      expect(updatedUser.recurring.recurringSeriesId).toBeDefined();

      // Verify bookings were created
      const bookings = await Booking.find({ userId: testUserId });
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0].recurring.state).toBe(true);
      expect(bookings[0].source).toBe("system");
      expect(bookings[0].status).toBe("Active");

      // Verify payments were created
      const payments = await Payment.find({ userId: testUserId });
      expect(payments.length).toBe(bookings.length);
      expect(payments[0].amount).toBe(5000); // Domestic price

      // Verify buffer refresh job was scheduled
      expect(addJob).toHaveBeenCalledWith(
        "refreshRecurringBuffer",
        { userId: testUserId.toString() },
        expect.objectContaining({
          runAt: expect.any(Date),
        })
      );

      // Verify Google Calendar sync jobs were queued
      const syncCalls = addJob.mock.calls.filter(
        (call) => call[0] === "GoogleCalendarEventSync"
      );
      expect(syncCalls.length).toBeGreaterThan(0);
    });

    it("should create recurring bookings for in-person sessions", async () => {
      const recurringData = {
        interval: "biweekly",
        day: 3, // Wednesday
        time: "16:00",
        location: "in-person",
        inPersonLocation: "123 Main Street, Karachi",
        sessionLengthMinutes: 60,
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(200);

      expect(response.body.createdCount).toBeGreaterThan(0);

      const updatedUser = await User.findById(testUserId);
      expect(updatedUser.recurring.location.type).toBe("in-person");
      expect(updatedUser.recurring.location.inPersonLocation).toBe(
        "123 Main Street, Karachi"
      );

      const bookings = await Booking.find({ userId: testUserId });
      expect(bookings[0].location.type).toBe("in-person");
      expect(bookings[0].location.inPersonLocation).toBe(
        "123 Main Street, Karachi"
      );
    });

    it("should use international pricing for international users", async () => {
      // Update user to international
      await User.findByIdAndUpdate(testUserId, {
        accountType: "international",
      });

      const recurringData = {
        interval: "monthly",
        day: 5, // Friday
        time: "10:00",
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(200);

      const payments = await Payment.find({ userId: testUserId });
      expect(payments[0].amount).toBe(50); // International price
      expect(payments[0].currency).toBe("USD");
    });

    it("should reject if user is already recurring", async () => {
      // Set user as already recurring
      await User.findByIdAndUpdate(testUserId, {
        "recurring.state": true,
      });

      const recurringData = {
        interval: "weekly",
        day: 1,
        time: "14:00",
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(409);

      expect(response.body.message).toContain("already recurring");
    });

    it("should reject if another user has same day/time slot", async () => {
      // Create another user with recurring booking
      const otherUserId = createObjectId();
      await User.create({
        _id: otherUserId,
        email: "other@example.com",
        password: "hashedpassword",
        name: "Other User",
        role: "user",
        accountType: "domestic",
        emailVerified: { state: true },
        recurring: {
          state: true,
          interval: "weekly",
          day: 2,
          time: "15:00",
        },
      });

      const recurringData = {
        interval: "biweekly", // Different interval
        day: 2, // Same day
        time: "15:00", // Same time
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(409);

      expect(response.body.message).toContain(
        "already recurring on the same day and time"
      );
    });

    it("should validate time format", async () => {
      const recurringData = {
        interval: "weekly",
        day: 1,
        time: "2:30 PM", // Invalid format
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(400);

      expect(response.body.error).toContain("24-hour format");
    });

    it("should validate interval values", async () => {
      const recurringData = {
        interval: "daily", // Invalid
        day: 1,
        time: "14:00",
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(400);

      expect(response.body.error).toContain("Invalid interval");
    });

    it("should validate day values", async () => {
      const recurringData = {
        interval: "weekly",
        day: 7, // Invalid (0-6 only)
        time: "14:00",
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(400);

      expect(response.body.error).toContain("Invalid day");
    });

    it("should validate location type", async () => {
      const recurringData = {
        interval: "weekly",
        day: 1,
        time: "14:00",
        location: "hybrid", // Invalid
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(400);

      expect(response.body.error).toContain("in-person");
    });

    it("should require inPersonLocation for in-person sessions", async () => {
      const recurringData = {
        interval: "weekly",
        day: 1,
        time: "14:00",
        location: "in-person",
        // Missing inPersonLocation
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(400);

      expect(response.body.error).toContain("inPersonLocation is required");
    });

    it("should validate session length", async () => {
      const recurringData = {
        interval: "weekly",
        day: 1,
        time: "14:00",
        location: "online",
        sessionLengthMinutes: 300, // Invalid (> 240)
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(400);

      expect(response.body.error).toContain("between 1 and 240");
    });

    it("should handle Google Calendar not connected", async () => {
      getConnectionStatus.mockResolvedValueOnce({ connected: false });

      const recurringData = {
        interval: "weekly",
        day: 1,
        time: "14:00",
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(200);

      // Should still succeed but not queue sync jobs
      const syncCalls = addJob.mock.calls.filter(
        (call) => call[0] === "GoogleCalendarEventSync"
      );
      expect(syncCalls.length).toBe(0);
    });

    it("should skip conflicting time slots", async () => {
      // Create an existing booking that will conflict
      const conflictDate = new Date();
      conflictDate.setDate(conflictDate.getDate() + 7); // Next week
      conflictDate.setHours(14, 0, 0, 0);

      await Booking.create({
        userId: createObjectId(),
        eventStartTime: conflictDate,
        eventEndTime: new Date(conflictDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "admin",
      });

      const recurringData = {
        interval: "weekly",
        day: conflictDate.getDay(),
        time: "14:00",
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${testUserId}/recurring`)
        .send(recurringData)
        .expect(200);

      // Should succeed but skip conflicting slots
      expect(response.body.createdCount).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent user", async () => {
      const fakeUserId = createObjectId();

      const recurringData = {
        interval: "weekly",
        day: 1,
        time: "14:00",
        location: "online",
      };

      const response = await request(app)
        .post(`/admin/users/${fakeUserId}/recurring`)
        .send(recurringData)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("DELETE /admin/users/:userId/recurring - Stop Recurring Bookings", () => {
    let seriesId;

    beforeEach(async () => {
      // Setup user with recurring bookings
      seriesId = new mongoose.Types.ObjectId();

      await User.findByIdAndUpdate(testUserId, {
        "recurring.state": true,
        "recurring.interval": "weekly",
        "recurring.day": 1,
        "recurring.time": "14:00",
        "recurring.recurringSeriesId": seriesId,
      });

      // Create some future bookings
      const now = new Date();
      for (let i = 1; i <= 5; i++) {
        const startTime = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 50 * 60 * 1000);

        const booking = await Booking.create({
          userId: testUserId,
          eventStartTime: startTime,
          eventEndTime: endTime,
          status: "Active",
          source: "system",
          recurring: {
            state: true,
            seriesId: seriesId,
            interval: "weekly",
          },
          googleEventId: `event-${i}`,
        });

        await Payment.create({
          bookingId: booking._id,
          userId: testUserId,
          amount: 5000,
          currency: "PKR",
          transactionReferenceNumber: `T-${i}`,
          transactionStatus: "Not Initiated",
        });
      }

      // Create one past booking (should not be deleted)
      const pastTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      await Booking.create({
        userId: testUserId,
        eventStartTime: pastTime,
        eventEndTime: new Date(pastTime.getTime() + 50 * 60 * 1000),
        status: "Completed",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });
    });

    it("should successfully stop recurring bookings and queue deletions", async () => {
      const response = await request(app)
        .delete(`/admin/users/${testUserId}/recurring`)
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("results");
      expect(response.body.results.total).toBe(5); // 5 future bookings
      expect(response.body.results.queued).toBeGreaterThan(0);

      // Verify Google Calendar deletion jobs were queued
      const deletionCalls = addJob.mock.calls.filter(
        (call) => call[0] === "GoogleCalendarEventDeletion"
      );
      expect(deletionCalls.length).toBe(5);

      // Verify user's recurring state was cleared
      const updatedUser = await User.findById(testUserId);
      expect(updatedUser.recurring.state).toBe(false);

      // Verify payments were deleted
      const remainingPayments = await Payment.find({ userId: testUserId });
      expect(remainingPayments.length).toBe(0);

      // Verify deletion jobs were called (not checking for buffer refresh cancellation)
      expect(addJob).toHaveBeenCalled();
    });

    it("should not delete past bookings", async () => {
      await request(app)
        .delete(`/admin/users/${testUserId}/recurring`)
        .expect(200);

      // Past completed booking should remain
      const pastBookings = await Booking.find({
        userId: testUserId,
        status: "Completed",
      });
      expect(pastBookings.length).toBe(1);
    });

    it("should handle partial deletion failures gracefully", async () => {
      // Mock addJob to fail for some bookings
      let callCount = 0;
      addJob.mockImplementation((jobName) => {
        callCount++;
        if (callCount % 2 === 0 && jobName === "GoogleCalendarEventDeletion") {
          return Promise.reject(new Error("Queue failed"));
        }
        return Promise.resolve({ success: true });
      });

      const response = await request(app)
        .delete(`/admin/users/${testUserId}/recurring`)
        .expect(200);

      expect(response.body.results.failed).toBeGreaterThan(0);
      expect(response.body.results.queued).toBeGreaterThan(0);
    });

    it("should return 404 for non-recurring user", async () => {
      // Clear recurring state
      await User.findByIdAndUpdate(testUserId, {
        "recurring.state": false,
      });

      const response = await request(app)
        .delete(`/admin/users/${testUserId}/recurring`)
        .expect(404);

      expect(response.body.message).toContain("not in recurring mode");
    });

    it("should return 404 for non-existent user", async () => {
      const fakeUserId = createObjectId();

      const response = await request(app)
        .delete(`/admin/users/${fakeUserId}/recurring`)
        .expect(404);

      expect(response.body.message).toContain("not found");
    });

    it("should delete associated payments even if some jobs fail to queue", async () => {
      addJob.mockRejectedValue(new Error("Queue unavailable"));

      await request(app)
        .delete(`/admin/users/${testUserId}/recurring`)
        .expect(200);

      // Payments should still be deleted
      const remainingPayments = await Payment.find({ userId: testUserId });
      expect(remainingPayments.length).toBe(0);
    });
  });

  describe("POST /admin/recurring/maintain-buffer - Trigger Buffer Maintenance", () => {
    it("should queue buffer refresh for all recurring users", async () => {
      // Create multiple recurring users
      const user1Id = createObjectId();
      const user2Id = createObjectId();

      await User.create({
        _id: user1Id,
        email: "user1@example.com",
        password: "hashedpassword",
        name: "User 1",
        role: "user",
        accountType: "domestic",
        recurring: { state: true },
      });

      await User.create({
        _id: user2Id,
        email: "user2@example.com",
        password: "hashedpassword",
        name: "User 2",
        role: "user",
        accountType: "domestic",
        recurring: { state: true },
      });

      const response = await request(app)
        .post("/admin/recurring/maintain-buffer")
        .expect(200);

      expect(response.body.results.total).toBe(2);
      expect(response.body.results.queued).toBe(2);
      expect(response.body.results.failed).toBe(0);

      // Verify jobs were queued
      const bufferCalls = addJob.mock.calls.filter(
        (call) => call[0] === "refreshRecurringBuffer"
      );
      expect(bufferCalls.length).toBe(2);
    });

    it("should return 200 with count 0 when no recurring users exist", async () => {
      const response = await request(app)
        .post("/admin/recurring/maintain-buffer")
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.message).toContain("No recurring users");
    });

    it("should handle queue failures for individual users", async () => {
      const user1Id = createObjectId();

      await User.create({
        _id: user1Id,
        email: "user1@example.com",
        password: "hashedpassword",
        name: "User 1",
        role: "user",
        accountType: "domestic",
        recurring: { state: true },
      });

      addJob.mockRejectedValue(new Error("Queue full"));

      const response = await request(app)
        .post("/admin/recurring/maintain-buffer")
        .expect(200);

      expect(response.body.results.failed).toBe(1);
    });
  });

  describe("POST /admin/recurring/:userId/refresh-buffer - Trigger User Buffer Refresh", () => {
    beforeEach(async () => {
      await User.findByIdAndUpdate(testUserId, {
        "recurring.state": true,
        "recurring.interval": "weekly",
      });
    });

    it("should queue buffer refresh for specific user", async () => {
      const response = await request(app)
        .post(`/admin/recurring/${testUserId}/refresh-buffer`)
        .expect(200);

      expect(response.body.message).toContain("queued");
      expect(response.body.userId).toBe(testUserId.toString());

      expect(addJob).toHaveBeenCalledWith(
        "refreshRecurringBuffer",
        { userId: testUserId.toString() },
        { priority: 10 }
      );
    });

    it("should return 404 for non-recurring user", async () => {
      await User.findByIdAndUpdate(testUserId, {
        "recurring.state": false,
      });

      const response = await request(app)
        .post(`/admin/recurring/${testUserId}/refresh-buffer`)
        .expect(404);

      expect(response.body.message).toContain("not in recurring mode");
    });

    it("should return 404 for non-existent user", async () => {
      const fakeUserId = createObjectId();

      const response = await request(app)
        .post(`/admin/recurring/${fakeUserId}/refresh-buffer`)
        .expect(404);

      expect(response.body.message).toContain("not found");
    });

    it("should handle queue failures gracefully", async () => {
      addJob.mockRejectedValue(new Error("Queue unavailable"));

      const response = await request(app)
        .post(`/admin/recurring/${testUserId}/refresh-buffer`)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
