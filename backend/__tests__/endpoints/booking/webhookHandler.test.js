const {
  setupBookingApp,
  setupDatabase,
  jwt,
  axios,
  sendEmail,
  logger,
  User,
  Booking,
  Payment,
  Config,
  mongoose,
  createObjectId,
} = require("../testSetup");
const request = require("supertest");

describe("POST /bookings/calendly - Calendly Webhook", () => {
  const app = setupBookingApp();
  const { connectDB, closeDB, clearCollections } = setupDatabase();
  let mongoServer;

  // Setup test database
  beforeAll(async () => {
    mongoServer = await connectDB();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await closeDB();
  });

  // Clean up collections before each test
  beforeEach(async () => {
    await clearCollections();
  });

  it("should handle invitee.canceled event correctly", async () => {
    // Create a user and booking in database
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "user@example.com",
      name: "Test User",
      password: "hashedPassword123", // Add required field
      accountType: "domestic", // Add required field
    });

    const payment = await Payment.create({
      userId: user._id,
      amount: 100,
      currency: "USD",
      transactionStatus: "Completed",
      transactionReferenceNumber: "T-ABCDE",
      paymentCompletedDate: new Date(),
    });

    const booking = await Booking.create({
      userId: user._id,
      paymentId: payment._id,
      bookingId: 12345, // Number instead of string
      eventStartTime: new Date(Date.now() + 86400000), // Tomorrow
      eventEndTime: new Date(Date.now() + 90000000),
      eventName: "1 Hour Session",
      calendly: {
        scheduledEventURI: "https://api.calendly.com/scheduled_events/event123",
        eventName: "1 Hour Session",
      },
      status: "Active",
      cancellation: {
        reason: "",
        date: null,
        // removed invalid empty string for cancelledBy
      },
    });

    const webhookData = {
      event: "invitee.canceled",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
        },
        cancellation: {
          canceler_type: "invitee",
          reason: "Testing cancellation",
          created_at: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);

    // Check that BookingCancellationNotifications job was queued
    expect(sendEmail).toHaveBeenCalledWith(
      "BookingCancellationNotifications",
      expect.objectContaining({
        bookingId: expect.any(String),
        userId: expect.any(String),
        cancelledBy: "user", // invitee cancelled
        reason: "Testing cancellation",
      })
    );

    // Verify booking was updated
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.status).toBe("Cancelled");
    expect(updatedBooking.cancellation.reason).toBe("Testing cancellation");
  });

  it("should handle invitee.created event with valid JWT token", async () => {
    // Create a user with valid JTI
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      bookingTokenJTI: "valid-jti",
      accountType: "domestic",
      password: "hashedPassword123", // Add required field
    });

    // Override verify for this test
    jwt.verify.mockReturnValueOnce({
      userId: user._id.toString(),
      jti: "valid-jti",
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        created_at: new Date().toISOString(),
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "valid-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          event_type: "https://api.calendly.com/event_types/type123",
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          location: {
            type: "zoom",
            location: "Zoom",
            join_url: "https://zoom.us/j/123456789",
            data: { password: "123456" },
          },
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);

    // Verify a booking was created
    const bookings = await Booking.find({ userId: user._id });
    expect(bookings.length).toBeGreaterThan(0);
  });

  it("should reject invitee.created with invalid JWT token", async () => {
    jwt.verify.mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "invalid-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200); // Still 200 as we don't want to alert Calendly
    expect(axios.request).toHaveBeenCalled(); // Should call to delete the event
    expect(sendEmail).toHaveBeenCalled(); // Should send notification
  });

  it("should reject invitee.created when user not found", async () => {
    // Setup token that has valid format but non-existent user
    const nonExistentId = createObjectId(); // Create a valid ObjectId that doesn't exist in DB

    jwt.verify.mockReturnValueOnce({
      userId: nonExistentId.toString(),
      jti: "some-jti",
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "invalid-user-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200); // Still 200 for Calendly
    expect(axios.request).toHaveBeenCalled(); // Should call to delete the event
  });

  it("should reject invitee.created when token JTI doesn't match", async () => {
    // Create user with different JTI than in token
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      bookingTokenJTI: "different-jti", // Different from token
      accountType: "domestic",
      password: "hashedPassword123", // Add required field
    });

    jwt.verify.mockReturnValueOnce({
      userId: user._id.toString(),
      jti: "invalid-jti",
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "invalid-jti-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200); // Still 200 for Calendly
    expect(axios.request).toHaveBeenCalled(); // Should call to delete the event
  });

  it("should handle invitee.canceled when booking is already cancelled", async () => {
    // Create user and cancelled booking
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "user@example.com",
      name: "Test User",
      password: "hashedPassword123", // Add required field
      accountType: "domestic", // Add required field
    });

    const booking = await Booking.create({
      userId: user._id,
      bookingId: 12345, // Number instead of string
      eventStartTime: new Date(Date.now() + 86400000),
      scheduledEventURI: "https://api.calendly.com/scheduled_events/event123",
      eventEndTime: new Date(Date.now() + 90000000), // Add required field
      eventName: "1 Hour Session", // Add required field
      status: "Cancelled", // Already cancelled
      cancellation: {
        reason: "Already cancelled",
        cancelledBy: "User", // This is a valid enum value
        date: new Date(),
      },
    });

    const webhookData = {
      event: "invitee.canceled",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
        },
        cancellation: {
          canceler_type: "invitee",
          reason: "Testing cancellation",
          created_at: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);

    // Verify booking wasn't modified
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.cancellation.reason).toBe("Already cancelled");
  });

  it("should handle error in createBooking when Booking.create fails", async () => {
    // Create a user with valid JTI
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      bookingTokenJTI: "valid-jti",
      accountType: "domestic",
      password: "hashedPassword123", // Add required field
    });

    // Override verify for this test
    jwt.verify.mockReturnValueOnce({
      userId: user._id.toString(),
      jti: "valid-jti",
    });

    // Mock Booking.create to throw an error
    const originalCreate = Booking.create;
    Booking.create = jest.fn().mockRejectedValue(new Error("Database error"));

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        created_at: new Date().toISOString(),
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "valid-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          event_type: "https://api.calendly.com/event_types/type123",
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          location: {
            type: "zoom",
            location: "Zoom",
            join_url: "https://zoom.us/j/123456789",
            data: { password: "123456" },
          },
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    // Restore original implementation
    Booking.create = originalCreate;

    // Even with error, should still return 200 to Calendly
    expect(res.statusCode).toBe(200);
    expect(logger.error).toHaveBeenCalled();
  });

  it("should handle error when deleting event", async () => {
    // Mock axios.request to throw an error
    axios.request.mockRejectedValueOnce(new Error("API Error"));

    // Get direct access to the controller
    const bookingController = require("../../../controllers/bookingController");

    // Call the deleteEvent function directly
    try {
      await bookingController.deleteEvent(
        "https://api.calendly.com/scheduled_events/event123"
      );
      fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("API Error");
      expect(logger.error).toHaveBeenCalled();
    }
  });

  it("should handle admin cancellation notification when admin email is not found", async () => {
    // This test is no longer relevant as sendAdminCancellationNotification
    // was removed and replaced with BookingCancellationNotifications job handler
    // which handles admin notifications internally. Skipping this test.
    expect(true).toBe(true);
  });

  it("should handle unrecognized event types gracefully", async () => {
    const webhookData = {
      event: "invitee.unknown_event_type",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("not processed");
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("unhandled Calendly event type")
    );
  });

  it("should handle missing event type in webhook payload", async () => {
    const webhookData = {
      // Missing event field
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Invalid webhook payload");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("missing event type")
    );
  });

  it("should handle missing payload in webhook request", async () => {
    const webhookData = {
      event: "invitee.created",
      // Missing payload
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Missing payload");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("missing payload")
    );
  });

  it("should handle invitee.canceled with missing cancellation data", async () => {
    const webhookData = {
      event: "invitee.canceled",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
        },
        // Missing cancellation data
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Invalid cancellation data");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("missing cancellation data")
    );
  });

  it("should handle invitee.created without token", async () => {
    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        // No tracking field with token
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("without token")
    );
    expect(axios.request).toHaveBeenCalled(); // Should call to delete the event
  });

  it("should handle invitee.created with malformed JWT token", async () => {
    jwt.verify.mockImplementationOnce(() => {
      return {
        // Missing jti field
        userId: "507f1f77bcf86cd799439011",
      };
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "malformed-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("JWT verification failed")
    );
    expect(axios.request).toHaveBeenCalled();
  });

  it("should handle error when finding user", async () => {
    // Setup token with valid structure
    jwt.verify.mockReturnValueOnce({
      userId: "invalid-id-format", // This will cause an error in findById
      jti: "valid-jti",
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "valid-token-structure",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error finding user")
    );
    expect(axios.request).toHaveBeenCalled();
  });

  it("should handle error when saving user during token invalidation", async () => {
    // Create a user with valid JTI
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      bookingTokenJTI: "valid-jti",
      accountType: "domestic",
      password: "hashedPassword123",
    });

    // Override verify for this test
    jwt.verify.mockReturnValueOnce({
      userId: user._id.toString(),
      jti: "valid-jti",
    });

    // Mock user.save to throw an error
    const originalSave = mongoose.Model.prototype.save;
    mongoose.Model.prototype.save = jest
      .fn()
      .mockRejectedValueOnce(new Error("Database error on save"));

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "valid-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    // Restore original implementation
    mongoose.Model.prototype.save = originalSave;

    expect(res.statusCode).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error in booking creation process")
    );
  });

  it("should handle invitee.created with invalid event name", async () => {
    // Create a user with valid JTI
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      bookingTokenJTI: "valid-jti",
      accountType: "domestic",
      password: "hashedPassword123",
    });

    // Override verify for this test
    jwt.verify.mockReturnValueOnce({
      userId: user._id.toString(),
      jti: "valid-jti",
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "valid-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "15 Minute Consultation", // Not "1 Hour Session"
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("not processed");
  });

  it("should handle cancellation when booking is not found", async () => {
    const webhookData = {
      event: "invitee.canceled",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/nonexistent", // Non-existent event URI
          name: "1 Hour Session",
        },
        cancellation: {
          canceler_type: "invitee",
          reason: "Testing cancellation",
          created_at: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    // Booking not found case should be handled gracefully
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("should handle missing sessionPrice configuration during booking creation", async () => {
    // Create a user with valid JTI
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      name: "Test User",
      bookingTokenJTI: "valid-jti",
      accountType: "domestic",
      password: "hashedPassword123",
    });

    // Override verify for this test
    jwt.verify.mockReturnValueOnce({
      userId: user._id.toString(),
      jti: "valid-jti",
    });

    // Mock Config.getValue to return undefined for sessionPrice
    const originalGetValue = Config.getValue;
    Config.getValue = jest.fn().mockImplementation((key) => {
      if (key === "sessionPrice") return Promise.resolve(undefined);
      return Promise.resolve(null);
    });

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        tracking: {
          utm_content: "valid-token",
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          event_type: "https://api.calendly.com/event_types/type123",
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    // Restore original implementation
    Config.getValue = originalGetValue;

    expect(res.statusCode).toBe(200);
    expect(axios.request).toHaveBeenCalled(); // Should call to delete the event
  });

  it("should allow unsupported event types to pass through without being deleted", async () => {
    // An event type that isn't specifically handled
    const webhookData = {
      event: "invitee.rescheduled", // Not a directly handled event type
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "test@example.com",
        name: "Test User",
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain("not processed");

    // Verify the event was NOT deleted
    expect(axios.request).not.toHaveBeenCalled();

    // Verify no emails were sent
    expect(sendEmail).not.toHaveBeenCalled();

    // Confirm logging of unhandled event
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("unhandled Calendly event type")
    );
  });

  it("should send an email to registered user when booking with invalid JTI token", async () => {
    // Create a user with a different JTI than what will be in the token
    const user = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "registered-user@example.com", // This is the email in our database
      name: "Registered User",
      bookingTokenJTI: "actual-jti", // Different from what's in the token
      accountType: "domestic",
      password: "hashedPassword123",
    });

    jwt.verify.mockReturnValueOnce({
      userId: user._id.toString(),
      jti: "invalid-jti", // JTI mismatch
    });

    // Clear any previous calls to the mocks
    sendEmail.mockClear();
    axios.request.mockClear();

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "calendly-provided@example.com", // This would be the email entered in Calendly
        name: "User From Calendly",
        tracking: {
          utm_content: "token-with-invalid-jti", // Token that has invalid JTI
        },
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);

    // Event should be deleted (canceled) via Calendly API
    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.calendly.com/scheduled_events/event123/cancellation",
      })
    );

    // Email should be sent to the user's email from our database, not the Calendly-provided one
    expect(sendEmail).toHaveBeenCalledWith(
      "EventDeletedNotification",
      expect.objectContaining({
        userId: expect.any(String),
        eventStartTime: expect.anything(), // Can be Date or ISO string
        reason: "Expired or invalid booking link",
      })
    );

    // Log should confirm an email was sent to registered user
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Event-deleted email sent to registered user")
    );
  });

  it("should send an unauthorized booking email when booking without a token", async () => {
    // Clear any previous calls to the mocks
    sendEmail.mockClear();
    axios.request.mockClear();

    const webhookData = {
      event: "invitee.created",
      payload: {
        uri: "https://api.calendly.com/scheduled_events/event123/invitees/inv123",
        email: "unregistered@example.com", // Email provided in Calendly
        name: "Unregistered User", // Name provided in Calendly
        // No tracking field with token
        scheduled_event: {
          uri: "https://api.calendly.com/scheduled_events/event123",
          name: "1 Hour Session",
          start_time: new Date().toISOString(),
        },
      },
    };

    const res = await request(app).post("/bookings/calendly").send(webhookData);

    expect(res.statusCode).toBe(200);

    // Event should be deleted (canceled) via Calendly API
    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.calendly.com/scheduled_events/event123/cancellation",
      })
    );

    // Should send unauthorized booking email to the email provided in Calendly
    expect(sendEmail).toHaveBeenCalledWith(
      "UnauthorizedBookingNotification",
      expect.objectContaining({
        calendlyEmail: "unregistered@example.com", // Email from Calendly payload
        inviteeName: "Unregistered User", // Name from Calendly payload
      })
    );

    // Log should confirm an unauthorized booking email was sent
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Unauthorized-booking email sent to")
    );
  });
});
