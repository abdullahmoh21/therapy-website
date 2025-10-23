const Job = require("../../models/Job");
const logger = require("../../logs/logger");
const { getJobUniqueId } = require("./utils");

/**
 * Outbox Service - Implements the Outbox Pattern
 *
 * For immediate jobs (runAt = now), we write to MongoDB first,
 * then immediately try to promote to Redis. This gives us:
 * 1. Durability - Job is persisted even if Redis fails
 * 2. Speed - Still tries immediate execution via Redis
 * 3. Fallback - Job promoter will pick it up if Redis add fails
 */

class OutboxService {
  constructor() {
    this.isProcessing = false;
    this.processInterval = null;
  }

  /**
   * Add a job to the outbox (MongoDB)
   * @param {string} jobName - Name of the job handler
   * @param {object} jobData - Job payload
   * @param {object} options - Options including runAt, priority, maxAttempts
   * @returns {Promise<object>} Created job document
   */
  async addJob(jobName, jobData, options = {}) {
    const {
      runAt = new Date(), // Default to immediate
      priority = 0,
      maxAttempts = 5,
      promotionWindowMinutes = 60,
    } = options;

    // Generate unique job ID for deduplication
    const jobId = getJobUniqueId(jobName, jobData);

    try {
      // Try to find existing pending/promoted job with same ID
      const existingJob = await Job.findOne({
        jobId,
        status: { $in: ["pending", "promoted"] },
      });

      if (existingJob) {
        logger.info(
          `Job ${jobId} already exists with status ${existingJob.status}, skipping`
        );
        return {
          success: true,
          skipped: true,
          reason: "duplicate",
          job: existingJob,
        };
      }

      // Create new job in MongoDB
      const job = await Job.create({
        jobName,
        jobId,
        jobData,
        runAt: new Date(runAt),
        priority,
        maxAttempts,
        promotionWindowMinutes,
        status: "pending",
      });

      logger.debug(
        `Job ${jobId} (${jobName}) saved to MongoDB, runAt: ${job.runAt}`
      );

      return {
        success: true,
        job,
        skipped: false,
      };
    } catch (error) {
      // Handle duplicate key errors (race condition)
      if (error.code === 11000) {
        logger.info(
          `Duplicate job ${jobId} detected (race condition), skipping`
        );
        return {
          success: true,
          skipped: true,
          reason: "duplicate",
        };
      }

      logger.error(`Failed to add job to outbox: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    return Job.findOne({ jobId });
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId) {
    const job = await Job.findOne({ jobId });

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (job.status === "completed") {
      return { success: false, error: "Job already completed" };
    }

    if (job.status === "failed") {
      return { success: false, error: "Job already failed" };
    }

    job.status = "cancelled";
    await job.save();

    logger.info(`Job ${jobId} cancelled`);
    return { success: true, job };
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status, limit = 100) {
    return Job.find({ status }).sort({ createdAt: -1 }).limit(limit);
  }

  /**
   * Get overdue jobs that should have run already
   */
  async getOverdueJobs() {
    return Job.findOverdueJobs();
  }

  /**
   * Get stats about jobs
   */
  async getStats() {
    return Job.getJobStats();
  }

  /**
   * Clean up old completed jobs (older than retention period)
   * TTL index handles this automatically, but this provides manual control
   */
  async cleanupOldJobs(retentionDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await Job.deleteMany({
      status: { $in: ["completed", "failed", "cancelled"] },
      completedAt: { $lt: cutoffDate },
    });

    logger.info(`Cleaned up ${result.deletedCount} old jobs`);
    return result;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId) {
    const job = await Job.findOne({ jobId });

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    if (job.status !== "failed") {
      return { success: false, error: "Only failed jobs can be retried" };
    }

    // Reset to pending with current time
    job.status = "pending";
    job.runAt = new Date();
    job.attempts = 0;
    job.lastError = null;
    await job.save();

    logger.info(`Job ${jobId} marked for retry`);
    return { success: true, job };
  }

  /**
   * Start background processor for immediate jobs
   * This is a safety net - the main promotion happens via the job promoter
   */
  startProcessor(intervalMs = 5000) {
    if (this.processInterval) {
      logger.warn("Outbox processor already running");
      return;
    }

    logger.info(`Starting outbox processor (interval: ${intervalMs}ms)`);

    this.processInterval = setInterval(async () => {
      if (this.isProcessing) return;

      this.isProcessing = true;
      try {
        await this.processImmediateJobs();
      } catch (error) {
        logger.error(`Outbox processor error: ${error.message}`);
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  /**
   * Stop background processor
   */
  stopProcessor() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      logger.info("Outbox processor stopped");
    }
  }

  /**
   * Process immediate jobs (internal method)
   * This looks for pending jobs that should run now
   */
  async processImmediateJobs() {
    // This is just a safety net - the main job promoter handles this
    // We only look for jobs that are overdue by more than 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const overdueJobs = await Job.find({
      status: "pending",
      runAt: { $lt: oneMinuteAgo },
    }).limit(10);

    if (overdueJobs.length > 0) {
      logger.warn(`Found ${overdueJobs.length} overdue jobs in outbox`);
      // These will be picked up by the main job promoter
    }
  }
}

// Export singleton instance
const outboxService = new OutboxService();

module.exports = outboxService;
