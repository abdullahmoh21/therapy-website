// Set environment variables
process.env.NODE_ENV = "test";

// Mock Redis client
jest.mock("../../utils/redisClient", () => ({
  checkRedisAvailability: jest.fn().mockResolvedValue(true),
  client: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  },
}));

// Mock logger
jest.mock("../../logs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock BullMQ
const mockAdd = jest.fn().mockResolvedValue({ id: "job123" });
const mockQueue = { add: mockAdd };
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => mockQueue),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

// Mock worker module
jest.mock("../../utils/queue/worker", () => ({
  buildWorker: jest.fn().mockResolvedValue({
    on: jest.fn(),
  }),
}));

// Mock ioredis
jest.mock("ioredis", () => {
  class Redis {
    constructor() {
      this.status = "ready";
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

// Import the mocked modules
const { Queue } = require("bullmq");
const redisClient = require("../../utils/redisClient");
const logger = require("../../logs/logger");

// Import modules being tested
const { sendEmail, initializeQueue } = require("../../utils/queue");
const jobHandlers = require("../../utils/queue/jobs/index");

// Create spies for job handlers
Object.keys(jobHandlers).forEach((jobName) => {
  jest.spyOn(jobHandlers, jobName).mockResolvedValue({ success: true });
});

// Import mongoose and MongoDB Memory Server
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Import real models
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const Config = require("../../models/Config");

describe("Queue System Tests", () => {
  let mongoServer;

  // Setup test database
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

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

  // Cleanup after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Redis is available
    redisClient.checkRedisAvailability.mockResolvedValue(true);
  });

  describe("Queue Initialization", () => {
    it("should initialize the queue when Redis is available", async () => {
      const result = await initializeQueue();
      expect(result).toBe(true);
      expect(Queue).toHaveBeenCalled();
    });

    it("should not initialize the queue when Redis is unavailable", async () => {
      redisClient.checkRedisAvailability.mockResolvedValue(false);
      const result = await initializeQueue();
      expect(result).toBe(false);
      expect(Queue).not.toHaveBeenCalled();
    });
  });

  describe("Send Email Function", () => {
    describe("When queue is available", () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        redisClient.checkRedisAvailability.mockResolvedValue(true);
        await initializeQueue();
      });

      it("should add a verifyEmail job to the queue", async () => {
        const jobData = {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/verify/token123",
        };

        await sendEmail("verifyEmail", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
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

        expect(mockAdd).toHaveBeenCalledWith(
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

        expect(mockAdd).toHaveBeenCalledWith(
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

        expect(mockAdd).toHaveBeenCalledWith(
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

        expect(mockAdd).toHaveBeenCalledWith(
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

        expect(mockAdd).toHaveBeenCalledWith(
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

        expect(mockAdd).toHaveBeenCalledWith(
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

        expect(mockAdd).toHaveBeenCalledWith(
          "adminAlert",
          jobData,
          expect.any(Object)
        );
        expect(jobHandlers.adminAlert).not.toHaveBeenCalled();
      });
    });

    describe("Fallback Execution (When Queue is Down)", () => {
      beforeEach(() => {
        jest.clearAllMocks();
        // Setup for Redis connection failure
        mockAdd.mockRejectedValue(new Error("Redis connection failed"));
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
      // Clear state between test suites
      beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
      });

      it("should execute job handler directly when queue was never initialized", async () => {
        // Re-import job handlers and re-apply spies after module reset
        const jobHandlers = require("../../utils/queue/jobs/index");
        Object.keys(jobHandlers).forEach((jobName) => {
          jest.spyOn(jobHandlers, jobName).mockResolvedValue({ success: true });
        });

        // Also re-import logger since we need to spy on it
        const logger = require("../../logs/logger");

        const jobData = {
          name: "Test User",
          recipient: "test@example.com",
          link: "https://example.com/verify/token123",
        };

        // Get a fresh copy of the module with queue set to null
        const { sendEmail } = require("../../utils/queue");
        await sendEmail("verifyEmail", jobData);

        expect(jobHandlers.verifyEmail).toHaveBeenCalledWith({ data: jobData });
        expect(logger.warn).toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringMatching(/Queue unavailable/)
        );
      });
    });
  });
});
