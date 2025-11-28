// Set environment variables
process.env.NODE_ENV = "test";

// Mock googleapis
const mockCalendarEventsGet = jest.fn();
const mockCalendarEventsPatch = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        get: mockCalendarEventsGet,
        patch: mockCalendarEventsPatch,
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

const handleClientCalendarInvitation = require("../../../utils/queue/jobs/addClientAttendee");
const logger = require("../../../logs/logger");

describe("handleClientCalendarInvitation", () => {
  let mockBooking, mockUser, job;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default booking mock
    mockBooking = {
      _id: "booking123",
      userId: "user123",
      googleEventId: "google-event-123",
      status: "Confirmed",
      invitationSent: false,
      eventStartTime: new Date("2025-12-01T10:00:00Z"),
      save: mockBookingSave,
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

    mockCalendarEventsGet.mockResolvedValue({
      data: {
        id: "google-event-123",
        summary: "Therapy Session",
      },
    });

    mockCalendarEventsPatch.mockResolvedValue({
      status: 200,
      data: {
        id: "google-event-123",
        attendees: [
          {
            email: "john@example.com",
            displayName: "John Doe",
            responseStatus: "needsAction",
          },
        ],
      },
    });

    job = {
      data: {
        bookingId: "booking123",
      },
    };
  });

  describe("Input validation", () => {
    it("should fail when no booking ID is provided", async () => {
      const result = await handleClientCalendarInvitation({ data: {} });

      expect(result).toEqual({
        success: false,
        error: "No booking ID provided",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("No booking ID provided")
      );
    });

    it("should skip when booking is not found", async () => {
      mockBookingFindById.mockResolvedValue(null);

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: "booking-not-found",
      });
      expect(mockCalendarEventsPatch).not.toHaveBeenCalled();
    });

    it("should skip when user is not found", async () => {
      mockUserFindById.mockResolvedValue(null);

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: "user-not-found",
      });
      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("User not found for booking booking123")
      );
    });
  });

  describe("Invitation already sent", () => {
    it("should skip when invitation was already sent", async () => {
      mockBooking.invitationSent = true;

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: "already-sent",
      });
      expect(mockCalendarEventsPatch).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Invitation already sent for booking booking123"
        )
      );
    });
  });

  describe("Cancelled booking handling", () => {
    it("should skip when booking is cancelled", async () => {
      mockBooking.status = "Cancelled";

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: "booking-cancelled",
      });
      expect(mockCalendarEventsPatch).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Booking booking123 is cancelled")
      );
    });
  });

  describe("Missing Google Calendar event", () => {
    it("should skip and mark as processed when no googleEventId", async () => {
      mockBooking.googleEventId = null;

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: "no-calendar-event",
      });
      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("No Google Calendar event ID found")
      );
    });

    it("should skip when googleEventId is empty string", async () => {
      mockBooking.googleEventId = "";

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  describe("Successfully adding client as attendee", () => {
    it("should add client as attendee to Google Calendar event", async () => {
      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: true,
        invitationSent: true,
      });
      expect(mockCalendarEventsGet).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "google-event-123",
      });
      expect(mockCalendarEventsPatch).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "google-event-123",
        requestBody: {
          attendees: [
            {
              email: "john@example.com",
              displayName: "John Doe",
              responseStatus: "needsAction",
            },
          ],
        },
        sendUpdates: "all",
      });
      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully added john@example.com as attendee"
        )
      );
    });

    it("should use OAuth client and system calendar", async () => {
      await handleClientCalendarInvitation(job);

      expect(mockCreateOAuth2Client).toHaveBeenCalled();
      expect(mockGetSystemCalendar).toHaveBeenCalled();
    });

    it("should send notifications to all attendees", async () => {
      await handleClientCalendarInvitation(job);

      const patchCall = mockCalendarEventsPatch.mock.calls[0][0];
      expect(patchCall.sendUpdates).toBe("all");
    });

    it("should set responseStatus to needsAction", async () => {
      await handleClientCalendarInvitation(job);

      const patchCall = mockCalendarEventsPatch.mock.calls[0][0];
      expect(patchCall.requestBody.attendees[0].responseStatus).toBe(
        "needsAction"
      );
    });
  });

  describe("Google Calendar API error handling", () => {
    it("should handle 404 error when event is deleted", async () => {
      mockCalendarEventsGet.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: "calendar-event-deleted",
      });
      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Google Calendar event for booking booking123 no longer exists"
        )
      );
    });

    it("should handle notFound message error", async () => {
      mockCalendarEventsGet.mockRejectedValueOnce({
        code: 400,
        message: "notFound: Calendar event not found",
      });

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("calendar-event-deleted");
    });

    it("should handle 404 during patch operation", async () => {
      mockCalendarEventsPatch.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(mockBooking.invitationSent).toBe(true);
    });

    it("should throw error for non-404 calendar errors", async () => {
      const apiError = new Error("Google Calendar API error");
      apiError.code = 403;
      mockCalendarEventsGet.mockRejectedValueOnce(apiError);

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: false,
        error: "Google Calendar API error",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error in handleClientCalendarInvitation job")
      );
    });

    it("should handle 401 authentication errors", async () => {
      mockCalendarEventsGet.mockRejectedValueOnce({
        code: 401,
        message: "Unauthorized",
      });

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("should handle 403 forbidden errors", async () => {
      mockCalendarEventsPatch.mockRejectedValueOnce({
        code: 403,
        message: "Forbidden",
      });

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(false);
    });

    it("should handle network errors", async () => {
      mockCalendarEventsGet.mockRejectedValueOnce(new Error("Network timeout"));

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network timeout");
    });
  });

  describe("Database operations", () => {
    it("should mark invitation as sent after successful API call", async () => {
      await handleClientCalendarInvitation(job);

      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalledTimes(1);
    });

    it("should handle save errors gracefully", async () => {
      mockBookingSave.mockRejectedValueOnce(new Error("Database save error"));

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: false,
        error: "Database save error",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error in handleClientCalendarInvitation job")
      );
    });

    it("should not save booking if calendar API fails", async () => {
      mockCalendarEventsPatch.mockRejectedValueOnce({
        code: 403,
        message: "Forbidden",
      });

      await handleClientCalendarInvitation(job);

      expect(mockBookingSave).not.toHaveBeenCalled();
    });
  });

  describe("Logging", () => {
    it("should log debug information throughout the process", async () => {
      await handleClientCalendarInvitation(job);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "handleClientCalendarInvitation job started for booking: booking123"
        )
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Using calendar ID")
      );
    });

    it("should log successful invitation", async () => {
      await handleClientCalendarInvitation(job);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully added john@example.com as attendee"
        )
      );
    });

    it("should log error stack trace on failure", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace";
      mockCalendarEventsGet.mockRejectedValueOnce(error);

      await handleClientCalendarInvitation(job);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Error details: Error stack trace")
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle user with missing email", async () => {
      mockUser.email = null;

      // Should attempt to patch with null email
      const result = await handleClientCalendarInvitation(job);

      expect(mockCalendarEventsPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            attendees: [
              expect.objectContaining({
                email: null,
              }),
            ],
          },
        })
      );
    });

    it("should handle user with missing name", async () => {
      mockUser.name = "";

      const result = await handleClientCalendarInvitation(job);

      expect(mockCalendarEventsPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            attendees: [
              expect.objectContaining({
                displayName: "",
              }),
            ],
          },
        })
      );
    });

    it("should handle very long user names", async () => {
      mockUser.name = "A".repeat(500);

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            attendees: [
              expect.objectContaining({
                displayName: "A".repeat(500),
              }),
            ],
          },
        })
      );
    });

    it("should handle special characters in email", async () => {
      mockUser.email = "john+test@example.com";

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            attendees: [
              expect.objectContaining({
                email: "john+test@example.com",
              }),
            ],
          },
        })
      );
    });
  });

  describe("OAuth client setup", () => {
    it("should handle OAuth client creation errors", async () => {
      mockCreateOAuth2Client.mockRejectedValueOnce(new Error("OAuth error"));

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: false,
        error: "OAuth error",
      });
    });

    it("should handle getSystemCalendar errors", async () => {
      mockGetSystemCalendar.mockRejectedValueOnce(
        new Error("Calendar config error")
      );

      const result = await handleClientCalendarInvitation(job);

      expect(result).toEqual({
        success: false,
        error: "Calendar config error",
      });
    });
  });

  describe("Concurrent operations", () => {
    it("should handle multiple invitations independently", async () => {
      const jobs = [
        { data: { bookingId: "booking1" } },
        { data: { bookingId: "booking2" } },
        { data: { bookingId: "booking3" } },
      ];

      const results = await Promise.all(
        jobs.map((job) => handleClientCalendarInvitation(job))
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
      expect(mockCalendarEventsPatch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Graceful degradation", () => {
    it("should mark as processed to prevent infinite retries when user missing", async () => {
      mockUserFindById.mockResolvedValue(null);

      await handleClientCalendarInvitation(job);

      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalled();
    });

    it("should mark as processed when calendar event missing", async () => {
      mockBooking.googleEventId = null;

      await handleClientCalendarInvitation(job);

      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalled();
    });

    it("should mark as processed when calendar event deleted (404)", async () => {
      mockCalendarEventsGet.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });

      await handleClientCalendarInvitation(job);

      expect(mockBooking.invitationSent).toBe(true);
      expect(mockBookingSave).toHaveBeenCalled();
    });

    it("should not mark as processed for temporary API errors", async () => {
      mockCalendarEventsGet.mockRejectedValueOnce({
        code: 500,
        message: "Internal server error",
      });

      await handleClientCalendarInvitation(job);

      expect(mockBooking.invitationSent).not.toBe(true);
      expect(mockBookingSave).not.toHaveBeenCalled();
    });
  });

  describe("Status variations", () => {
    it("should handle Pending status bookings", async () => {
      mockBooking.status = "Pending";

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsPatch).toHaveBeenCalled();
    });

    it("should handle Completed status bookings", async () => {
      mockBooking.status = "Completed";

      const result = await handleClientCalendarInvitation(job);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsPatch).toHaveBeenCalled();
    });

    it("should skip Cancelled status", async () => {
      mockBooking.status = "Cancelled";

      const result = await handleClientCalendarInvitation(job);

      expect(result.skipped).toBe(true);
      expect(mockCalendarEventsPatch).not.toHaveBeenCalled();
    });
  });
});
