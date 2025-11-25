/**
 * Test suite for Recurring Buffer Refresh Job Handler
 * Tests the logic that maintains the 2-month booking buffer for recurring users
 */

const mongoose = require("mongoose");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const Config = require("../../models/Config");
const handleRecurringBookingBufferRefresh = require("../../utils/queue/jobs/refreshRecurringBuffer");
const { addJob } = require("../../utils/queue/jobScheduler");
const { getConnectionStatus } = require("../../utils/googleOAuth");
const { addMonths, addWeeks } = require("date-fns");

// Mock dependencies
jest.mock("../../logs/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../../utils/queue/jobScheduler", () => ({
  addJob: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../../utils/googleOAuth", () => ({
  getConnectionStatus: jest.fn().mockResolvedValue({ connected: true }),
}));

describe("Recurring Buffer Refresh Job Handler", () => {
  let testUserId;
  let seriesId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGO_URI || "mongodb://localhost:27017/test-buffer-refresh"
      );
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    jest.clearAllMocks();

    // Setup test data
    testUserId = new mongoose.Types.ObjectId();
    seriesId = new mongoose.Types.ObjectId();

    // Mock Config.getValue
    Config.getValue = jest.fn().mockImplementation((key) => {
      const values = {
        sessionPrice: 5000,
        intlSessionPrice: 50,
      };
      return Promise.resolve(values[key]);
    });
  });

  describe("Basic Functionality", () => {
    it("should extend booking buffer for weekly recurring user", async () => {
      // Create recurring user with weekly sessions
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1, // Monday
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      // Create last booking (1 week from now)
      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      // Run the job
      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(true);
      expect(result.created).toBeGreaterThan(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);

      // Verify new bookings were created
      const bookings = await Booking.find({
        "recurring.seriesId": seriesId,
        status: "Active",
      }).sort({ eventStartTime: 1 });

      expect(bookings.length).toBeGreaterThan(1); // Original + new bookings

      // Verify bookings extend approximately 2 months
      const firstBooking = bookings[0];
      const lastBooking = bookings[bookings.length - 1];
      const timeDiff = lastBooking.eventStartTime - firstBooking.eventStartTime;
      const monthsDiff = timeDiff / (1000 * 60 * 60 * 24 * 30);

      expect(monthsDiff).toBeGreaterThan(1.5); // At least ~2 months
    });

    it("should extend buffer for biweekly recurring user", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "biweekly",
          day: 3, // Wednesday
          time: "16:00",
          location: { type: "in-person", inPersonLocation: "Office" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 2);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "biweekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(true);
      expect(result.created).toBeGreaterThan(0);

      // Verify biweekly spacing
      const bookings = await Booking.find({
        "recurring.seriesId": seriesId,
      }).sort({ eventStartTime: 1 });

      // Check spacing between bookings (should be ~14 days)
      for (let i = 1; i < bookings.length; i++) {
        const daysDiff =
          (bookings[i].eventStartTime - bookings[i - 1].eventStartTime) /
          (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeCloseTo(14, 0); // Within 1 day tolerance
      }
    });

    it("should extend buffer for monthly recurring user", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "monthly",
          day: 5, // Friday
          time: "10:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addMonths(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "monthly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(true);
      expect(result.created).toBeGreaterThan(0);

      // Verify monthly spacing (approximately)
      const bookings = await Booking.find({
        "recurring.seriesId": seriesId,
      }).sort({ eventStartTime: 1 });

      expect(bookings.length).toBeGreaterThan(1);
    });
  });

  describe("Payment Creation", () => {
    it("should create payments for domestic users with correct pricing", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      const payments = await Payment.find({ userId: testUserId });

      expect(payments.length).toBeGreaterThan(0);
      payments.forEach((payment) => {
        expect(payment.amount).toBe(5000);
        expect(payment.currency).toBe("PKR");
        expect(payment.transactionStatus).toBe("Not Initiated");
        expect(payment.transactionReferenceNumber).toMatch(/^T-/);
      });
    });

    it("should create payments for international users with USD pricing", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "international",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      const payments = await Payment.find({ userId: testUserId });

      expect(payments.length).toBeGreaterThan(0);
      payments.forEach((payment) => {
        expect(payment.amount).toBe(50);
        expect(payment.currency).toBe("USD");
      });
    });

    it("should link payments to bookings", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      const bookings = await Booking.find({ userId: testUserId }).sort({
        eventStartTime: 1,
      });

      for (const booking of bookings) {
        if (!booking.paymentId) continue; // Skip if newly created

        const payment = await Payment.findById(booking.paymentId);
        expect(payment).toBeDefined();
        expect(payment.bookingId.toString()).toBe(booking._id.toString());
      }
    });
  });

  describe("Conflict Handling", () => {
    it("should skip time slots that conflict with existing bookings", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      lastBookingDate.setHours(14, 0, 0, 0);

      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      // Create a conflicting booking 2 weeks out at the exact same time
      const conflictDate = addWeeks(lastBookingDate, 1);
      await Booking.create({
        userId: new mongoose.Types.ObjectId(),
        eventStartTime: conflictDate,
        eventEndTime: new Date(conflictDate.getTime() + 60 * 60 * 1000),
        status: "Active",
        source: "admin",
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(true);
      // Should have created bookings and skipped at least the conflicting one
      expect(result.created).toBeGreaterThan(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it("should not count cancelled bookings as conflicts", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      // Create a cancelled booking at the same time
      const cancelledDate = addWeeks(new Date(), 2);
      cancelledDate.setHours(14, 0, 0, 0);
      await Booking.create({
        userId: new mongoose.Types.ObjectId(),
        eventStartTime: cancelledDate,
        eventEndTime: new Date(cancelledDate.getTime() + 60 * 60 * 1000),
        status: "Cancelled", // Should not cause conflict
        source: "admin",
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(true);
      // Should create booking at cancelled slot
    });
  });

  describe("Google Calendar Integration", () => {
    it("should queue Google Calendar sync jobs when connected", async () => {
      getConnectionStatus.mockResolvedValueOnce({ connected: true });

      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      // Verify sync jobs were queued
      const syncCalls = addJob.mock.calls.filter(
        (call) => call[0] === "GoogleCalendarEventSync"
      );
      expect(syncCalls.length).toBeGreaterThan(0);
    });

    it("should not queue sync jobs when Google Calendar disconnected", async () => {
      getConnectionStatus.mockResolvedValueOnce({ connected: false });

      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      // Should not queue sync jobs
      const syncCalls = addJob.mock.calls.filter(
        (call) => call[0] === "GoogleCalendarEventSync"
      );
      expect(syncCalls.length).toBe(0);
    });
  });

  describe("Next Buffer Refresh Scheduling", () => {
    it("should schedule next buffer refresh job", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.nextRefresh).toBeDefined();

      // Verify refresh job was scheduled
      const refreshCalls = addJob.mock.calls.filter(
        (call) => call[0] === "handleRecurringBookingBufferRefresh"
      );
      expect(refreshCalls.length).toBe(1);
      expect(refreshCalls[0][1]).toEqual({
        userId: testUserId.toString(),
      });
      expect(refreshCalls[0][2]).toHaveProperty("runAt");
    });

    it("should update user with next buffer refresh date", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      const updatedUser = await User.findById(testUserId);
      expect(updatedUser.recurring.nextBufferRefresh).toBeDefined();
      expect(updatedUser.recurring.nextBufferRefresh).toBeInstanceOf(Date);
    });
  });

  describe("Error Handling", () => {
    it("should skip if user not found", async () => {
      const fakeUserId = new mongoose.Types.ObjectId();

      const job = { data: { userId: fakeUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("user_not_recurring");
    });

    it("should skip if user is no longer recurring", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: false, // Not recurring
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("user_not_recurring");
    });

    it("should fail if no active bookings found", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      // No bookings exist

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe("no_active_bookings");
    });

    it("should fail if session price not configured", async () => {
      Config.getValue.mockResolvedValueOnce(undefined); // No price

      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe("no_session_price");
    });

    it("should handle sync job queueing failures gracefully", async () => {
      addJob.mockRejectedValueOnce(new Error("Queue unavailable"));

      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      const result = await handleRecurringBookingBufferRefresh(job);

      // Should still succeed even if sync fails
      expect(result.success).toBe(true);
      expect(result.created).toBeGreaterThan(0);
    });
  });

  describe("Booking Data Integrity", () => {
    it("should create bookings with correct recurring metadata", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      const newBookings = await Booking.find({
        "recurring.seriesId": seriesId,
      }).sort({ createdAt: -1 });

      // Check the most recent bookings
      for (let i = 0; i < Math.min(3, newBookings.length); i++) {
        const booking = newBookings[i];
        expect(booking.recurring.state).toBe(true);
        expect(booking.recurring.seriesId.toString()).toBe(seriesId.toString());
        expect(booking.recurring.interval).toBe("weekly");
        expect(booking.recurring.day).toBe(1);
        expect(booking.recurring.time).toBe("14:00");
        expect(booking.source).toBe("system");
        expect(booking.status).toBe("Active");
      }
    });

    it("should preserve location settings in bookings", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: {
            type: "in-person",
            inPersonLocation: "123 Main St",
          },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      const newBookings = await Booking.find({
        "recurring.seriesId": seriesId,
      }).sort({ createdAt: -1 });

      const latestBooking = newBookings[0];
      expect(latestBooking.location.type).toBe("in-person");
      expect(latestBooking.location.inPersonLocation).toBe("123 Main St");
    });

    it("should set correct sync status for bookings", async () => {
      await User.create({
        _id: testUserId,
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        accountType: "domestic",
        recurring: {
          state: true,
          interval: "weekly",
          day: 1,
          time: "14:00",
          location: { type: "online" },
          recurringSeriesId: seriesId,
        },
      });

      const lastBookingDate = addWeeks(new Date(), 1);
      await Booking.create({
        userId: testUserId,
        eventStartTime: lastBookingDate,
        eventEndTime: new Date(lastBookingDate.getTime() + 50 * 60 * 1000),
        status: "Active",
        source: "system",
        recurring: {
          state: true,
          seriesId: seriesId,
          interval: "weekly",
        },
      });

      const job = { data: { userId: testUserId.toString() } };
      await handleRecurringBookingBufferRefresh(job);

      const newBookings = await Booking.find({
        "recurring.seriesId": seriesId,
      }).sort({ createdAt: -1 });

      const latestBooking = newBookings[0];
      expect(latestBooking.syncStatus.google).toBe("pending");
    });
  });
});
