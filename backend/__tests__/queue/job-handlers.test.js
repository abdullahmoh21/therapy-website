const { transporter } = require("../../utils/emailTransporter");
const logger = require("../../logs/logger");
const Config = require("../../models/Config");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");

// Import all job handlers
const {
  verifyEmail,
  resetPassword,
  sendInvitation,
  ContactMe,
  adminCancellationNotif,
  refundConfirmation,
  eventDeleted,
  unauthorizedBooking,
  adminAlert,
  userCancellation,
  deleteDocuments,
} = require("../../utils/queue/jobs/index");

// Mock dependencies
jest.mock("../../utils/emailTransporter", () => ({
  transporter: {
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  },
}));

jest.mock("../../logs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../../models/Config", () => ({
  getValue: jest.fn().mockImplementation((key) => {
    const values = {
      adminEmail: "admin@example.com",
      devEmail: "dev@example.com",
      noticePeriod: 2,
    };
    return Promise.resolve(values[key] || null);
  }),
}));

// Update User mock to include mongoose chain methods
jest.mock("../../models/User", () => {
  const mockUser = {
    _id: "user123",
    name: "Test User",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockFindOne = jest.fn().mockImplementation(() => {
    const query = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUser),
    };
    return query;
  });

  return {
    findOne: mockFindOne,
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
  };
});

// Update Booking mock to include mongoose chain methods
jest.mock("../../models/Booking", () => {
  const mockBooking = {
    _id: "booking123",
    bookingId: "B12345",
    userId: "user123",
    eventStartTime: new Date("2023-12-25T14:00:00Z"),
    cancellation: {
      date: new Date(),
      cancelledBy: "User",
      reason: "Testing cancellation",
    },
  };

  const mockFindOne = jest.fn().mockImplementation(() => {
    const query = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockBooking),
    };
    return query;
  });

  return {
    findOne: mockFindOne,
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
  };
});

// Update Payment mock to include mongoose chain methods
jest.mock("../../models/Payment", () => {
  const mockPayment = {
    _id: "payment123",
    userId: "user123",
    bookingId: "booking123",
    amount: 100,
    currency: "USD",
    transactionStatus: "Completed",
    transactionReferenceNumber: "TRX12345",
    paymentCompletedDate: new Date(),
  };

  const mockFindOne = jest.fn().mockImplementation(() => {
    const query = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockPayment),
    };
    return query;
  });

  return {
    findOne: mockFindOne,
    updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
  };
});

// Mock for Invitee model (needed for deleteDocuments)
jest.mock("../../models/Invitee", () => ({
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
}));

// Mock environment variables
process.env.FRONTEND_URL = "https://test-frontend.com";
process.env.SAFEPAY_DASHBOARD_URL = "https://test-safepay.com/dashboard";

