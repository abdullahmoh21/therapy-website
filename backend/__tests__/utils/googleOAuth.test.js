// Set environment variables FIRST
process.env.GOOGLE_CLIENT_ID =
  "test_google_client_id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test_google_client_secret";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";

// Mock googleapis before importing
const mockCalendarList = jest.fn();
const mockCalendarsGet = jest.fn();
const mockCalendarsInsert = jest.fn();
const mockEventsDelete = jest.fn();
const mockEventsGet = jest.fn();
const mockEventsInsert = jest.fn();
const mockEventsUpdate = jest.fn();
const mockEventsPatch = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockOn = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: mockSetCredentials,
        on: mockOn,
        refreshAccessToken: mockRefreshAccessToken,
      })),
    },
    calendar: jest.fn().mockImplementation(() => ({
      calendarList: {
        list: mockCalendarList,
      },
      calendars: {
        get: mockCalendarsGet,
        insert: mockCalendarsInsert,
      },
      events: {
        delete: mockEventsDelete,
        get: mockEventsGet,
        insert: mockEventsInsert,
        update: mockEventsUpdate,
        patch: mockEventsPatch,
      },
    })),
  },
}));

// Mock logger
jest.mock("../../logs/logger", () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
}));

const Config = require("../../models/Config");
const logger = require("../../logs/logger");
const {
  createOAuth2Client,
  getValidAccessToken,
  saveTokens,
  clearTokens,
  hasValidTokens,
  testConnection,
  getConnectionStatus,
  getSystemCalendar,
} = require("../../utils/googleOAuth");

