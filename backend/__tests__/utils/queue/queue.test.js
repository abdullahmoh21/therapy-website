// Set environment variables
process.env.NODE_ENV = "test";

// Mock Redis client
jest.mock("../../../utils/redisClient", () => ({
  checkRedisQueueAvailability: jest.fn().mockResolvedValue(true),
  redisQueueClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  },
}));

// Mock logger
jest.mock("../../../logs/logger", () => ({
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
jest.mock("../../../utils/queue/worker", () => ({
  buildWorker: jest.fn().mockResolvedValue({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
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
const redisClient = require("../../../utils/redisClient");
const logger = require("../../../logs/logger");

// Import modules being tested
const { sendEmail, initializeQueue } = require("../../../utils/queue");

// Import mongoose and MongoDB Memory Server
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Import real models
const User = require("../../../models/User");
const Booking = require("../../../models/Booking");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");
const Job = require("../../../models/Job");

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
    // Only try to shutdown queue if it was initialized
    try {
      const { shutdownQueue } = require("../../../utils/queue");
      if (shutdownQueue) {
        await shutdownQueue();
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Redis is available
    redisClient.checkRedisQueueAvailability.mockResolvedValue(true);
  });

  describe("Queue Initialization", () => {
    it("should initialize the queue when Redis is available", async () => {
      const result = await initializeQueue();
      expect(result).toBe(true);
      expect(Queue).toHaveBeenCalled();
    });

    it("should not initialize the queue when Redis is unavailable", async () => {
      redisClient.checkRedisQueueAvailability.mockResolvedValue(false);
      const result = await initializeQueue();
      expect(result).toBe(false);
      expect(Queue).not.toHaveBeenCalled();
    });
  });

  describe("Send Email Function", () => {
    describe("When queue is available", () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        redisClient.checkRedisQueueAvailability.mockResolvedValue(true);
        await initializeQueue();
      });

      it("should add a UserAccountVerificationEmail job to the queue", async () => {
        const jobData = {
          userId: "507f1f77bcf86cd799439011",
          verificationToken: "token123",
        };

        await sendEmail("UserAccountVerificationEmail", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
          "UserAccountVerificationEmail",
          jobData,
          expect.objectContaining({
            jobId: expect.any(String),
            removeOnComplete: true,
            removeOnFail: expect.any(Boolean),
            attempts: 5,
          })
        );
      });

      it("should add a UserPasswordResetEmail job to the queue", async () => {
        const jobData = {
          userId: "507f1f77bcf86cd799439011",
          resetToken: "token123",
        };

        await sendEmail("UserPasswordResetEmail", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
          "UserPasswordResetEmail",
          jobData,
          expect.any(Object)
        );
      });

      it("should add a UserInvitationEmail job to the queue", async () => {
        const jobData = {
          inviteeId: "507f1f77bcf86cd799439011",
        };

        await sendEmail("UserInvitationEmail", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
          "UserInvitationEmail",
          jobData,
          expect.any(Object)
        );
      });

      it("should add a ContactInquiry job to the queue", async () => {
        const jobData = {
          type: "General",
          name: "Test User",
          email: "test@example.com",
          phone: "123-456-7890",
          message: "This is a test message",
        };

        await sendEmail("ContactInquiry", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
          "ContactInquiry",
          jobData,
          expect.any(Object)
        );
      });

      it("should add an EventDeletedNotification job to the queue", async () => {
        const jobData = {
          userId: "507f1f77bcf86cd799439011",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          reason: "Test reason",
        };

        await sendEmail("EventDeletedNotification", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
          "EventDeletedNotification",
          jobData,
          expect.any(Object)
        );
      });

      it("should add a BookingCancellationNotifications job to the queue", async () => {
        const jobData = {
          bookingId: "507f1f77bcf86cd799439011",
          userId: "507f1f77bcf86cd799439012",
          cancelledBy: "user",
          reason: "Testing cancellation",
          eventStartTime: new Date("2023-12-25T14:00:00Z"),
          cancellationDate: new Date(),
          paymentId: "507f1f77bcf86cd799439013",
          bookingIdNumber: 12345,
          notifyAdmin: true,
        };

        await sendEmail("BookingCancellationNotifications", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
          "BookingCancellationNotifications",
          jobData,
          expect.any(Object)
        );
      });

      it("should add a SystemAlert job to the queue", async () => {
        const jobData = {
          alertType: "serverError",
          extraData: { message: "Test error" },
        };

        await sendEmail("SystemAlert", jobData);

        expect(mockAdd).toHaveBeenCalledWith(
          "SystemAlert",
          jobData,
          expect.any(Object)
        );
      });
    });

    describe("Fallback Execution (When Queue is Down)", () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        // Clear Job collection
        await Job.deleteMany({});
        // Setup for Redis connection failure
        mockAdd.mockRejectedValue(new Error("Redis connection failed"));
      });

      it("should persist UserAccountVerificationEmail to MongoDB when queue is down", async () => {
        const jobData = {
          userId: "507f1f77bcf86cd799439011",
          verificationToken: "token123",
        };

        const result = await sendEmail("UserAccountVerificationEmail", jobData);

        expect(result).toHaveProperty("success", true);
        expect(result).toHaveProperty("deferred", true);

        // Check that job was persisted to MongoDB
        const savedJob = await Job.findOne({
          jobName: "UserAccountVerificationEmail",
        });
        expect(savedJob).toBeTruthy();
        expect(savedJob.jobData).toMatchObject(jobData);
        expect(savedJob.status).toBe("pending");
      });

      it("should persist UserPasswordResetEmail to MongoDB when queue is down", async () => {
        const jobData = {
          userId: "507f1f77bcf86cd799439011",
          resetToken: "token123",
        };

        const result = await sendEmail("UserPasswordResetEmail", jobData);

        expect(result).toHaveProperty("success", true);
        expect(result).toHaveProperty("deferred", true);

        // Check that job was persisted to MongoDB
        const savedJob = await Job.findOne({
          jobName: "UserPasswordResetEmail",
        });
        expect(savedJob).toBeTruthy();
        expect(savedJob.jobData).toMatchObject(jobData);
        expect(savedJob.status).toBe("pending");
      });

      it("should persist ContactInquiry to MongoDB when queue is down", async () => {
        const jobData = {
          type: "General",
          name: "Test User",
          email: "test@example.com",
          phone: "123-456-7890",
          message: "This is a test message",
        };

        const result = await sendEmail("ContactInquiry", jobData);

        expect(result).toHaveProperty("success", true);
        expect(result).toHaveProperty("deferred", true);

        // Check that job was persisted to MongoDB
        const savedJob = await Job.findOne({ jobName: "ContactInquiry" });
        expect(savedJob).toBeTruthy();
        expect(savedJob.jobData).toMatchObject(jobData);
        expect(savedJob.status).toBe("pending");
      });

      it("should persist to MongoDB for unknown job type", async () => {
        const jobData = { test: "data" };

        const result = await sendEmail("UnknownJobType", jobData);

        // Should still persist even for unknown types
        expect(result).toHaveProperty("success", true);
        expect(result).toHaveProperty("deferred", true);

        const savedJob = await Job.findOne({ jobName: "UnknownJobType" });
        expect(savedJob).toBeTruthy();
      });
    });

    describe("Queue never initialized", () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await Job.deleteMany({});
      });

      it("should persist job to MongoDB when queue was never initialized", async () => {
        const jobData = {
          userId: "507f1f77bcf86cd799439011",
          verificationToken: "token123",
        };

        // Get a fresh copy of the module with queue set to null
        const { sendEmail } = require("../../../utils/queue");
        const result = await sendEmail("UserAccountVerificationEmail", jobData);

        expect(result).toHaveProperty("success", true);
        expect(result).toHaveProperty("deferred", true);

        // Check that job was persisted to MongoDB
        const savedJob = await Job.findOne({
          jobName: "UserAccountVerificationEmail",
        });
        expect(savedJob).toBeTruthy();
        expect(savedJob.jobData).toMatchObject(jobData);
        expect(savedJob.status).toBe("pending");
      });
    });
  });
});
