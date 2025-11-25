const logger = require("../../logs/logger");
const { getJobUniqueId } = require("./utils");
const outboxService = require("./outbox");

/**
 * Job Scheduler - Handles adding jobs to the queue
 * This module is separate from index.js to avoid circular dependencies
 * when job handlers need to schedule other jobs.
 */

let queueInstance = null;

/**
 * Set the queue instance (called from queue/index.js after initialization)
 */
function setQueueInstance(queue) {
  queueInstance = queue;
}

/**
 * Add a job - with MongoDB persistence
 * @param {string} jobName - Name of the job handler
 * @param {object} jobData - Job payload
 * @param {object} options - Options including delay, runAt, priority
 * @returns {Promise}
 */
async function addJob(jobName, jobData, options = {}) {
  // Convert delay to runAt if provided
  let runAt = options.runAt;
  if (!runAt && options.delay) {
    runAt = new Date(Date.now() + options.delay);
  }

  // Step 1: Always persist to MongoDB first (source of truth)
  try {
    const result = await outboxService.addJob(jobName, jobData, {
      runAt,
      priority: options.priority || 0,
      maxAttempts: options.attempts || 5,
    });

    if (result.skipped) {
      logger.info(`Job ${jobName} skipped (duplicate)`);
      return { success: true, skipped: true, reason: result.reason };
    }

    logger.debug(
      `Job ${jobName} persisted to MongoDB with ID: ${result.job.jobId}`
    );
  } catch (error) {
    logger.error(`Failed to persist job to MongoDB: ${error.message}`);
    throw new Error(`Job persistence failed: ${error.message}`);
  }

  // Step 2: If Redis queue is available AND job should run soon, add to Redis immediately
  if (queueInstance) {
    const jobRunAt = runAt || new Date();
    const delay = Math.max(0, new Date(jobRunAt).getTime() - Date.now());

    // Only add to Redis if it should run within the next hour (otherwise promoter will handle it)
    const oneHour = 60 * 60 * 1000;
    if (delay <= oneHour) {
      try {
        const jobId = getJobUniqueId(jobName, jobData);
        await queueInstance.add(jobName, jobData, {
          jobId,
          delay,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: options.attempts || 5,
          priority: options.priority || 0,
          ...options,
        });
        logger.debug(
          `Job ${jobName} added to Redis queue with delay ${delay}ms`
        );
        return { success: true, immediate: true };
      } catch (error) {
        if (/already exists/i.test(error.message)) {
          logger.info(`Job ${jobName} already in Redis queue`);
          return { success: true, skipped: true, reason: "duplicate" };
        }

        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("Connection is closed") ||
          error.message.includes("Connection lost") ||
          error.code === "ECONNREFUSED"
        ) {
          logger.warn(
            `Redis unavailable for job ${jobName}, will be promoted later`
          );
          return { success: true, deferred: true };
        }

        // Other errors
        logger.error(`Failed to add job to Redis: ${error.message}`);
        // Job is still in MongoDB, so promoter will pick it up
        return { success: true, deferred: true };
      }
    } else {
      // Job is scheduled far in the future, promoter will handle it
      logger.debug(
        `Job ${jobName} scheduled for ${jobRunAt}, will be promoted later`
      );
      return { success: true, scheduled: true };
    }
  } else {
    // Redis not available, job is in MongoDB and promoter will handle it
    logger.debug(
      `Redis queue unavailable, job ${jobName} will be promoted when queue is ready`
    );
    return { success: true, deferred: true };
  }
}

/**
 * Send email - wrapper around addJob for backward compatibility
 */
const sendEmail = async (jobName, jobData, options = {}) => {
  return addJob(jobName, jobData, options);
};

module.exports = { addJob, sendEmail, setQueueInstance };
