/**
 * Basic integration test for MongoDB + Redis job system
 * Run with: npm test -- job-system.test.js
 */

const mongoose = require("mongoose");
const Job = require("../../models/Job");
const outboxService = require("../../utils/queue/outbox");
const { addJob, sendEmail } = require("../../utils/queue/index");

// Mock logger to reduce noise
jest.mock("../../logs/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  success: jest.fn(),
}));

describe("Job Scheduling System", () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGO_URI || "mongodb://localhost:27017/test-jobs"
      );
    }
  });

  beforeEach(async () => {
    // Clear jobs collection before each test
    await Job.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("MongoDB Job Persistence", () => {
    test("should create a job in MongoDB", async () => {
      const result = await outboxService.addJob("testJob", { test: "data" });

      expect(result.success).toBe(true);
      expect(result.job).toBeDefined();
      expect(result.job.jobName).toBe("testJob");
      expect(result.job.status).toBe("pending");
    });

    test("should prevent duplicate jobs", async () => {
      const jobData = { test: "duplicate" };

      const result1 = await outboxService.addJob("testJob", jobData);
      const result2 = await outboxService.addJob("testJob", jobData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.skipped).toBe(true);
      expect(result2.reason).toBe("duplicate");

      const count = await Job.countDocuments({ jobName: "testJob" });
      expect(count).toBe(1);
    });

    test("should schedule job with runAt", async () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const result = await outboxService.addJob(
        "scheduledJob",
        { test: "scheduled" },
        {
          runAt: futureTime,
        }
      );

      expect(result.success).toBe(true);
      expect(result.job.runAt).toEqual(futureTime);
      expect(result.job.status).toBe("pending");
    });

    test("should handle immediate jobs (runAt = now)", async () => {
      const result = await outboxService.addJob(
        "immediateJob",
        { test: "immediate" },
        {
          runAt: new Date(),
        }
      );

      expect(result.success).toBe(true);
      expect(result.job.runAt).toBeDefined();
      expect(result.job.status).toBe("pending");
    });
  });

  describe("Job Status Transitions", () => {
    test("should mark job as promoted", async () => {
      const result = await outboxService.addJob("testJob", { test: "data" });
      const job = result.job;

      await job.markPromoted();

      const updated = await Job.findById(job._id);
      expect(updated.status).toBe("promoted");
      expect(updated.attempts).toBe(1);
    });

    test("should mark job as completed", async () => {
      const result = await outboxService.addJob("testJob", { test: "data" });
      const job = result.job;

      await job.markPromoted();
      await job.markCompleted({ success: true });

      const updated = await Job.findById(job._id);
      expect(updated.status).toBe("completed");
      expect(updated.completedAt).toBeDefined();
    });

    test("should mark job as failed and allow retries", async () => {
      const result = await outboxService.addJob(
        "testJob",
        { test: "data" },
        {
          maxAttempts: 3,
        }
      );
      const job = result.job;

      // First failure
      await job.markFailed("Test error");
      let updated = await Job.findById(job._id);
      expect(updated.status).toBe("pending"); // Should retry
      expect(updated.attempts).toBe(1);

      // Second failure
      await updated.markFailed("Test error 2");
      updated = await Job.findById(job._id);
      expect(updated.status).toBe("pending"); // Should retry
      expect(updated.attempts).toBe(2);

      // Third failure (max attempts reached)
      await updated.markFailed("Test error 3");
      updated = await Job.findById(job._id);
      expect(updated.status).toBe("failed"); // No more retries
      expect(updated.attempts).toBe(3);
    });
  });

  describe("Job Queries", () => {
    test("should find overdue jobs", async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await outboxService.addJob(
        "overdueJob",
        { test: "overdue" },
        { runAt: pastTime }
      );
      await outboxService.addJob(
        "futureJob",
        { test: "future" },
        { runAt: futureTime }
      );

      const overdue = await Job.findOverdueJobs();

      expect(overdue.length).toBe(1);
      expect(overdue[0].jobName).toBe("overdueJob");
    });

    test("should get job stats", async () => {
      await outboxService.addJob("job1", { test: "1" });
      await outboxService.addJob("job2", { test: "2" });

      const job3 = await outboxService.addJob("job3", { test: "3" });
      await job3.job.markCompleted();

      const stats = await Job.getJobStats();

      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(1);
    });
  });

  describe("Job Management", () => {
    test("should cancel a pending job", async () => {
      const result = await outboxService.addJob("cancelMe", { test: "cancel" });
      const jobId = result.job.jobId;

      const cancelResult = await outboxService.cancelJob(jobId);

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.job.status).toBe("cancelled");
    });

    test("should not cancel a completed job", async () => {
      const result = await outboxService.addJob("completed", { test: "done" });
      await result.job.markCompleted();

      const cancelResult = await outboxService.cancelJob(result.job.jobId);

      expect(cancelResult.success).toBe(false);
      expect(cancelResult.error).toContain("already completed");
    });

    test("should retry a failed job", async () => {
      const result = await outboxService.addJob(
        "retryMe",
        { test: "retry" },
        {
          maxAttempts: 1,
        }
      );
      await result.job.markFailed("Test failure");

      const retryResult = await outboxService.retryJob(result.job.jobId);

      expect(retryResult.success).toBe(true);
      expect(retryResult.job.status).toBe("pending");
      expect(retryResult.job.attempts).toBe(0);
    });
  });

  describe("API Integration", () => {
    test("sendEmail should persist to MongoDB", async () => {
      // Note: This won't actually send an email or add to Redis in test environment
      // It will persist to MongoDB though
      const result = await addJob("verifyEmail", {
        recipient: "test@example.com",
        token: "test-token",
      });

      // Check MongoDB
      const jobs = await Job.find({ jobName: "verifyEmail" });
      expect(jobs.length).toBe(1);
      expect(jobs[0].jobData.recipient).toBe("test@example.com");
    });

    test("addJob with delay should set correct runAt", async () => {
      const delay = 5 * 60 * 1000; // 5 minutes
      const beforeTime = Date.now();

      await addJob("delayedJob", { test: "delayed" }, { delay });

      const job = await Job.findOne({ jobName: "delayedJob" });
      const afterTime = Date.now();

      expect(job).toBeDefined();
      expect(job.runAt.getTime()).toBeGreaterThanOrEqual(beforeTime + delay);
      expect(job.runAt.getTime()).toBeLessThanOrEqual(afterTime + delay + 1000); // 1s tolerance
    });
  });

  describe("Priority and Options", () => {
    test("should respect priority", async () => {
      await outboxService.addJob(
        "lowPriority",
        { test: "low" },
        { priority: -10 }
      );
      await outboxService.addJob(
        "highPriority",
        { test: "high" },
        { priority: 100 }
      );

      const jobs = await Job.find({}).sort({ priority: -1 }); // Descending

      expect(jobs[0].jobName).toBe("highPriority");
      expect(jobs[1].jobName).toBe("lowPriority");
    });

    test("should respect maxAttempts", async () => {
      const result = await outboxService.addJob(
        "customAttempts",
        { test: "attempts" },
        {
          maxAttempts: 10,
        }
      );

      expect(result.job.maxAttempts).toBe(10);
    });
  });
});
