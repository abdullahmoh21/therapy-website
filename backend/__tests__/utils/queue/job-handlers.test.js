// Set environment variables
process.env.FRONTEND_URL = "https://test-frontend.com";
process.env.SAFEPAY_DASHBOARD_URL = "https://test-safepay.com/dashboard";
process.env.NODE_ENV = "test";

// Setup mocks for dependencies
jest.mock("../../../utils/emailTransporter", () => ({
  transporter: {
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  },
  createTransporter: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  }),
}));

jest.mock("../../../logs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("ioredis", () => {
  class Redis {
    constructor() {
      this.status = "ready";
    }
    on(event, callback) {
      // Immediately call the callback for 'ready' event
      if (event === "ready" && typeof callback === "function") {
        process.nextTick(callback);
      }
      return this;
    }
    connect() {
      return Promise.resolve();
    }
    get() {
      return Promise.resolve(null);
    }
    set() {
      return Promise.resolve("OK");
    }
    del() {
      return Promise.resolve(1);
    }
  }
  return Redis;
});

// Import dependencies
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Get transporter to use in assertions
const { transporter } = require("../../../utils/emailTransporter");
const logger = require("../../../logs/logger");

// Import job handlers to test (using new naming convention)
const {
  UserAccountVerificationEmail: verifyEmail,
  UserPasswordResetEmail: resetPassword,
  UserInvitationEmail: sendInvitation,
  ContactInquiry: ContactMe,
  BookingCancellationNotifications: adminCancellationNotif,
  PaymentRefundConfirmation: refundConfirmation,
  EventDeletedNotification: eventDeleted,
  UnauthorizedBookingNotification: unauthorizedBooking,
  SystemAlert: adminAlert,
  DatabaseCleanup: deleteDocuments,
} = require("../../../utils/queue/jobs/index");

// Import real models
const User = require("../../../models/User");
const Booking = require("../../../models/Booking");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");
const Invitee = require("../../../models/Invitee");

