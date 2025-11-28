// Set environment variables
process.env.NODE_ENV = "test";

// Mock googleapis
const mockCalendarEventsDelete = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        delete: mockCalendarEventsDelete,
      },
    })),
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

// Mock models
const mockBookingSave = jest.fn();
const mockBookingFindById = jest.fn();
const mockUserFindById = jest.fn();

jest.mock("../../../models/Booking", () => ({
  findById: mockBookingFindById,
}));

jest.mock("../../../models/User", () => ({
  findById: mockUserFindById,
}));

// Mock logger
jest.mock("../../../logs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock googleOAuth
const mockCreateOAuth2Client = jest.fn();
const mockGetSystemCalendar = jest.fn();

jest.mock("../../../utils/googleOAuth", () => ({
  createOAuth2Client: mockCreateOAuth2Client,
  getSystemCalendar: mockGetSystemCalendar,
}));

// Mock job scheduler for sendEmail
jest.mock("../../../utils/queue/jobScheduler", () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: "email-job-123" }),
}));

const handleGoogleCalendarCancellation = require("../../../utils/queue/jobs/cancelGoogleCalendarEvent");
const logger = require("../../../logs/logger");
const { sendEmail } = require("../../../utils/queue/jobScheduler");

describe("handleGoogleCalendarCancellation", () => {
  let mockBooking, mockUser, jobData;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default booking mock
    mockBooking = {
      _id: "booking123",
      userId: "user123",
      googleEventId: "google-event-123",
      eventStartTime: new Date("2025-12-01T10:00:00Z"),
      eventEndTime: new Date("2025-12-01T11:00:00Z"),
      eventTimezone: "Asia/Karachi",
      bookingId: 1001,
      paymentId: "payment123",
      syncStatus: {},
      save: mockBookingSave,
      markModified: jest.fn(),
    };

    mockBookingSave.mockResolvedValue(mockBooking);
    mockBookingFindById.mockResolvedValue(mockBooking);

    // Setup default user mock
    mockUser = {
      _id: "user123",
      name: "John Doe",
      email: "john@example.com",
    };

    mockUserFindById.mockResolvedValue(mockUser);

    // Setup default Google Calendar mocks
    mockCreateOAuth2Client.mockResolvedValue({});
    mockGetSystemCalendar.mockResolvedValue("primary");
    mockCalendarEventsDelete.mockResolvedValue({ status: 204 });

    jobData = {
      data: {
        bookingId: "booking123",
        notifyUser: false,
      },
    };
  });

  describe("Input validation and booking retrieval", () => {
    it("should fail when booking is not found", async () => {
      mockBookingFindById.mockResolvedValue(null);

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result).toEqual({
        success: false,
        error: "Booking not found",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Booking booking123 not found")
      );
    });

    it("should fail when no Google Calendar event ID exists", async () => {
      mockBooking.googleEventId = null;

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result).toEqual({
        success: false,
        error: "No Google Calendar event ID",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("No Google Calendar event ID found")
      );
    });
  });

  describe("Google Calendar event deletion", () => {
    it("should successfully delete Google Calendar event", async () => {
      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result).toEqual({
        success: true,
        eventId: "google-event-123",
      });
      expect(mockCalendarEventsDelete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "google-event-123",
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Google Calendar event google-event-123 deleted successfully"
        )
      );
    });

    it("should update booking sync status after deletion", async () => {
      await handleGoogleCalendarCancellation(jobData);

      expect(mockBooking.syncStatus.google).toBe("synced");
      expect(mockBooking.syncStatus.lastSyncAttempt).toBeInstanceOf(Date);
      expect(mockBooking.markModified).toHaveBeenCalledWith("syncStatus");
      expect(mockBookingSave).toHaveBeenCalled();
    });

    it("should use OAuth client and system calendar", async () => {
      await handleGoogleCalendarCancellation(jobData);

      expect(mockCreateOAuth2Client).toHaveBeenCalled();
      expect(mockGetSystemCalendar).toHaveBeenCalled();
    });
  });

  describe("User notification handling", () => {
    beforeEach(() => {
      jobData.data.notifyUser = true;
      jobData.data.reason = "Therapist unavailable";
    });

    it("should send email notification when notifyUser is true", async () => {
      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
      expect(mockUserFindById).toHaveBeenCalledWith("user123");
      expect(sendEmail).toHaveBeenCalledWith(
        "BookingCancellationNotifications",
        expect.objectContaining({
          bookingId: "booking123",
          userId: "user123",
          cancelledBy: "admin",
          reason: "Therapist unavailable",
          eventStartTime: mockBooking.eventStartTime,
          paymentId: "payment123",
          bookingIdNumber: 1001,
          notifyAdmin: false,
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Queued cancellation notification")
      );
    });

    it("should use default reason if none provided", async () => {
      delete jobData.data.reason;

      await handleGoogleCalendarCancellation(jobData);

      expect(sendEmail).toHaveBeenCalledWith(
        "BookingCancellationNotifications",
        expect.objectContaining({
          reason: "Session cancelled",
        })
      );
    });

    it("should handle null paymentId gracefully", async () => {
      mockBooking.paymentId = null;

      await handleGoogleCalendarCancellation(jobData);

      expect(sendEmail).toHaveBeenCalledWith(
        "BookingCancellationNotifications",
        expect.objectContaining({
          paymentId: null,
        })
      );
    });

    it("should not fail job if email sending fails", async () => {
      sendEmail.mockRejectedValueOnce(new Error("Email service error"));

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send cancellation email")
      );
    });

    it("should skip email if user is not found", async () => {
      mockUserFindById.mockResolvedValue(null);

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not send notification when notifyUser is false", async () => {
      jobData.data.notifyUser = false;

      await handleGoogleCalendarCancellation(jobData);

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should handle 404 error as successful deletion", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result).toEqual({
        success: true,
        error: "Event not found in Google Calendar",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Event not found in Google Calendar")
      );
    });

    it("should handle notFound error message as successful deletion", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 400,
        message: "notFound: Event not found",
      });

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
    });

    it("should still send notification email after 404 error if requested", async () => {
      jobData.data.notifyUser = true;
      jobData.data.reason = "Session cancelled";

      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalled();
    });

    it("should handle email error after 404 gracefully", async () => {
      jobData.data.notifyUser = true;

      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });
      sendEmail.mockRejectedValueOnce(new Error("Email failed"));

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send cancellation email after 404")
      );
    });

    it("should return failure for non-404 Google Calendar errors", async () => {
      const apiError = new Error("Google Calendar API error");
      mockCalendarEventsDelete.mockRejectedValueOnce(apiError);

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result).toEqual({
        success: false,
        error: "Google Calendar API error",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Google Calendar cancellation error")
      );
    });

    it("should handle 403 forbidden errors", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 403,
        message: "Forbidden",
      });

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden");
    });

    it("should handle 401 authentication errors", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 401,
        message: "Unauthorized",
      });

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("Logging", () => {
    it("should log debug information throughout the process", async () => {
      await handleGoogleCalendarCancellation(jobData);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("handleGoogleCalendarCancellation job started")
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Fetching booking data")
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Deleting Google Calendar event ID")
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Using calendar ID")
      );
    });

    it("should log detailed error stack on failure", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace";
      mockCalendarEventsDelete.mockRejectedValueOnce(error);

      await handleGoogleCalendarCancellation(jobData);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Error details: Error stack trace")
      );
    });
  });

  describe("Date formatting for notifications", () => {
    it("should format dates for email correctly", async () => {
      jobData.data.notifyUser = true;
      mockBooking.eventStartTime = new Date("2025-12-01T10:00:00Z");

      await handleGoogleCalendarCancellation(jobData);

      expect(sendEmail).toHaveBeenCalledWith(
        "BookingCancellationNotifications",
        expect.objectContaining({
          eventStartTime: mockBooking.eventStartTime,
          cancellationDate: expect.any(Date),
        })
      );
    });

    it("should use booking timezone when available", async () => {
      jobData.data.notifyUser = true;
      mockBooking.eventTimezone = "America/New_York";

      await handleGoogleCalendarCancellation(jobData);

      // The function should handle timezone properly in date formatting
      expect(sendEmail).toHaveBeenCalled();
    });

    it("should default to Asia/Karachi timezone if not specified", async () => {
      jobData.data.notifyUser = true;
      delete mockBooking.eventTimezone;

      await handleGoogleCalendarCancellation(jobData);

      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle missing booking properties gracefully", async () => {
      jobData.data.notifyUser = true;
      delete mockBooking.bookingId;
      delete mockBooking.paymentId;

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        "BookingCancellationNotifications",
        expect.objectContaining({
          bookingIdNumber: undefined,
          paymentId: null,
        })
      );
    });

    it("should handle very long reason text", async () => {
      jobData.data.notifyUser = true;
      jobData.data.reason = "A".repeat(1000); // Very long reason

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        "BookingCancellationNotifications",
        expect.objectContaining({
          reason: "A".repeat(1000),
        })
      );
    });

    it("should handle booking with only required fields", async () => {
      const minimalBooking = {
        _id: "booking123",
        userId: "user123",
        googleEventId: "event-123",
        eventStartTime: new Date(),
        syncStatus: {},
        save: mockBookingSave,
        markModified: jest.fn(),
      };

      mockBookingFindById.mockResolvedValue(minimalBooking);

      const result = await handleGoogleCalendarCancellation(jobData);

      expect(result.success).toBe(true);
    });
  });

  describe("Concurrent operations", () => {
    it("should handle multiple cancellations independently", async () => {
      const jobs = [
        { data: { bookingId: "booking1" } },
        { data: { bookingId: "booking2" } },
        { data: { bookingId: "booking3" } },
      ];

      const results = await Promise.all(
        jobs.map((job) => handleGoogleCalendarCancellation(job))
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
      expect(mockCalendarEventsDelete).toHaveBeenCalledTimes(3);
    });
  });
});
