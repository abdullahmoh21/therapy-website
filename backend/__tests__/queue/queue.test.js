const { sendEmail, initializeQueue } = require("../../utils/queue");
const { checkRedisAvailability } = require("../../utils/redisClient");
const jobHandlers = require("../../utils/queue/jobs/index");
const { Queue } = require("bullmq");
const logger = require("../../logs/logger");

// Mock dependencies
jest.mock("../../utils/redisClient");
jest.mock("../../utils/emailTransporter", () => ({
  transporter: {
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  },
}));
jest.mock("bullmq");
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
jest.mock("../../models/User", () => ({
  findOne: jest.fn().mockResolvedValue({
    _id: "user123",
    name: "Test User",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
  }),
}));
jest.mock("../../models/Booking", () => ({
  findOne: jest.fn().mockResolvedValue({
    _id: "booking123",
    bookingId: "B12345",
    userId: "user123",
    eventStartTime: new Date("2023-12-25T14:00:00Z"),
    cancellation: {
      date: new Date(),
      cancelledBy: "User",
      reason: "Testing cancellation",
    },
  }),
}));
jest.mock("../../models/Payment", () => ({
  findOne: jest.fn().mockResolvedValue({
    _id: "payment123",
    userId: "user123",
    bookingId: "booking123",
    amount: 100,
    currency: "USD",
    transactionStatus: "Completed",
    transactionReferenceNumber: "TRX12345",
    paymentCompletedDate: new Date(),
  }),
  updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
}));

// Create spies for job handlers
Object.keys(jobHandlers).forEach((jobName) => {
  jest.spyOn(jobHandlers, jobName).mockResolvedValue({ success: true });
});

// Mock Queue implementation
const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: "job123" }),
};
Queue.mockImplementation(() => mockQueue);

// Mock worker setup
jest.mock("../../utils/queue/worker", () => ({
  buildWorker: jest.fn().mockResolvedValue({
    on: jest.fn(),
  }),
}));

describe("Queue System Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Redis is available
    checkRedisAvailability.mockResolvedValue(true);
  });

  describe("Queue Initialization", () => {
    it("should initialize the queue when Redis is available", async () => {
      const result = await initializeQueue();
      expect(result).toBe(true);
      expect(Queue).toHaveBeenCalled();
    });

    it("should not initialize the queue when Redis is unavailable", async () => {
      checkRedisAvailability.mockResolvedValue(false);
      const result = await initializeQueue();
      expect(result).toBe(false);
      expect(Queue).not.toHaveBeenCalled();
    });
  });

  describe("Send Email Function", () => {
    describe("When queue is available", () => {
      beforeEach(async () => {
        await initializeQueue();
      });

      it("should add a verifyEmail job to the queue", async () => {
        const jobData = {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/verify/token123",
        };

        await sendEmail("verifyEmail", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "verifyEmail",
          jobData,
          expect.objectContaining({
            jobId: expect.any(String),
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 5,
          })
        );
        expect(jobHandlers.verifyEmail).not.toHaveBeenCalled();
      });

      it("should add a resetPassword job to the queue", async () => {
        const jobData = {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/reset/token123",
        };

        await sendEmail("resetPassword", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "resetPassword",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.resetPassword).not.toHaveBeenCalled();
      });

      it("should add a sendInvitation job to the queue", async () => {
        const jobData = {
          recipient: "test@example.com",
          link: "https://example.com/invite/token123",
          name: "Test User",
        };

        await sendEmail("sendInvitation", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "sendInvitation",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.sendInvitation).not.toHaveBeenCalled();
      });

      it("should add a ContactMe job to the queue", async () => {
        const jobData = {
          type: "General",
          name: "Test User",
          email: "test@example.com",
          phone: "123-456-7890",
          message: "This is a test message",
        };

        await sendEmail("ContactMe", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "ContactMe",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.ContactMe).not.toHaveBeenCalled();
      });

      it("should add an eventDeleted job to the queue", async () => {
        const jobData = {
          recipient: "test@example.com",
          name: "Test User",
          eventDate: "December 25, 2023",
          eventTime: "2:00 PM",
          reason: "Test reason",
        };

        await sendEmail("eventDeleted", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "eventDeleted",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.eventDeleted).not.toHaveBeenCalled();
      });

      it("should add a userCancellation job to the queue", async () => {
        const jobData = {
          recipient: "test@example.com",
          name: "Test User",
          bookingId: "B12345",
          eventDate: "December 25, 2023",
          eventTime: "2:00 PM",
        };

        await sendEmail("userCancellation", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "userCancellation",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.userCancellation).not.toHaveBeenCalled();
      });

      it("should add an adminCancellationNotif job to the queue", async () => {
        const jobData = {
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
          },
        };

        await sendEmail("adminCancellationNotif", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "adminCancellationNotif",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.adminCancellationNotif).not.toHaveBeenCalled();
      });

      it("should add an adminAlert job to the queue", async () => {
        const jobData = {
          alertType: "serverError",
          extraData: { message: "Test error" },
        };

        await sendEmail("adminAlert", jobData);

        expect(mockQueue.add).toHaveBeenCalledWith(
          "adminAlert",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.adminAlert).not.toHaveBeenCalled();
      });
    });

    describe("Fallback Execution (When Queue is Down)", () => {
      beforeEach(() => {
        // Simulate queue not initialized
        // By not calling initializeQueue()
        mockQueue.add.mockRejectedValue(new Error("Redis connection failed"));
      });

      it("should execute verifyEmail handler directly when queue is down", async () => {
        const jobData = {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/verify/token123",
        };

        await sendEmail("verifyEmail", jobData);

        expect(jobHandlers.verifyEmail).toHaveBeenCalledWith({ data: jobData });
        expect(logger.warn).toHaveBeenCalled();
      });

      it("should execute resetPassword handler directly when queue is down", async () => {
        const jobData = {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/reset/token123",
        };

        await sendEmail("resetPassword", jobData);

        expect(jobHandlers.resetPassword).toHaveBeenCalledWith({
          data: jobData,
        });
        expect(logger.warn).toHaveBeenCalled();
      });

      it("should execute ContactMe handler directly when queue is down", async () => {
        const jobData = {
          type: "General",
          name: "Test User",
          email: "test@example.com",
          phone: "123-456-7890",
          message: "This is a test message",
        };

        await sendEmail("ContactMe", jobData);

        expect(jobHandlers.ContactMe).toHaveBeenCalledWith({ data: jobData });
        expect(logger.warn).toHaveBeenCalled();
      });

      it("should throw error for unknown job type", async () => {
        const jobData = { test: "data" };

        await expect(sendEmail("unknownJobType", jobData)).rejects.toThrow(
          "Unknown job type"
        );
      });
    });

    describe("Queue never initialized", () => {
      // Don't initialize queue in this test suite

      it("should execute job handler directly when queue was never initialized", async () => {
        const jobData = {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/verify/token123",
        };

        await sendEmail("verifyEmail", jobData);

        expect(jobHandlers.verifyEmail).toHaveBeenCalledWith({ data: jobData });
        expect(logger.warn).toHaveBeenCalled();
        // Update this assertion to match any warning about queue being unavailable
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringMatching(/Queue (unavailable|Redis connection failed)/)
        );
      });
    });
  });
});
