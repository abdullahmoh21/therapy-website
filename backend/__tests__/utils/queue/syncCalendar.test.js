// Set environment variables
process.env.NODE_ENV = "test";

// Mock googleapis
const mockCalendarEventsInsert = jest.fn();
const mockCalendarEventsUpdate = jest.fn();
const mockCalendarEventsGet = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    calendar: jest.fn(() => ({
      events: {
        insert: mockCalendarEventsInsert,
        update: mockCalendarEventsUpdate,
        get: mockCalendarEventsGet,
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
const mockConfigGetValue = jest.fn();
const mockConfigSetValue = jest.fn();

jest.mock("../../../models/Booking", () => ({
  findById: mockBookingFindById,
}));

jest.mock("../../../models/User", () => ({
  findById: mockUserFindById,
}));

jest.mock("../../../models/Config", () => ({
  getValue: mockConfigGetValue,
  setValue: mockConfigSetValue,
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

// Mock job scheduler
jest.mock("../../../utils/queue/jobScheduler", () => ({
  addJob: jest.fn().mockResolvedValue({ id: "job123" }),
}));

const handleGoogleCalendarSync = require("../../../utils/queue/jobs/syncCalendar");
const logger = require("../../../logs/logger");
const { addJob } = require("../../../utils/queue/jobScheduler");

describe("handleGoogleCalendarSync", () => {
  let mockBooking, mockUser, jobData;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default booking mock
    mockBooking = {
      _id: "booking123",
      userId: "user123",
      eventStartTime: new Date("2025-12-01T10:00:00Z"),
      eventEndTime: new Date("2025-12-01T11:00:00Z"),
      status: "Confirmed",
      calendly: { eventName: "Therapy Session" },
      location: { type: "online" },
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

    mockCalendarEventsInsert.mockResolvedValue({
      status: 200,
      data: {
        id: "google-event-123",
        htmlLink: "https://calendar.google.com/event/123",
        conferenceData: {
          entryPoints: [
            {
              entryPointType: "video",
              uri: "https://meet.google.com/abc-defg-hij",
            },
          ],
        },
      },
    });

    mockCalendarEventsUpdate.mockResolvedValue({
      status: 200,
      data: {
        id: "google-event-123",
        htmlLink: "https://calendar.google.com/event/123",
      },
    });

    jobData = {
      data: {
        bookingId: "booking123",
      },
    };
  });

  describe("Input validation", () => {
    it("should fail when no booking ID is provided", async () => {
      const result = await handleGoogleCalendarSync({ data: {} });

      expect(result).toEqual({
        success: false,
        error: "No booking ID provided",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("No booking ID provided")
      );
    });

    it("should fail when booking is not found", async () => {
      mockBookingFindById.mockResolvedValue(null);

      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: false,
        error: "Booking not found",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Booking booking123 not found")
      );
    });

    it("should fail when user is not found", async () => {
      mockUserFindById.mockResolvedValue(null);

      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: false,
        error: "User not found",
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("User not found")
      );
      expect(mockBooking.save).toHaveBeenCalled();
      expect(mockBooking.syncStatus.google).toBe("failed");
    });
  });

  describe("Cancelled booking handling", () => {
    it("should skip sync for cancelled bookings", async () => {
      mockBooking.status = "Cancelled";

      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: true,
        message: "Booking is cancelled, sync not needed",
      });
      expect(mockBooking.syncStatus.google).toBe("not_applicable");
      expect(mockCalendarEventsInsert).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Skipping sync for cancelled booking")
      );
    });
  });

  describe("Already synced bookings", () => {
    it("should skip sync if already synced with googleEventId", async () => {
      mockBooking.syncStatus = { google: "synced" };
      mockBooking.googleEventId = "existing-event-id";

      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: true,
        message: "Already synced",
        eventId: "existing-event-id",
      });
      expect(mockCalendarEventsInsert).not.toHaveBeenCalled();
      expect(mockCalendarEventsUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Creating new Google Calendar events", () => {
    it("should create a new Google Calendar event for online session", async () => {
      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: true,
        eventId: "google-event-123",
      });
      expect(mockCalendarEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: "primary",
          conferenceDataVersion: 1,
          requestBody: expect.objectContaining({
            summary: expect.stringContaining("Therapy Session with John Doe"),
            start: expect.objectContaining({
              timeZone: "Asia/Karachi",
            }),
            end: expect.objectContaining({
              timeZone: "Asia/Karachi",
            }),
            conferenceData: expect.any(Object),
          }),
        })
      );
      expect(mockBooking.googleEventId).toBe("google-event-123");
      expect(mockBooking.googleHtmlLink).toBe(
        "https://calendar.google.com/event/123"
      );
      expect(mockBooking.location.meetingLink).toBe(
        "https://meet.google.com/abc-defg-hij"
      );
      expect(mockBooking.syncStatus.google).toBe("synced");
      expect(mockBookingSave).toHaveBeenCalled();
    });

    it("should create event for in-person session without conference data", async () => {
      mockBooking.location = {
        type: "in-person",
        inPersonLocation: "123 Main St, City",
      };

      const result = await handleGoogleCalendarSync(jobData);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          conferenceDataVersion: 0,
          requestBody: expect.objectContaining({
            location: "123 Main St, City",
          }),
        })
      );
      expect(
        mockCalendarEventsInsert.mock.calls[0][0].requestBody.conferenceData
      ).toBeUndefined();
    });

    it("should create recurring session with appropriate title", async () => {
      mockBooking.source = "system";
      mockBooking.recurring = {
        state: true,
        seriesId: "series123",
        interval: "weekly",
        day: "monday",
        time: "10:00",
      };

      const result = await handleGoogleCalendarSync(jobData);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            summary: "Recurring Session with John Doe",
          }),
        })
      );
    });

    it("should schedule client invitation after successful sync", async () => {
      const result = await handleGoogleCalendarSync(jobData);

      expect(result.success).toBe(true);
      expect(addJob).toHaveBeenCalledWith(
        "ClientCalendarInvitation",
        { bookingId: "booking123" },
        expect.objectContaining({
          delay: expect.any(Number),
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Scheduled client calendar invitation")
      );
    });

    it("should continue on success even if client invitation scheduling fails", async () => {
      addJob.mockRejectedValueOnce(new Error("Queue error"));

      const result = await handleGoogleCalendarSync(jobData);

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to schedule client invitation")
      );
    });
  });

  describe("Updating existing Google Calendar events", () => {
    beforeEach(() => {
      mockBooking.googleEventId = "existing-event-123";
      mockBooking.syncStatus = { google: "pending" };
    });

    it("should update existing Google Calendar event", async () => {
      const result = await handleGoogleCalendarSync(jobData);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: "primary",
          eventId: "existing-event-123",
          requestBody: expect.any(Object),
        })
      );
      expect(mockCalendarEventsInsert).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Google Calendar event updated")
      );
    });

    it("should create new event if existing event is not found (404)", async () => {
      mockCalendarEventsUpdate.mockRejectedValueOnce({
        code: 404,
        message: "Not found",
      });

      const result = await handleGoogleCalendarSync(jobData);

      expect(result.success).toBe(true);
      expect(mockCalendarEventsInsert).toHaveBeenCalled();
      expect(mockBooking.googleEventId).toBe("google-event-123");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("not found, creating new event")
      );
    });
  });

  describe("Google Calendar API error handling", () => {
    it("should handle 403 Forbidden errors", async () => {
      mockCalendarEventsInsert.mockRejectedValueOnce({
        code: 403,
        message: "Forbidden",
      });

      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: false,
        error: "Google Calendar access denied",
      });
      expect(mockBooking.syncStatus.google).toBe("failed");
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Google Calendar access forbidden")
      );
    });

    it("should handle 401 authentication errors and invalidate tokens", async () => {
      mockCalendarEventsInsert.mockRejectedValueOnce({
        code: 401,
        message: "Unauthorized",
      });

      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: false,
        error:
          "Google Calendar authentication failed - please reconnect your account",
      });
      expect(mockConfigSetValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "true"
      );
      expect(mockBooking.syncStatus.google).toBe("failed");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Marked Google OAuth tokens as invalidated")
      );
    });

    it("should handle invalid_grant errors and invalidate tokens", async () => {
      mockCalendarEventsInsert.mockRejectedValueOnce({
        code: 400,
        message: "invalid_grant: Token has been expired or revoked",
      });

      const result = await handleGoogleCalendarSync(jobData);

      expect(result.success).toBe(false);
      expect(mockConfigSetValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "true"
      );
    });

    it("should handle generic Google Calendar errors", async () => {
      mockCalendarEventsInsert.mockRejectedValueOnce(
        new Error("Google Calendar API error")
      );

      const result = await handleGoogleCalendarSync(jobData);

      expect(result).toEqual({
        success: false,
        error: "Google Calendar API error",
      });
      expect(mockBooking.syncStatus.google).toBe("failed");
    });
  });

  describe("OAuth and Calendar setup", () => {
    it("should use createOAuth2Client to authenticate", async () => {
      await handleGoogleCalendarSync(jobData);

      expect(mockCreateOAuth2Client).toHaveBeenCalled();
    });

    it("should get system calendar ID", async () => {
      await handleGoogleCalendarSync(jobData);

      expect(mockGetSystemCalendar).toHaveBeenCalled();
    });
  });

  describe("Event data formatting", () => {
    it("should format event times in Pakistan timezone", async () => {
      await handleGoogleCalendarSync(jobData);

      const insertCall = mockCalendarEventsInsert.mock.calls[0][0];
      expect(insertCall.requestBody.start.timeZone).toBe("Asia/Karachi");
      expect(insertCall.requestBody.end.timeZone).toBe("Asia/Karachi");
      expect(insertCall.requestBody.start.dateTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
      );
    });

    it("should include user name in event summary", async () => {
      await handleGoogleCalendarSync(jobData);

      const insertCall = mockCalendarEventsInsert.mock.calls[0][0];
      expect(insertCall.requestBody.summary).toContain("John Doe");
    });

    it("should include location in event description for in-person sessions", async () => {
      mockBooking.location = {
        type: "in-person",
        inPersonLocation: "Office Building, Suite 200",
      };

      await handleGoogleCalendarSync(jobData);

      const insertCall = mockCalendarEventsInsert.mock.calls[0][0];
      expect(insertCall.requestBody.description).toContain(
        "Office Building, Suite 200"
      );
      expect(insertCall.requestBody.location).toBe(
        "Office Building, Suite 200"
      );
    });

    it("should set location to Online Session for online meetings", async () => {
      mockBooking.location = { type: "online" };

      await handleGoogleCalendarSync(jobData);

      const insertCall = mockCalendarEventsInsert.mock.calls[0][0];
      expect(insertCall.requestBody.location).toBe("Online Session");
    });

    it("should enable default reminders", async () => {
      await handleGoogleCalendarSync(jobData);

      const insertCall = mockCalendarEventsInsert.mock.calls[0][0];
      expect(insertCall.requestBody.reminders).toEqual({ useDefault: true });
    });
  });

  describe("Sync status updates", () => {
    it("should update sync status to synced on success", async () => {
      await handleGoogleCalendarSync(jobData);

      expect(mockBooking.syncStatus.google).toBe("synced");
      expect(mockBooking.syncStatus.lastSyncAttempt).toBeInstanceOf(Date);
      expect(mockBooking.markModified).toHaveBeenCalledWith("syncStatus");
      expect(mockBookingSave).toHaveBeenCalled();
    });

    it("should update sync status to failed on error", async () => {
      mockCalendarEventsInsert.mockRejectedValueOnce(new Error("API error"));

      await handleGoogleCalendarSync(jobData);

      expect(mockBooking.syncStatus.google).toBe("failed");
      expect(mockBooking.syncStatus.lastSyncAttempt).toBeInstanceOf(Date);
    });

    it("should handle sync status update errors gracefully", async () => {
      mockBookingSave.mockRejectedValueOnce(new Error("Save error"));

      const result = await handleGoogleCalendarSync(jobData);

      // Should still complete the calendar sync attempt
      expect(mockCalendarEventsInsert).toHaveBeenCalled();
      // The error will be logged as general sync error since save failed
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Google Calendar sync error")
      );
    });
  });

  describe("Logging", () => {
    it("should log debug information throughout the process", async () => {
      await handleGoogleCalendarSync(jobData);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("handleGoogleCalendarSync job started")
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Fetching booking data")
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Building Google Calendar event payload")
      );
    });

    it("should log recurring booking information when applicable", async () => {
      mockBooking.recurring = {
        state: true,
        seriesId: "series123",
        interval: "weekly",
      };
      mockBooking.source = "system";

      await handleGoogleCalendarSync(jobData);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Recurring booking")
      );
    });
  });
});