describe("Job Handlers Tests", () => {
  let mongoServer;

  // Setup test database
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Cleanup after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Reset before each test
  beforeEach(async () => {
    jest.clearAllMocks();

    // Clean collections
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Invitee.deleteMany({});

    // Mock Config.getValue
    Config.getValue = jest.fn().mockImplementation((key) => {
      const values = {
        adminEmail: "admin@example.com",
        devEmail: "dev@example.com",
        sessionPrice: 100,
        intlSessionPrice: 50,
        noticePeriod: 2,
        maxBookings: 2,
      };
      return Promise.resolve(values[key] || null);
    });
  });

  describe("verifyEmail handler", () => {
    it("should send verification email correctly", async () => {
      // Create a real user in the database
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
        accountType: "domestic",
      });

      const job = {
        data: {
          userId: user._id.toString(),
          verificationToken: "token123",
        },
      };

      await verifyEmail(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "verification@fatimanaqvi.com",
          to: "test@example.com",
          subject: "Verify Account",
          template: "user_account_verification",
          context: expect.objectContaining({
            name: "Test User",
            link: `https://test-frontend.com/verifyEmail?token=token123`,
          }),
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should throw error when email sending fails", async () => {
      // Create a real user in the database
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
        accountType: "domestic",
      });

      // Get the mocked transporter and modify its implementation for this test
      transporter.sendMail.mockRejectedValueOnce(new Error("SMTP error"));

      const job = {
        data: {
          userId: user._id.toString(),
          verificationToken: "token123",
        },
      };

      await expect(verifyEmail(job)).rejects.toThrow("SMTP error");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("resetPassword handler", () => {
    it("should send reset password email correctly", async () => {
      // Create a real user in the database
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
        accountType: "domestic",
      });

      const job = {
        data: {
          userId: user._id.toString(),
          resetToken: "token456",
        },
      };

      await resetPassword(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "reset@fatimanaqvi.com",
          to: "test@example.com",
          subject: "Reset Password",
          template: "user_password_reset",
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("sendInvitation handler", () => {
    it("should send invitation email correctly", async () => {
      // Create a real invitee in the database
      const invitee = await Invitee.create({
        name: "Test User",
        email: "test@example.com",
        token: "token789",
        accountType: "domestic",
        invitedBy: new mongoose.Types.ObjectId(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      const job = {
        data: {
          inviteeId: invitee._id.toString(),
          invitationToken: "token789",
        },
      };

      await sendInvitation(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "invitations@fatimanaqvi.com",
          to: "test@example.com",
          subject: "Invitation to join Fatima's Clinic!",
          template: "user_invitation",
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("ContactMe handler", () => {
    it("should send contact emails to both user and admin correctly", async () => {
      const job = {
        data: {
          type: "General",
          name: "Test User",
          email: "test@example.com",
          phone: "123-456-7890",
          message: "This is a test message",
        },
      };

      await ContactMe(job);

      // Should send two emails
      expect(transporter.sendMail).toHaveBeenCalledTimes(2);

      // Check user confirmation email
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "inquiries@fatimanaqvi.com",
          to: "test@example.com",
          subject: "Thank you for contacting me",
          template: "user_contact_inquiry_confirmation",
        })
      );

      // Check admin notification email
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "inquiries@fatimanaqvi.com",
          to: "admin@example.com",
          subject: "Inquiry from Test User",
          template: "admin_contact_inquiry",
        })
      );

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("adminAlert handler", () => {
    it("should send admin alert email correctly", async () => {
      const job = {
        data: {
          alertType: "serverError",
          extraData: { message: "Test error" },
        },
      };

      await adminAlert(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "alert@fatimanaqvi.com",
          subject: "ALERT: Server Error",
          template: "system_alert",
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should send different alert types with correct configuration", async () => {
      const alertTypes = [
        "mongoDisconnected",
        "redisDisconnected",
        "calendlyDisconnected",
      ];

      for (const alertType of alertTypes) {
        jest.clearAllMocks();

        await adminAlert({ data: { alertType } });

        expect(transporter.sendMail).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalled();
      }
    });
  });

  describe("deleteDocuments handler", () => {
    it("should delete User documents correctly", async () => {
      // Create users to delete with required fields
      const user1 = await User.create({
        email: "user1@example.com",
        name: "User One",
        password: "password123", // Add required field
        accountType: "domestic", // Add required field
      });

      const user2 = await User.create({
        email: "user2@example.com",
        name: "User Two",
        password: "password123", // Add required field
        accountType: "domestic", // Add required field
      });

      const job = {
        data: {
          model: "User",
          documentIds: [user1._id.toString(), user2._id.toString()],
        },
      };

      await deleteDocuments(job);

      // Verify users were deleted
      const remainingUsers = await User.find({
        _id: { $in: [user1._id, user2._id] },
      });
      expect(remainingUsers.length).toBe(0);
      expect(logger.info).toHaveBeenCalled();
    });

    it("should delete Booking documents correctly", async () => {
      // Create test bookings with valid IDs
      const user = await User.create({
        email: "bookinguser@example.com",
        name: "Booking User",
        password: "password123",
        accountType: "domestic",
      });

      const booking1 = await Booking.create({
        userId: user._id,
        eventStartTime: new Date(),
        eventEndTime: new Date(Date.now() + 3600000),
        calendly: {
          eventName: "Test Booking 1",
        },
        source: "system",
        status: "Active",
      });

      const booking2 = await Booking.create({
        userId: user._id,
        eventStartTime: new Date(),
        eventEndTime: new Date(Date.now() + 3600000),
        calendly: {
          eventName: "Test Booking 2",
        },
        source: "system",
        status: "Active",
      });

      const job = {
        data: {
          model: "Booking",
          documentIds: [booking1._id.toString(), booking2._id.toString()],
        },
      };

      await deleteDocuments(job);

      // Verify bookings were deleted
      const remainingBookings = await Booking.find({
        _id: { $in: [booking1._id, booking2._id] },
      });
      expect(remainingBookings.length).toBe(0);
      expect(logger.info).toHaveBeenCalled();
    });

    it("should handle unknown model type", async () => {
      const job = {
        data: {
          model: "UnknownModel",
          documentIds: ["id1", "id2"],
        },
      };

      await expect(deleteDocuments(job)).rejects.toThrow("Unknown model");
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Unknown model")
      );
    });
  });

  describe("adminCancellationNotif handler", () => {
    it("should send admin cancellation notification for standard cancellation", async () => {
      // Create actual user, booking, and payment in the database
      const user = await User.create({
        email: "user@example.com",
        name: "Test User",
        firstName: "Test",
        lastName: "User",
        password: "password123", // Add required field
        accountType: "domestic", // Add required field
      });

      const booking = await Booking.create({
        userId: user._id,
        eventStartTime: new Date("2023-12-25T14:00:00Z"),
        eventEndTime: new Date("2023-12-25T15:00:00Z"), // Add required field
        eventName: "Test Session", // Add required field
        cancellation: {
          date: new Date(),
          cancelledBy: "User",
          reason: "Testing cancellation",
        },
      });

      const payment = await Payment.create({
        userId: user._id,
        bookingId: booking._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Completed",
        transactionReferenceNumber: "TRX12345",
        paymentCompletedDate: new Date(),
      });

      const job = {
        data: {
          bookingId: booking._id.toString(),
          userId: user._id.toString(),
          cancelledBy: "user",
          reason: "Testing cancellation",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          cancellationDate: new Date(),
          paymentId: payment._id.toString(),
          bookingIdNumber: booking.bookingId || 12345,
          notifyAdmin: true,
        },
      };

      await adminCancellationNotif(job);

      // Should send emails to both user and admin
      expect(transporter.sendMail).toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalled();
    });

    it("should send admin cancellation notification for late cancellation", async () => {
      // Create real test data instead of mocking
      const user = await User.create({
        _id: new mongoose.Types.ObjectId(),
        name: "Test User",
        email: "user@example.com",
        firstName: "Test",
        lastName: "User",
        password: "password123",
        accountType: "domestic",
      });

      const booking = await Booking.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        eventStartTime: new Date("2023-12-25T14:00:00Z"),
        eventEndTime: new Date("2023-12-25T15:00:00Z"),
        eventName: "Test Session",
        cancellation: {
          date: new Date(),
          cancelledBy: "User",
          reason: "Testing late cancellation",
        },
      });

      const payment = await Payment.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        bookingId: booking._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Completed",
        transactionReferenceNumber: "TRX12345",
        paymentCompletedDate: new Date(),
      });

      const job = {
        data: {
          bookingId: booking._id.toString(),
          userId: user._id.toString(),
          cancelledBy: "user",
          reason: "Testing late cancellation",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          cancellationDate: new Date(),
          paymentId: payment._id.toString(),
          bookingIdNumber: booking.bookingId || 12345,
          notifyAdmin: true,
        },
      };

      await adminCancellationNotif(job);

      expect(transporter.sendMail).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it("should send admin cancellation notification for admin-initiated cancellation", async () => {
      // Create real test data
      const user = await User.create({
        _id: new mongoose.Types.ObjectId(),
        name: "Test User",
        email: "user@example.com",
        firstName: "Test",
        lastName: "User",
        password: "password123",
        accountType: "domestic",
      });

      const booking = await Booking.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        eventStartTime: new Date("2023-12-25T14:00:00Z"),
        eventEndTime: new Date("2023-12-25T15:00:00Z"),
        eventName: "Test Session",
        cancellation: {
          date: new Date(),
          cancelledBy: "Admin",
          reason: "Testing admin cancellation",
        },
      });

      const payment = await Payment.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        bookingId: booking._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Completed",
        transactionReferenceNumber: "TRX12345",
        paymentCompletedDate: new Date(),
      });

      const job = {
        data: {
          bookingId: booking._id.toString(),
          userId: user._id.toString(),
          cancelledBy: "admin",
          reason: "Testing admin cancellation",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          cancellationDate: new Date(),
          paymentId: payment._id.toString(),
          bookingIdNumber: booking.bookingId || 12345,
          notifyAdmin: true,
        },
      };

      await adminCancellationNotif(job);

      expect(transporter.sendMail).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it("should send admin cancellation notification for unpaid booking", async () => {
      // Create real test data
      const user = await User.create({
        _id: new mongoose.Types.ObjectId(),
        name: "Test User",
        email: "user@example.com",
        firstName: "Test",
        lastName: "User",
        password: "password123",
        accountType: "domestic",
      });

      const booking = await Booking.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        eventStartTime: new Date("2023-12-25T14:00:00Z"),
        eventEndTime: new Date("2023-12-25T15:00:00Z"),
        eventName: "Test Session",
        cancellation: {
          date: new Date(),
          cancelledBy: "User",
          reason: "Testing cancellation",
        },
      });

      const payment = await Payment.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        bookingId: booking._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Not Initiated",
        transactionReferenceNumber: "TRX12345",
      });

      const job = {
        data: {
          bookingId: booking._id.toString(),
          userId: user._id.toString(),
          cancelledBy: "user",
          reason: "Testing cancellation",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          cancellationDate: new Date(),
          paymentId: payment._id.toString(),
          bookingIdNumber: booking.bookingId || 12345,
          notifyAdmin: true,
        },
      };

      await adminCancellationNotif(job);

      expect(transporter.sendMail).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it("should fall back to config for admin email if recipient not provided", async () => {
      // Create real test data
      const user = await User.create({
        _id: new mongoose.Types.ObjectId(),
        name: "Test User",
        email: "user@example.com",
        firstName: "Test",
        lastName: "User",
        password: "password123",
        accountType: "domestic",
      });

      const booking = await Booking.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        eventStartTime: new Date("2023-12-25T14:00:00Z"),
        eventEndTime: new Date("2023-12-25T15:00:00Z"),
        eventName: "Test Session",
        cancellation: {
          date: new Date(),
          cancelledBy: "User",
          reason: "Testing cancellation",
        },
      });

      const job = {
        data: {
          bookingId: booking._id.toString(),
          userId: user._id.toString(),
          cancelledBy: "user",
          reason: "Testing cancellation",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          cancellationDate: new Date(),
          paymentId: null,
          bookingIdNumber: booking.bookingId || 12345,
          notifyAdmin: true,
        },
      };

      await adminCancellationNotif(job);

      expect(Config.getValue).toHaveBeenCalledWith("adminEmail");
      expect(transporter.sendMail).toHaveBeenCalled();
    });

    it("should throw error when booking data is missing", async () => {
      const job = {
        data: {
          // Missing required fields
          userId: new mongoose.Types.ObjectId().toString(),
        },
      };

      await expect(adminCancellationNotif(job)).rejects.toThrow();
    });

    it("should throw error when user is not found", async () => {
      // Create a booking with a non-existent user ID
      const nonExistentUserId = new mongoose.Types.ObjectId();

      const booking = await Booking.create({
        userId: nonExistentUserId, // User doesn't exist
        eventStartTime: new Date("2023-12-25T14:00:00Z"),
        eventEndTime: new Date("2023-12-25T15:00:00Z"),
        eventName: "Test Session",
        cancellation: {
          date: new Date(),
          cancelledBy: "User",
          reason: "Testing cancellation",
        },
      });

      const job = {
        data: {
          bookingId: booking._id.toString(),
          userId: nonExistentUserId.toString(),
          cancelledBy: "user",
          reason: "Testing cancellation",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          cancellationDate: new Date(),
          paymentId: null,
          bookingIdNumber: booking.bookingId || 12345,
          notifyAdmin: true,
        },
      };

      await expect(adminCancellationNotif(job)).rejects.toThrow(
        "User not found for booking"
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("eventDeleted handler", () => {
    it("should send event deleted email correctly", async () => {
      // Create a real user in the database
      const user = await User.create({
        name: "Test User",
        email: "user@example.com",
        password: "hashedPassword123",
        accountType: "domestic",
      });

      const job = {
        data: {
          userId: user._id.toString(),
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          reason: "Event was canceled by administrator",
        },
      };

      await eventDeleted(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "bookings@fatimanaqvi.com",
          to: "user@example.com",
          subject: "Booking Canceled",
          template: "user_session_deletion_notice",
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should handle missing recipient", async () => {
      const job = {
        data: {
          userId: new mongoose.Types.ObjectId().toString(),
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          reason: "Test reason",
        },
      };

      await expect(eventDeleted(job)).rejects.toThrow(
        "User not found for session deletion email"
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("refundConfirmation handler", () => {
    it("should send refund confirmation email correctly", async () => {
      // Create real test data
      const user = await User.create({
        _id: new mongoose.Types.ObjectId(),
        name: "Test User",
        email: "user@example.com",
        password: "password123",
        accountType: "domestic",
      });

      const booking = await Booking.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        eventStartTime: new Date("2023-12-25T14:00:00Z"),
        eventEndTime: new Date("2023-12-25T15:00:00Z"),
        eventName: "Test Session",
      });

      // For tests where we need to reference the bookingId in expectations,
      // we can use the actual numeric bookingId generated by the plugin
      const refreshedBooking = await Booking.findById(booking._id);

      const payment = await Payment.create({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        bookingId: booking._id,
        amount: 100,
        currency: "USD",
        transactionStatus: "Refunded",
        transactionReferenceNumber: "TRX12345",
        paymentCompletedDate: new Date("2023-12-01T10:00:00Z"),
      });

      const job = {
        data: {
          paymentId: payment._id.toString(),
        },
      };

      await refundConfirmation(job);

      expect(transporter.sendMail).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it("should throw error when payment data is missing", async () => {
      const job = {
        data: {
          // No payment data
        },
      };

      await expect(refundConfirmation(job)).rejects.toThrow(
        "Missing paymentId for refund confirmation email"
      );
    });
  });

  describe("unauthorizedBooking handler", () => {
    it("should send unauthorized booking email correctly using recipient", async () => {
      const job = {
        data: {
          email: "user@example.com",
          userName: "Test User",
        },
      };

      await unauthorizedBooking(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "bookings@fatimanaqvi.com",
          to: "user@example.com", // Should use recipient over calendlyEmail
          subject: "Booking Request Canceled",
          template: "user_unauthorized_booking_notice",
          context: expect.objectContaining({
            adminEmail: "admin@example.com",
            clientName: "Test User",
            frontend_url: "https://test-frontend.com",
            currentYear: expect.any(Number),
          }),
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should fall back to calendlyEmail when recipient is not provided", async () => {
      const job = {
        data: {
          email: "calendly@example.com",
          userName: "Test User",
        },
      };

      await unauthorizedBooking(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "calendly@example.com",
          template: "user_unauthorized_booking_notice",
        })
      );
    });

    it("should use default client name when name is not provided", async () => {
      const job = {
        data: {
          email: "user@example.com",
          // No name provided
        },
      };

      await unauthorizedBooking(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            clientName: "Client", // Default value
          }),
        })
      );
    });

    it("should handle case when neither recipient nor calendlyEmail is provided", async () => {
      const job = {
        data: {
          // No email addresses
          userName: "Test User",
        },
      };

      await expect(unauthorizedBooking(job)).rejects.toThrow(
        "No email provided for unauthorized booking notification"
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