describe("Google OAuth Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createOAuth2Client", () => {
    it("should throw error if GOOGLE_CLIENT_ID is missing", async () => {
      const originalId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      await expect(createOAuth2Client()).rejects.toThrow(
        "Google OAuth credentials not configured in environment variables"
      );

      process.env.GOOGLE_CLIENT_ID = originalId;
    });

    it("should throw error if GOOGLE_CLIENT_SECRET is missing", async () => {
      const originalSecret = process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CLIENT_SECRET;

      await expect(createOAuth2Client()).rejects.toThrow(
        "Google OAuth credentials not configured in environment variables"
      );

      process.env.GOOGLE_CLIENT_SECRET = originalSecret;
    });

    it("should throw error if FRONTEND_URL is missing", async () => {
      const originalUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      await expect(createOAuth2Client()).rejects.toThrow(
        "FRONTEND_URL environment variable is required for OAuth redirect"
      );

      process.env.FRONTEND_URL = originalUrl;
    });

    it("should create OAuth2 client without tokens", async () => {
      jest.spyOn(Config, "getValue").mockResolvedValue(null);

      const client = await createOAuth2Client();

      expect(client).toBeDefined();
      expect(mockSetCredentials).not.toHaveBeenCalled();
    });

    it("should create OAuth2 client with refresh token only", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });

      const client = await createOAuth2Client();

      expect(client).toBeDefined();
      expect(mockSetCredentials).toHaveBeenCalledWith({
        refresh_token: "refresh_token_123",
      });
    });

    it("should create OAuth2 client with all tokens", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleAccessToken")
          return Promise.resolve("access_token_123");
        if (key === "googleTokenExpiry") return Promise.resolve(1234567890);
        return Promise.resolve(null);
      });

      const client = await createOAuth2Client();

      expect(client).toBeDefined();
      expect(mockSetCredentials).toHaveBeenCalledWith({
        refresh_token: "refresh_token_123",
        access_token: "access_token_123",
        expiry_date: 1234567890,
      });
    });

    it("should set up token refresh listener", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });

      await createOAuth2Client();

      expect(mockOn).toHaveBeenCalledWith("tokens", expect.any(Function));
    });

    it("should save refreshed tokens when listener fires", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      await createOAuth2Client();

      // Get the callback that was registered
      const tokenCallback = mockOn.mock.calls[0][1];

      // Simulate token refresh
      await tokenCallback({
        access_token: "new_access_token",
        expiry_date: 9876543210,
        refresh_token: "new_refresh_token",
      });

      expect(Config.setValue).toHaveBeenCalledWith(
        "googleAccessToken",
        "new_access_token"
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenExpiry",
        9876543210
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleRefreshToken",
        "new_refresh_token"
      );
    });
  });

  describe("getValidAccessToken", () => {
    it("should throw error if no refresh token exists", async () => {
      jest.spyOn(Config, "getValue").mockResolvedValue(null);

      await expect(getValidAccessToken()).rejects.toThrow(
        "No Google refresh token available"
      );
    });

    it("should refresh and return access token", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      mockRefreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: "new_access_token",
          expiry_date: 9876543210,
        },
      });

      const token = await getValidAccessToken();

      expect(token).toBe("new_access_token");
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleAccessToken",
        "new_access_token"
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenExpiry",
        9876543210
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "false"
      );
    });

    it("should mark tokens as invalidated on 401 error", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      const error = new Error("Unauthorized");
      error.code = 401;
      mockRefreshAccessToken.mockRejectedValue(error);

      await expect(getValidAccessToken()).rejects.toThrow();
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "true"
      );
    });

    it("should mark tokens as invalidated on invalid_grant error", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      mockRefreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

      await expect(getValidAccessToken()).rejects.toThrow();
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "true"
      );
    });
  });

  describe("saveTokens", () => {
    it("should save all provided tokens", async () => {
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      const tokens = {
        access_token: "access_123",
        refresh_token: "refresh_123",
        expiry_date: 1234567890,
      };

      const result = await saveTokens(tokens, "user@example.com");

      expect(result).toBe(true);
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleAccessToken",
        "access_123"
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleRefreshToken",
        "refresh_123"
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenExpiry",
        1234567890
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleUserEmail",
        "user@example.com"
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "false"
      );
    });

    it("should save only access token if that's all provided", async () => {
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      const tokens = {
        access_token: "access_123",
      };

      await saveTokens(tokens);

      expect(Config.setValue).toHaveBeenCalledWith(
        "googleAccessToken",
        "access_123"
      );
      expect(Config.setValue).not.toHaveBeenCalledWith(
        "googleRefreshToken",
        expect.anything()
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "false"
      );
    });

    it("should throw error if Config.setValue fails", async () => {
      jest
        .spyOn(Config, "setValue")
        .mockRejectedValue(new Error("Database error"));

      const tokens = {
        access_token: "access_123",
      };

      await expect(saveTokens(tokens)).rejects.toThrow("Database error");
    });
  });

  describe("clearTokens", () => {
    it("should clear all Google tokens including calendar ID", async () => {
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      const result = await clearTokens();

      expect(result).toBe(true);
      expect(Config.setValue).toHaveBeenCalledWith("googleAccessToken", null);
      expect(Config.setValue).toHaveBeenCalledWith("googleRefreshToken", null);
      expect(Config.setValue).toHaveBeenCalledWith("googleTokenExpiry", null);
      expect(Config.setValue).toHaveBeenCalledWith("googleUserEmail", null);
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "false"
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleSystemCalendarId",
        null
      );
    });

    it("should throw error if clearing fails", async () => {
      jest
        .spyOn(Config, "setValue")
        .mockRejectedValue(new Error("Database error"));

      await expect(clearTokens()).rejects.toThrow("Database error");
    });
  });

  describe("hasValidTokens", () => {
    it("should return true if refresh token exists", async () => {
      jest.spyOn(Config, "getValue").mockResolvedValue("refresh_token_123");

      const result = await hasValidTokens();

      expect(result).toBe(true);
    });

    it("should return false if refresh token does not exist", async () => {
      jest.spyOn(Config, "getValue").mockResolvedValue(null);

      const result = await hasValidTokens();

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      jest
        .spyOn(Config, "getValue")
        .mockRejectedValue(new Error("Database error"));

      const result = await hasValidTokens();

      expect(result).toBe(false);
    });
  });

  describe("testConnection", () => {
    it("should return true on successful connection", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      mockCalendarList.mockResolvedValue({ data: { items: [] } });

      const result = await testConnection();

      expect(result).toBe(true);
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "false"
      );
    });

    it("should mark tokens as invalidated on 401 error", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      const error = new Error("Unauthorized");
      error.code = 401;
      mockCalendarList.mockRejectedValue(error);

      await expect(testConnection()).rejects.toThrow();
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "true"
      );
    });

    it("should mark tokens as invalidated on invalid_grant error", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      mockCalendarList.mockRejectedValue(new Error("invalid_grant"));

      await expect(testConnection()).rejects.toThrow();
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleTokenInvalidated",
        "true"
      );
    });
  });

  describe("getConnectionStatus", () => {
    it("should return disconnected if no refresh token", async () => {
      jest.spyOn(Config, "getValue").mockResolvedValue(null);

      const status = await getConnectionStatus();

      expect(status.connected).toBe(false);
      expect(status.needsAuth).toBe(true);
      expect(status.message).toContain("No Google Calendar connection found");
    });

    it("should return disconnected if tokens are invalidated", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleTokenInvalidated") return Promise.resolve("true");
        return Promise.resolve(null);
      });

      const status = await getConnectionStatus();

      expect(status.connected).toBe(false);
      expect(status.needsAuth).toBe(true);
      expect(status.message).toContain("authentication expired");
    });

    it("should return connected with token info", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleAccessToken")
          return Promise.resolve("access_token_123");
        if (key === "googleTokenExpiry")
          return Promise.resolve(Date.now() + 3600000);
        if (key === "googleUserEmail")
          return Promise.resolve("user@example.com");
        if (key === "googleTokenInvalidated") return Promise.resolve("false");
        return Promise.resolve(null);
      });

      const status = await getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.needsAuth).toBe(false);
      expect(status.userEmail).toBe("user@example.com");
      expect(status.tokenInfo.hasRefreshToken).toBe(true);
      expect(status.tokenInfo.hasAccessToken).toBe(true);
      expect(status.tokenInfo.isTokenExpired).toBe(false);
    });

    it("should detect expired access token", async () => {
      const pastExpiry = Date.now() - 3600000;

      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleAccessToken")
          return Promise.resolve("access_token_123");
        if (key === "googleTokenExpiry") return Promise.resolve(pastExpiry);
        if (key === "googleTokenInvalidated") return Promise.resolve("false");
        return Promise.resolve(null);
      });

      const status = await getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.tokenInfo.isTokenExpired).toBe(true);
    });
  });

  describe("getSystemCalendar", () => {
    it("should return stored calendar ID if it exists and is valid", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleSystemCalendarId")
          return Promise.resolve("stored_calendar_id_123");
        return Promise.resolve(null);
      });

      mockCalendarsGet.mockResolvedValue({
        data: { id: "stored_calendar_id_123", summary: "Test Calendar" },
      });

      const calendarId = await getSystemCalendar();

      expect(calendarId).toBe("stored_calendar_id_123");
      expect(mockCalendarsGet).toHaveBeenCalledWith({
        calendarId: "stored_calendar_id_123",
      });
      expect(mockCalendarsInsert).not.toHaveBeenCalled();
    });

    it("should create new calendar if no stored ID exists", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleSystemCalendarId") return Promise.resolve(null);
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      mockCalendarsInsert.mockResolvedValue({
        data: { id: "new_calendar_id_123" },
      });

      const calendarId = await getSystemCalendar();

      expect(calendarId).toBe("new_calendar_id_123");
      expect(mockCalendarsInsert).toHaveBeenCalledWith({
        requestBody: {
          summary: "Fatima's Therapy Services",
          description: expect.stringContaining("Automated calendar"),
          timeZone: "Asia/Karachi",
        },
      });
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleSystemCalendarId",
        "new_calendar_id_123"
      );
    });

    it("should create new calendar if stored calendar is deleted (404)", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleSystemCalendarId")
          return Promise.resolve("old_calendar_id");
        return Promise.resolve(null);
      });
      jest.spyOn(Config, "setValue").mockResolvedValue({});

      const notFoundError = new Error("Not found");
      notFoundError.code = 404;
      mockCalendarsGet.mockRejectedValue(notFoundError);

      mockCalendarsInsert.mockResolvedValue({
        data: { id: "new_calendar_id_456" },
      });

      const calendarId = await getSystemCalendar();

      expect(calendarId).toBe("new_calendar_id_456");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("no longer exists")
      );
      expect(Config.setValue).toHaveBeenCalledWith(
        "googleSystemCalendarId",
        "new_calendar_id_456"
      );
    });

    it("should fallback to 'primary' if calendar creation fails", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleSystemCalendarId") return Promise.resolve(null);
        return Promise.resolve(null);
      });

      mockCalendarsInsert.mockRejectedValue(
        new Error("Calendar creation failed")
      );

      const calendarId = await getSystemCalendar();

      expect(calendarId).toBe("primary");
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create system calendar")
      );
    });

    it("should fallback to 'primary' on any unexpected error", async () => {
      jest
        .spyOn(Config, "getValue")
        .mockRejectedValue(new Error("Database error"));

      const calendarId = await getSystemCalendar();

      expect(calendarId).toBe("primary");
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error in getSystemCalendar")
      );
    });

    it("should re-throw non-404 errors during calendar verification", async () => {
      jest.spyOn(Config, "getValue").mockImplementation((key) => {
        if (key === "googleRefreshToken")
          return Promise.resolve("refresh_token_123");
        if (key === "googleSystemCalendarId")
          return Promise.resolve("stored_id");
        return Promise.resolve(null);
      });

      const authError = new Error("Unauthorized");
      authError.code = 401;
      mockCalendarsGet.mockRejectedValue(authError);

      const calendarId = await getSystemCalendar();

      // Should fallback to primary after catching the error
      expect(calendarId).toBe("primary");
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error in getSystemCalendar")
      );
    });
  });
});
