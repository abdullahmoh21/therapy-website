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
const mockBookingDeleteOne = jest.fn();
const mockBookingFindById = jest.fn();

jest.mock("../../../models/Booking", () => ({
  findById: mockBookingFindById,
  deleteOne: mockBookingDeleteOne,
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

const handleGoogleCalendarDeletion = require("../../../utils/queue/jobs/deleteCalendarEvent");
const Booking = require("../../../models/Booking");
const logger = require("../../../logs/logger");

describe("handleGoogleCalendarDeletion", () => {
  let mockBooking, job;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default booking mock
    mockBooking = {
      _id: "booking123",
      googleEventId: "google-event-123",
      userId: "user123",
      eventStartTime: new Date("2025-12-01T10:00:00Z"),
    };

    mockBookingFindById.mockResolvedValue(mockBooking);
    mockBookingDeleteOne.mockResolvedValue({ deletedCount: 1 });

    // Setup default Google Calendar mocks
    mockCreateOAuth2Client.mockResolvedValue({});
    mockGetSystemCalendar.mockResolvedValue("primary");
    mockCalendarEventsDelete.mockResolvedValue({ status: 204 });

    job = {
      data: {
        bookingId: "booking123",
      },
    };
  });

  describe("Input validation", () => {
    it("should fail when no booking ID is provided", async () => {
      const result = await handleGoogleCalendarDeletion({ data: {} });

      expect(result).toEqual({
        success: false,
        error: "No booking ID provided",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("No booking ID provided")
      );
    });

    it("should succeed if booking is already deleted", async () => {
      mockBookingFindById.mockResolvedValue(null);

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        message: "Booking already deleted",
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Booking booking123 not found in database, assuming already deleted"
        )
      );
      expect(mockCalendarEventsDelete).not.toHaveBeenCalled();
      expect(Booking.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe("Deleting bookings without Google Calendar event", () => {
    it("should delete booking from database only when no googleEventId", async () => {
      mockBooking.googleEventId = null;

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        deletedFromDatabase: true,
      });
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("No Google Calendar event ID for booking")
      );
      expect(mockCalendarEventsDelete).not.toHaveBeenCalled();
      expect(Booking.deleteOne).toHaveBeenCalledWith({ _id: "booking123" });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Deleted booking booking123 from database (no Google Calendar event)"
        )
      );
    });

    it("should handle database deletion failure gracefully", async () => {
      mockBooking.googleEventId = null;
      mockBookingDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        deletedFromDatabase: false,
      });
    });
  });

  describe("Deleting bookings with Google Calendar event", () => {
    it("should delete from both Google Calendar and database", async () => {
      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        deletedFromGoogle: true,
        deletedFromDatabase: true,
      });
      expect(mockCreateOAuth2Client).toHaveBeenCalled();
      expect(mockGetSystemCalendar).toHaveBeenCalled();
      expect(mockCalendarEventsDelete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "google-event-123",
      });
      expect(Booking.deleteOne).toHaveBeenCalledWith({ _id: "booking123" });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully deleted Google Calendar event google-event-123"
        )
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Deleted booking booking123 from database after Google Calendar deletion"
        )
      );
    });

    it("should use correct calendar ID from getSystemCalendar", async () => {
      mockGetSystemCalendar.mockResolvedValue("custom-calendar-id");

      await handleGoogleCalendarDeletion(job);

      expect(mockCalendarEventsDelete).toHaveBeenCalledWith({
        calendarId: "custom-calendar-id",
        eventId: "google-event-123",
      });
    });
  });

  describe("Google Calendar API error handling", () => {
    it("should handle 404 error and continue with database deletion", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        deletedFromGoogle: true,
        deletedFromDatabase: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Google Calendar event google-event-123 not found, assuming already deleted"
        )
      );
      expect(Booking.deleteOne).toHaveBeenCalled();
    });

    it("should handle 410 Gone error and continue with database deletion", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 410,
        message: "Gone",
      });

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        deletedFromGoogle: true,
        deletedFromDatabase: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Google Calendar event google-event-123 is gone (410), assuming already deleted"
        )
      );
      expect(Booking.deleteOne).toHaveBeenCalled();
    });

    it("should continue with database deletion on other Google Calendar errors", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 403,
        message: "Forbidden",
      });

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        deletedFromGoogle: true,
        deletedFromDatabase: true,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to delete Google Calendar event google-event-123"
        )
      );
      expect(Booking.deleteOne).toHaveBeenCalled();
    });

    it("should handle 401 authentication errors", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce({
        code: 401,
        message: "Unauthorized",
      });

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete Google Calendar event")
      );
      // Should still delete from database
      expect(Booking.deleteOne).toHaveBeenCalled();
    });

    it("should handle network errors gracefully", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce(
        new Error("Network error: ETIMEDOUT")
      );

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete Google Calendar event")
      );
      // Should still delete from database
      expect(Booking.deleteOne).toHaveBeenCalled();
    });
  });

  describe("Database deletion", () => {
    it("should handle database deletion errors", async () => {
      const dbError = new Error("Database error");
      mockBookingDeleteOne.mockRejectedValueOnce(dbError);

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: false,
        error: "Database error",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error in handleGoogleCalendarDeletion job")
      );
    });

    it("should reflect actual deletion status in response", async () => {
      mockBookingDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: true,
        deletedFromGoogle: true,
        deletedFromDatabase: false,
      });
    });

    it("should delete booking even if Google Calendar deletion fails", async () => {
      mockCalendarEventsDelete.mockRejectedValueOnce(
        new Error("Google API error")
      );

      await handleGoogleCalendarDeletion(job);

      expect(Booking.deleteOne).toHaveBeenCalledWith({ _id: "booking123" });
    });
  });

  describe("Error handling", () => {
    it("should handle general errors and return failure", async () => {
      const error = new Error("Unexpected error");
      mockBookingFindById.mockRejectedValueOnce(error);

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: false,
        error: "Unexpected error",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error in handleGoogleCalendarDeletion job")
      );
    });

    it("should log error stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace";
      mockBookingFindById.mockRejectedValueOnce(error);

      await handleGoogleCalendarDeletion(job);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Error details: Error stack trace")
      );
    });
  });

  describe("Logging", () => {
    it("should log debug information throughout the process", async () => {
      await handleGoogleCalendarDeletion(job);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "handleGoogleCalendarDeletion job started for booking: booking123"
        )
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Using calendar ID")
      );
    });

    it("should log successful Google Calendar deletion", async () => {
      await handleGoogleCalendarDeletion(job);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Successfully deleted Google Calendar event")
      );
    });

    it("should log successful database deletion", async () => {
      await handleGoogleCalendarDeletion(job);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Deleted booking booking123 from database")
      );
    });
  });

  describe("OAuth client setup", () => {
    it("should create OAuth client for Google Calendar API", async () => {
      await handleGoogleCalendarDeletion(job);

      expect(mockCreateOAuth2Client).toHaveBeenCalled();
    });

    it("should get system calendar ID", async () => {
      await handleGoogleCalendarDeletion(job);

      expect(mockGetSystemCalendar).toHaveBeenCalled();
    });

    it("should handle OAuth client creation errors", async () => {
      mockCreateOAuth2Client.mockRejectedValueOnce(new Error("OAuth error"));

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: false,
        error: "OAuth error",
      });
    });

    it("should handle getSystemCalendar errors", async () => {
      mockGetSystemCalendar.mockRejectedValueOnce(
        new Error("Calendar config error")
      );

      const result = await handleGoogleCalendarDeletion(job);

      expect(result).toEqual({
        success: false,
        error: "Calendar config error",
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle booking with empty googleEventId string", async () => {
      mockBooking.googleEventId = "";

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsDelete).not.toHaveBeenCalled();
      expect(Booking.deleteOne).toHaveBeenCalled();
    });

    it("should handle booking with undefined googleEventId", async () => {
      mockBooking.googleEventId = undefined;

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsDelete).not.toHaveBeenCalled();
      expect(Booking.deleteOne).toHaveBeenCalled();
    });

    it("should handle very long googleEventId", async () => {
      mockBooking.googleEventId = "a".repeat(500);

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsDelete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "a".repeat(500),
      });
    });

    it("should handle special characters in googleEventId", async () => {
      mockBooking.googleEventId = "event-with-special_chars.123";

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsDelete).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "event-with-special_chars.123",
      });
    });
  });

  describe("Concurrent operations", () => {
    it("should handle multiple deletions independently", async () => {
      const jobs = [
        { data: { bookingId: "booking1" } },
        { data: { bookingId: "booking2" } },
        { data: { bookingId: "booking3" } },
      ];

      const results = await Promise.all(
        jobs.map((job) => handleGoogleCalendarDeletion(job))
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
      expect(mockCalendarEventsDelete).toHaveBeenCalledTimes(3);
      expect(Booking.deleteOne).toHaveBeenCalledTimes(3);
    });
  });

  describe("Resilience", () => {
    it("should prioritize database as source of truth", async () => {
      // Even if Google Calendar deletion fails completely,
      // the booking should be removed from database
      mockCalendarEventsDelete.mockRejectedValueOnce(
        new Error("Google Calendar completely unavailable")
      );

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(result.deletedFromDatabase).toBe(true);
      expect(Booking.deleteOne).toHaveBeenCalled();
    });

    it("should handle booking already deleted from database", async () => {
      mockBookingFindById.mockResolvedValue(null);

      const result = await handleGoogleCalendarDeletion(job);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Booking already deleted");
      // Should not attempt any deletions
      expect(mockCalendarEventsDelete).not.toHaveBeenCalled();
      expect(Booking.deleteOne).not.toHaveBeenCalled();
    });
  });
});
