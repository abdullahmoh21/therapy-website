/**
 * Test suite for Job Scheduler and Promoter System
 * Tests the MongoDB → Redis job promotion pipeline
 */

const mongoose = require("mongoose");
const Job = require("../../../models/Job");
const outboxService = require("../../../utils/queue/outbox");
const { addJob } = require("../../../utils/queue/jobScheduler");
const { promoteJobs } = require("../../../utils/queue/promoter");

// Mock logger to reduce noise
jest.mock("../../../logs/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  success: jest.fn(),
}));

// Mock Redis queue
const mockRedisQueue = {
  add: jest.fn(),
};

describe("Job Scheduler and Promoter System", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGO_URI || "mongodb://localhost:27017/test-scheduler"
      );
    }
  });

  beforeEach(async () => {
    await Job.deleteMany({});
    jest.clearAllMocks();
    mockRedisQueue.add.mockResolvedValue({ id: "mock-redis-job-id" });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("Job Scheduler - addJob()", () => {
    it("should persist job to MongoDB first", async () => {
      const result = await addJob("testJob", { test: "data" });

      expect(result.success).toBe(true);

      // Verify MongoDB persistence
      const jobs = await Job.find({ jobName: "testJob" });
      expect(jobs.length).toBe(1);
      expect(jobs[0].jobData).toEqual({ test: "data" });
      expect(jobs[0].status).toBe("pending");
    });

    it("should convert delay to runAt timestamp", async () => {
      const delay = 5 * 60 * 1000; // 5 minutes
      const beforeTime = Date.now();

      await addJob("delayedJob", { test: "delayed" }, { delay });

      const job = await Job.findOne({ jobName: "delayedJob" });
      const afterTime = Date.now();

      expect(job.runAt.getTime()).toBeGreaterThanOrEqual(beforeTime + delay);
      expect(job.runAt.getTime()).toBeLessThanOrEqual(afterTime + delay + 1000);
    });

    it("should accept direct runAt date", async () => {
      const runAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await addJob("scheduledJob", { test: "scheduled" }, { runAt });

      const job = await Job.findOne({ jobName: "scheduledJob" });
      expect(job.runAt.getTime()).toBe(runAt.getTime());
    });

    it("should respect priority option", async () => {
      await addJob("lowPriority", { test: "low" }, { priority: -10 });
      await addJob("highPriority", { test: "high" }, { priority: 100 });

      const jobs = await Job.find({}).sort({ priority: -1 });
      expect(jobs[0].jobName).toBe("highPriority");
      expect(jobs[1].jobName).toBe("lowPriority");
    });

    it("should respect maxAttempts option", async () => {
      await addJob(
        "customRetries",
        { test: "retries" },
        { attempts: 10, maxAttempts: 10 }
      );

      const job = await Job.findOne({ jobName: "customRetries" });
      expect(job.maxAttempts).toBe(10);
    });

    it("should prevent duplicate jobs", async () => {
      const jobData = { userId: "123", action: "sendEmail" };

      await addJob("uniqueJob", jobData);
      const result = await addJob("uniqueJob", jobData);

      expect(result.skipped).toBe(true);

      const jobs = await Job.find({ jobName: "uniqueJob" });
      expect(jobs.length).toBe(1);
    });

    it("should allow duplicate job names with different data", async () => {
      await addJob("emailJob", { userId: "user1" });
      await addJob("emailJob", { userId: "user2" });

      const jobs = await Job.find({ jobName: "emailJob" });
      expect(jobs.length).toBe(2);
    });

    it("should default to immediate execution when no delay/runAt", async () => {
      const beforeTime = Date.now();
      await addJob("immediateJob", { test: "now" });
      const afterTime = Date.now();

      const job = await Job.findOne({ jobName: "immediateJob" });
      expect(job.runAt.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(job.runAt.getTime()).toBeLessThanOrEqual(afterTime + 1000);
    });

    it("should handle MongoDB errors gracefully", async () => {
      // Force a validation error
      await expect(
        addJob("", { test: "data" }) // Empty job name should fail
      ).rejects.toThrow();
    });
  });

  describe("Job Promoter - promoteJobs()", () => {
    it("should promote due jobs to Redis queue", async () => {
      // Create a job that's due now
      await outboxService.addJob(
        "dueJob",
        { test: "due" },
        { runAt: new Date(Date.now() - 1000) }
      );

      const result = await promoteJobs(mockRedisQueue);

      expect(result.promoted).toBe(1);
      expect(result.failed).toBe(0);

      // Verify Redis queue.add was called
      expect(mockRedisQueue.add).toHaveBeenCalledWith(
        "dueJob",
        { test: "due" },
        expect.objectContaining({
          jobId: expect.any(String),
          delay: expect.any(Number),
        })
      );

      // Verify job status updated
      const job = await Job.findOne({ jobName: "dueJob" });
      expect(job.status).toBe("promoted");
      expect(job.attempts).toBe(1);
    });

    it("should promote jobs within promotion window", async () => {
      // Create job 30 minutes in the future
      const futureTime = new Date(Date.now() + 30 * 60 * 1000);
      await outboxService.addJob(
        "futureJob",
        { test: "future" },
        { runAt: futureTime }
      );

      const result = await promoteJobs(mockRedisQueue, 60); // 60 minute window

      expect(result.promoted).toBe(1);
    });

    it("should not promote jobs outside promotion window", async () => {
      // Create job 2 hours in the future
      const farFutureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      await outboxService.addJob(
        "farFutureJob",
        { test: "far" },
        { runAt: farFutureTime }
      );

      const result = await promoteJobs(mockRedisQueue, 60); // 60 minute window

      expect(result.promoted).toBe(0);

      // Job should remain pending
      const job = await Job.findOne({ jobName: "farFutureJob" });
      expect(job.status).toBe("pending");
    });

    it("should promote multiple jobs in priority order", async () => {
      await outboxService.addJob(
        "lowPriorityJob",
        { test: "low" },
        { priority: 1, runAt: new Date() }
      );
      await outboxService.addJob(
        "highPriorityJob",
        { test: "high" },
        { priority: 100, runAt: new Date() }
      );

      const result = await promoteJobs(mockRedisQueue);

      expect(result.promoted).toBe(2);

      // Verify high priority was promoted first
      const calls = mockRedisQueue.add.mock.calls;
      expect(calls[0][0]).toBe("highPriorityJob");
      expect(calls[1][0]).toBe("lowPriorityJob");
    });

    it("should handle Redis connection failures gracefully", async () => {
      await outboxService.addJob("testJob", { test: "data" });

      mockRedisQueue.add.mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await promoteJobs(mockRedisQueue);

      expect(result.failed).toBe(1);

      // Job should remain pending for retry
      const job = await Job.findOne({ jobName: "testJob" });
      expect(job.status).toBe("pending");
    });

    it("should handle duplicate job in Redis (race condition)", async () => {
      await outboxService.addJob("duplicateJob", { test: "dup" });

      mockRedisQueue.add.mockRejectedValue(new Error("Job already exists"));

      const result = await promoteJobs(mockRedisQueue);

      // Should still count as promoted since it's in Redis
      expect(result.promoted).toBe(1);

      const job = await Job.findOne({ jobName: "duplicateJob" });
      expect(job.status).toBe("promoted");
    });

    it("should respect batch limit", async () => {
      // Create 150 jobs (more than batch limit of 100)
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(outboxService.addJob(`job-${i}`, { index: i }));
      }
      await Promise.all(promises);

      const result = await promoteJobs(mockRedisQueue);

      // Should only process 100 jobs
      expect(result.promoted).toBeLessThanOrEqual(100);
    });

    it("should calculate correct delay for scheduled jobs", async () => {
      const futureTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await outboxService.addJob(
        "scheduledJob",
        { test: "scheduled" },
        { runAt: futureTime }
      );

      await promoteJobs(mockRedisQueue);

      const addCall = mockRedisQueue.add.mock.calls[0];
      const delay = addCall[2].delay;

      // Delay should be approximately 15 minutes (within 1 second tolerance)
      expect(delay).toBeGreaterThanOrEqual(14.9 * 60 * 1000);
      expect(delay).toBeLessThanOrEqual(15.1 * 60 * 1000);
    });

    it("should not promote already promoted jobs", async () => {
      const job = await outboxService.addJob("testJob", { test: "data" });
      await job.job.markPromoted();

      const result = await promoteJobs(mockRedisQueue);

      expect(result.promoted).toBe(0);
      expect(mockRedisQueue.add).not.toHaveBeenCalled();
    });

    it("should not promote completed jobs", async () => {
      const job = await outboxService.addJob("completedJob", { test: "done" });
      await job.job.markCompleted();

      const result = await promoteJobs(mockRedisQueue);

      expect(result.promoted).toBe(0);
    });

    it("should not promote failed jobs that exceeded max attempts", async () => {
      const result = await outboxService.addJob(
        "failedJob",
        { test: "fail" },
        { maxAttempts: 2 }
      );

      const job = result.job;
      await job.markFailed("Error 1");
      await job.markFailed("Error 2");

      const updatedJob = await Job.findById(job._id);
      expect(updatedJob.status).toBe("failed");

      const promotionResult = await promoteJobs(mockRedisQueue);
      expect(promotionResult.promoted).toBe(0);
    });

    it("should respect remaining attempts when promoting failed jobs", async () => {
      const result = await outboxService.addJob(
        "retryJob",
        { test: "retry" },
        { maxAttempts: 5 }
      );

      const job = result.job;
      await job.markFailed("First attempt failed");

      // Should be back to pending for retry
      const updatedJob = await Job.findById(job._id);
      expect(updatedJob.status).toBe("pending");
      expect(updatedJob.attempts).toBe(1);

      await promoteJobs(mockRedisQueue);

      // Should use remaining attempts (4 left)
      expect(mockRedisQueue.add).toHaveBeenCalledWith(
        "retryJob",
        { test: "retry" },
        expect.objectContaining({
          attempts: 4, // 5 max - 1 already used
        })
      );
    });
  });

  describe("Integration: Scheduler + Promoter", () => {
    it("should handle full lifecycle: schedule → promote → complete", async () => {
      // 1. Schedule job
      await addJob("lifecycleJob", { test: "lifecycle" });

      const pendingJob = await Job.findOne({ jobName: "lifecycleJob" });
      expect(pendingJob.status).toBe("pending");

      // 2. Promote job
      await promoteJobs(mockRedisQueue);

      const promotedJob = await Job.findOne({ jobName: "lifecycleJob" });
      expect(promotedJob.status).toBe("promoted");
      expect(mockRedisQueue.add).toHaveBeenCalled();

      // 3. Mark complete
      await promotedJob.markCompleted({ success: true });

      const completedJob = await Job.findOne({ jobName: "lifecycleJob" });
      expect(completedJob.status).toBe("completed");
      expect(completedJob.result.success).toBe(true);
    });

    it("should handle retry flow: schedule → promote → fail → retry", async () => {
      await addJob("retryJob", { test: "retry" }, { maxAttempts: 3 });

      // First promotion
      await promoteJobs(mockRedisQueue);
      let job = await Job.findOne({ jobName: "retryJob" });
      expect(job.status).toBe("promoted");

      // Fail (but under max attempts)
      await job.markFailed("Connection timeout");
      job = await Job.findOne({ jobName: "retryJob" });
      expect(job.status).toBe("pending"); // Back to pending for retry
      expect(job.attempts).toBeGreaterThanOrEqual(1);

      // Second promotion
      jest.clearAllMocks();
      await promoteJobs(mockRedisQueue);
      expect(mockRedisQueue.add).toHaveBeenCalled();
    });

    it("should handle delayed job scheduling", async () => {
      const runAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      await addJob("delayedJob", { test: "delayed" }, { runAt });

      // Should be in MongoDB but not promoted yet
      const job = await Job.findOne({ jobName: "delayedJob" });
      expect(job.status).toBe("pending");

      // Promote with standard window (60 minutes)
      await promoteJobs(mockRedisQueue, 60);

      // Should be promoted since it's within window
      const promotedJob = await Job.findOne({ jobName: "delayedJob" });
      expect(promotedJob.status).toBe("promoted");
    });

    it("should support job cancellation", async () => {
      const result = await addJob("cancellableJob", { test: "cancel" });
      const jobId = result.success
        ? (await Job.findOne({ jobName: "cancellableJob" })).jobId
        : null;

      await outboxService.cancelJob(jobId);

      const cancelledJob = await Job.findOne({ jobId });
      expect(cancelledJob.status).toBe("cancelled");

      // Should not be promoted
      await promoteJobs(mockRedisQueue);
      expect(mockRedisQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle empty job queue", async () => {
      const result = await promoteJobs(mockRedisQueue);

      expect(result.promoted).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockRedisQueue.add).not.toHaveBeenCalled();
    });

    it("should handle partial Redis failures", async () => {
      // Create 3 jobs
      await outboxService.addJob("job1", { test: "1" });
      await outboxService.addJob("job2", { test: "2" });
      await outboxService.addJob("job3", { test: "3" });

      // Fail the second job
      let callCount = 0;
      mockRedisQueue.add.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error("Redis error"));
        }
        return Promise.resolve({ id: "mock-id" });
      });

      const result = await promoteJobs(mockRedisQueue);

      expect(result.promoted).toBe(2);
      expect(result.failed).toBe(1);
    });

    it("should not process jobs with invalid runAt dates", async () => {
      // Try to create a job with invalid runAt (should fail validation)
      await expect(
        Job.create({
          jobName: "invalidJob",
          jobId: "invalid-123",
          jobData: { test: "invalid" },
          runAt: null, // Invalid
          status: "pending",
        })
      ).rejects.toThrow();

      // Promoter should handle empty queue gracefully
      const result = await promoteJobs(mockRedisQueue);
      expect(result.promoted).toBe(0);
    });

    it("should handle concurrent promoter runs", async () => {
      await outboxService.addJob("concurrentJob", { test: "concurrent" });

      // Run promoter twice simultaneously
      const [result1, result2] = await Promise.all([
        promoteJobs(mockRedisQueue),
        promoteJobs(mockRedisQueue),
      ]);

      // One should promote, one might skip due to already promoted
      const totalPromoted = result1.promoted + result2.promoted;
      expect(totalPromoted).toBeGreaterThan(0);
      expect(totalPromoted).toBeLessThanOrEqual(2); // At most 1 per run
    });
  });

  describe("Job Statistics and Queries", () => {
    it("should track job statistics correctly", async () => {
      await outboxService.addJob("job1", { test: "1" });
      await outboxService.addJob("job2", { test: "2" });
      const job3 = await outboxService.addJob("job3", { test: "3" });
      await job3.job.markCompleted();

      const stats = await Job.getJobStats();

      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(1);
    });

    it("should find overdue jobs", async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      await outboxService.addJob(
        "overdueJob",
        { test: "overdue" },
        { runAt: pastTime }
      );

      const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      await outboxService.addJob(
        "futureJob",
        { test: "future" },
        { runAt: futureTime }
      );

      const overdueJobs = await Job.findOverdueJobs();

      expect(overdueJobs.length).toBe(1);
      expect(overdueJobs[0].jobName).toBe("overdueJob");
    });

    it("should find due jobs within window", async () => {
      const now = new Date();
      await outboxService.addJob("dueNow", { test: "now" }, { runAt: now });

      const soon = new Date(Date.now() + 30 * 60 * 1000); // 30 min
      await outboxService.addJob("dueSoon", { test: "soon" }, { runAt: soon });

      const later = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      await outboxService.addJob(
        "dueLater",
        { test: "later" },
        { runAt: later }
      );

      const dueJobs = await Job.findDueJobs(60); // 60 minute window

      expect(dueJobs.length).toBe(2); // dueNow and dueSoon
    });
  });
});