describe("Job Handlers Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyEmail handler", () => {
    it("should send verification email correctly", async () => {
      const job = {
        data: {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/verify/token123",
        },
      };

      await verifyEmail(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "verification@fatimanaqvi.com",
          to: "test@example.com",
          subject: "Verify Account",
          template: "verifyEmail",
          context: expect.objectContaining({
            name: "Test User",
            link: "https://example.com/verify/token123",
          }),
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should throw error when email sending fails", async () => {
      transporter.sendMail.mockRejectedValueOnce(new Error("SMTP error"));

      const job = {
        data: {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/verify/token123",
        },
      };

      await expect(verifyEmail(job)).rejects.toThrow("SMTP error");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("resetPassword handler", () => {
    it("should send reset password email correctly", async () => {
      const job = {
        data: {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/reset/token123",
        },
      };

      await resetPassword(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "reset@fatimanaqvi.com",
          to: "test@example.com",
          subject: "Reset Password",
          template: "resetPassword",
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("sendInvitation handler", () => {
    it("should send invitation email correctly", async () => {
      const job = {
        data: {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/invite/token123",
        },
      };

      await sendInvitation(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "invitations@fatimanaqvi.com",
          to: "test@example.com",
          subject: "Invitation to join Fatima's Clinic!",
          template: "invite",
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
          template: "contactMeConfirmation",
        })
      );

      // Check admin notification email
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "inquiries@fatimanaqvi.com",
          to: "admin@example.com",
          subject: "Inquiry from Test User",
          template: "contactMe",
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
          template: "alert",
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
      const job = {
        data: {
          model: "User",
          documentIds: ["user1", "user2"],
        },
      };

      await deleteDocuments(job);

      expect(User.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ["user1", "user2"] },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it("should delete Booking documents correctly", async () => {
      const job = {
        data: {
          model: "Booking",
          documentIds: ["booking1", "booking2"],
        },
      };

      await deleteDocuments(job);

      expect(Booking.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ["booking1", "booking2"] },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it("should handle unknown model type", async () => {
      const job = {
        data: {
          model: "UnknownModel",
          documentIds: ["id1", "id2"],
        },
      };

      await deleteDocuments(job);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Unknown model")
      );
    });
  });

  describe("adminCancellationNotif handler", () => {
    it("should send admin cancellation notification for standard cancellation", async () => {
      const job = {
        data: {
          booking: {
            _id: "booking123",
            bookingId: "B12345",
            userId: "user123",
            eventStartTime: new Date("2023-12-25T14:00:00Z"),
            cancellation: {
              date: new Date(),
              cancelledBy: "User",
              reason: "Testing cancellation",
            },
          },
          payment: {
            _id: "payment123",
            amount: 100,
            currency: "USD",
            transactionStatus: "Completed",
            transactionReferenceNumber: "TRX12345",
            paymentCompletedDate: new Date(),
          },
          recipient: "admin@example.com",
          isLateCancellation: false,
          updatePaymentStatus: true,
        },
      };

      await adminCancellationNotif(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "admin@fatimanaqvi.com",
          to: "admin@example.com",
          subject: "Cancellation Notification - Eligible for Refund",
          template: "adminCancellationNotif",
        })
      );

      // Check context data
      const mailContext = transporter.sendMail.mock.calls[0][0].context;
      expect(mailContext).toMatchObject({
        bookingId: "B12345",
        cancelledBy: "User",
        isPaid: true,
        isLateCancellation: false,
      });

      // Verify payment status update
      expect(Payment.updateOne).toHaveBeenCalledWith(
        { _id: "payment123" },
        {
          transactionStatus: "Refund Requested",
          refundRequestedDate: expect.any(Date),
        }
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should send admin cancellation notification for late cancellation", async () => {
      const job = {
        data: {
          booking: {
            _id: "booking123",
            bookingId: "B12345",
            userId: "user123",
            eventStartTime: new Date("2023-12-25T14:00:00Z"),
            cancellation: {
              date: new Date(),
              cancelledBy: "User",
              reason: "Testing late cancellation",
            },
          },
          payment: {
            _id: "payment123",
            amount: 100,
            currency: "USD",
            transactionStatus: "Completed",
            transactionReferenceNumber: "TRX12345",
            paymentCompletedDate: new Date(),
          },
          recipient: "admin@example.com",
          isLateCancellation: true,
          updatePaymentStatus: false,
        },
      };

      await adminCancellationNotif(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "admin@fatimanaqvi.com",
          to: "admin@example.com",
          subject: "Late Cancellation Notice - No Automatic Refund",
          template: "adminCancellationNotif",
        })
      );

      // Check context data
      const mailContext = transporter.sendMail.mock.calls[0][0].context;
      expect(mailContext).toMatchObject({
        isLateCancellation: true,
        isPaid: true,
      });

      // Verify payment status is not updated for late cancellation
      expect(Payment.updateOne).not.toHaveBeenCalled();
    });

    it("should send admin cancellation notification for admin-initiated cancellation", async () => {
      const job = {
        data: {
          booking: {
            _id: "booking123",
            bookingId: "B12345",
            userId: "user123",
            eventStartTime: new Date("2023-12-25T14:00:00Z"),
            cancellation: {
              date: new Date(),
              cancelledBy: "Admin",
              reason: "Testing admin cancellation",
            },
          },
          payment: {
            _id: "payment123",
            amount: 100,
            currency: "USD",
            transactionStatus: "Completed",
            transactionReferenceNumber: "TRX12345",
            paymentCompletedDate: new Date(),
          },
          recipient: "admin@example.com",
          isLateCancellation: false,
          updatePaymentStatus: true,
        },
      };

      await adminCancellationNotif(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "adminCancellationNotif",
        })
      );

      // Check context data
      const mailContext = transporter.sendMail.mock.calls[0][0].context;
      expect(mailContext).toMatchObject({
        cancelledBy: "Admin",
        isAdmin: true,
        isAdminCancelled: true,
      });
    });

    it("should send admin cancellation notification for unpaid booking", async () => {
      const job = {
        data: {
          booking: {
            _id: "booking123",
            bookingId: "B12345",
            userId: "user123",
            eventStartTime: new Date("2023-12-25T14:00:00Z"),
            cancellation: {
              date: new Date(),
              cancelledBy: "User",
              reason: "Testing cancellation",
            },
          },
          payment: {
            _id: "payment123",
            amount: 100,
            currency: "USD",
            transactionStatus: "Pending", // Not completed
            transactionReferenceNumber: "TRX12345",
          },
          recipient: "admin@example.com",
          isLateCancellation: false,
        },
      };

      await adminCancellationNotif(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Cancellation Notification - No Payment Required",
          template: "adminCancellationNotif",
        })
      );

      // Check context data
      const mailContext = transporter.sendMail.mock.calls[0][0].context;
      expect(mailContext).toMatchObject({
        isPaid: false,
        paymentStatus: "Pending",
      });

      // Verify payment status is not updated for unpaid booking
      expect(Payment.updateOne).not.toHaveBeenCalled();
    });

    it("should fall back to config for admin email if recipient not provided", async () => {
      const job = {
        data: {
          booking: {
            _id: "booking123",
            bookingId: "B12345",
            userId: "user123",
            eventStartTime: new Date("2023-12-25T14:00:00Z"),
            cancellation: {
              date: new Date(),
              cancelledBy: "User",
              reason: "Testing cancellation",
            },
          },
          payment: null,
          // No recipient provided, should fall back to config
          isLateCancellation: false,
        },
      };

      await adminCancellationNotif(job);

      expect(Config.getValue).toHaveBeenCalledWith("adminEmail");
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@example.com", // From the mock Config.getValue
          template: "adminCancellationNotif",
        })
      );
    });

    it("should throw error when booking data is missing", async () => {
      const job = {
        data: {
          // No booking data
          payment: {
            _id: "payment123",
            amount: 100,
            currency: "USD",
            transactionStatus: "Completed",
          },
          recipient: "admin@example.com",
        },
      };

      await expect(adminCancellationNotif(job)).rejects.toThrow(
        "Missing required booking data"
      );
    });

    it("should throw error when user is not found", async () => {
      // Mock User.findOne to return a query that resolves to null
      User.findOne.mockImplementationOnce(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      }));

      const job = {
        data: {
          booking: {
            _id: "booking123",
            bookingId: "B12345",
            userId: "nonexistent_user",
            eventStartTime: new Date("2023-12-25T14:00:00Z"),
            cancellation: {
              date: new Date(),
              cancelledBy: "User",
              reason: "Testing cancellation",
            },
          },
          payment: null,
          recipient: "admin@example.com",
          isLateCancellation: false,
        },
      };

      await expect(adminCancellationNotif(job)).rejects.toThrow(
        "User not found for booking"
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("User not found")
      );
    });
  });

  describe("eventDeleted handler", () => {
    it("should send event deleted email correctly", async () => {
      const job = {
        data: {
          recipient: "user@example.com",
          name: "Test User",
          eventDate: "December 25, 2023",
          eventTime: "2:00 PM",
          reason: "Event was canceled by administrator",
        },
      };

      await eventDeleted(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "bookings@fatimanaqvi.com",
          to: "user@example.com",
          subject: "Booking Canceled",
          template: "eventDeleted",
          context: expect.objectContaining({
            name: "Test User",
            eventDate: "December 25, 2023",
            eventTime: "2:00 PM",
            reason: "Event was canceled by administrator",
            frontend_url: "https://test-frontend.com",
            currentYear: expect.any(Number),
          }),
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should handle missing recipient", async () => {
      const job = {
        data: {
          // no recipient
          name: "Test User",
          eventDate: "December 25, 2023",
          eventTime: "2:00 PM",
        },
      };

      await eventDeleted(job);

      expect(transporter.sendMail).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("no recipient provided")
      );
    });
  });

  describe("refundConfirmation handler", () => {
    it("should send refund confirmation email correctly", async () => {
      const job = {
        data: {
          payment: {
            _id: "payment123",
            userId: "user123",
            bookingId: "booking123",
            amount: 100,
            transactionStatus: "Refunded",
            transactionReferenceNumber: "TRX12345",
            paymentCompletedDate: new Date("2023-12-01T10:00:00Z"),
          },
        },
      };

      await refundConfirmation(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "admin@fatimanaqvi.com",
          to: "user@example.com", // From mocked User model
          subject: "Refund Confirmation",
          template: "refundConfirmation",
          context: expect.objectContaining({
            name: "Test User",
            userEmail: "user@example.com",
            bookingId: "B12345",
            paymentAmount: 100,
            paymentStatus: "Refunded",
            transactionReferenceNumber: "TRX12345",
            adminEmail: "admin@example.com",
            frontend_url: "https://test-frontend.com",
            currentYear: expect.any(Number),
          }),
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should throw error when payment data is missing", async () => {
      const job = {
        data: {
          // No payment data
        },
      };

      await expect(refundConfirmation(job)).rejects.toThrow(
        "Missing required data for refund request email"
      );
    });
  });

  describe("unauthorizedBooking handler", () => {
    it("should send unauthorized booking email correctly using recipient", async () => {
      const job = {
        data: {
          recipient: "user@example.com",
          calendlyEmail: "calendly@example.com",
          name: "Test User",
        },
      };

      await unauthorizedBooking(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "bookings@fatimanaqvi.com",
          to: "user@example.com", // Should use recipient over calendlyEmail
          subject: "Booking Request Canceled",
          template: "unauthorizedBooking",
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
          calendlyEmail: "calendly@example.com",
          name: "Test User",
        },
      };

      await unauthorizedBooking(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "calendly@example.com",
          template: "unauthorizedBooking",
        })
      );
    });

    it("should use default client name when name is not provided", async () => {
      const job = {
        data: {
          recipient: "user@example.com",
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
          name: "Test User",
        },
      };

      await unauthorizedBooking(job);

      expect(transporter.sendMail).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("no recipient provided")
      );
    });
  });

  describe("userCancellation handler", () => {
    it("should send user cancellation email correctly", async () => {
      const job = {
        data: {
          recipient: "user@example.com",
          name: "Test User",
          bookingId: "B12345",
          eventDate: "December 25, 2023",
          eventTime: "2:00 PM",
          cancelledBy: "User",
          cancelledByDisplay: "You",
          reason: "Personal reasons",
          cancellationDate: "December 20, 2023",
          isUnpaid: false,
          isRefundEligible: true,
          isRefundIneligible: false,
          isAdminCancelled: false,
          cancelCutoffDays: 2,
        },
      };

      await userCancellation(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "bookings@fatimanaqvi.com",
          to: "user@example.com",
          subject: "Booking Cancellation Confirmation",
          template: "userCancellationNotif",
          context: expect.objectContaining({
            name: "Test User",
            bookingId: "B12345",
            eventDate: "December 25, 2023",
            eventTime: "2:00 PM",
            cancelledBy: "User",
            cancelledByDisplay: "You",
            reason: "Personal reasons",
            cancellationDate: "December 20, 2023",
            isUnpaid: false,
            isRefundEligible: true,
            isRefundIneligible: false,
            isAdminCancelled: false,
            cancelCutoffDays: 2,
            frontend_url: "https://test-frontend.com",
            currentYear: expect.any(Number),
          }),
        })
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should handle admin-initiated cancellation correctly", async () => {
      const job = {
        data: {
          recipient: "user@example.com",
          name: "Test User",
          bookingId: "B12345",
          eventDate: "December 25, 2023",
          eventTime: "2:00 PM",
          cancelledBy: "Admin",
          cancelledByDisplay: "The administrator",
          reason: "Scheduling conflict",
          isAdminCancelled: true,
          isRefundEligible: true,
        },
      };

      await userCancellation(job);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            cancelledBy: "Admin",
            cancelledByDisplay: "The administrator",
            isAdminCancelled: true,
          }),
        })
      );
    });

    it("should handle when recipient is missing", async () => {
      const job = {
        data: {
          // No recipient
          name: "Test User",
          bookingId: "B12345",
        },
      };

      await userCancellation(job);

      expect(transporter.sendMail).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("no recipient provided")
      );
    });
  });
});
