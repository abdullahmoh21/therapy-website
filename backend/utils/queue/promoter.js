const cron = require("node-cron");
const Job = require("../../models/Job");
const logger = require("../../logs/logger");

/**
 * Job Promoter - Moves jobs from MongoDB to Redis when they're ready to run
 *
 * This runs periodically and:
 * 1. Finds jobs that are due (or will be due soon)
 * 2. Promotes them to Redis queue for execution
 * 3. Handles failures gracefully
 */

let promoterTask = null;
let isPromoting = false;

/**
 * Promote jobs from MongoDB to Redis
 * @param {object} redisQueue - BullMQ Queue instance
 * @param {number} promotionWindowMinutes - How far ahead to look
 */
async function promoteJobs(redisQueue, promotionWindowMinutes = 60) {
  if (isPromoting) {
    logger.debug("Job promotion already in progress, skipping");
    return { promoted: 0, failed: 0 };
  }

  isPromoting = true;
  let promoted = 0;
  let failed = 0;

  try {
    // Find jobs that should be promoted
    const now = new Date();
    const futureTime = new Date(
      now.getTime() + promotionWindowMinutes * 60 * 1000
    );

    const dueJobs = await Job.find({
      status: "pending",
      runAt: { $lte: futureTime },
    })
      .sort({ priority: -1, runAt: 1 })
      .limit(100); // Process in batches of 100

    if (dueJobs.length === 0) {
      logger.debug("No jobs to promote");
      return { promoted: 0, failed: 0 };
    }

    logger.info(`Found ${dueJobs.length} jobs to promote to Redis`);

    for (const job of dueJobs) {
      try {
        // Calculate delay until job should run
        const delay = Math.max(0, new Date(job.runAt).getTime() - Date.now());

        // Add to Redis queue
        await redisQueue.add(job.jobName, job.jobData, {
          jobId: job.jobId,
          delay,
          attempts: Math.max(1, job.maxAttempts - job.attempts), // Remaining attempts
          priority: job.priority,
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for inspection
        });

        // Mark as promoted in MongoDB
        await job.markPromoted();
        promoted++;

        logger.debug(
          `Promoted job ${job.jobId} (${job.jobName}) to Redis with delay ${delay}ms`
        );
      } catch (error) {
        // If Redis is down or job add fails
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("Connection is closed") ||
          error.message.includes("Connection lost")
        ) {
          logger.warn(
            `Could not promote job ${job.jobId} - Redis unavailable: ${error.message}`
          );
          // Don't mark as failed, let it retry next time
          failed++;
        } else if (/already exists/i.test(error.message)) {
          // Job already in Redis (race condition or duplicate)
          logger.debug(
            `Job ${job.jobId} already in Redis, marking as promoted`
          );
          await job.markPromoted();
          promoted++;
        } else {
          // Other errors
          logger.error(`Failed to promote job ${job.jobId}: ${error.message}`);
          await job.markFailed(error.message);
          failed++;
        }
      }
    }

    logger.info(
      `Job promotion complete: ${promoted} promoted, ${failed} failed`
    );
  } catch (error) {
    logger.error(`Job promoter error: ${error.message}`);
  } finally {
    isPromoting = false;
  }

  return { promoted, failed };
}

/**
 * Start the job promoter cron job
 * Runs every minute by default
 */
function startJobPromoter(redisQueue, cronSchedule = "*/1 * * * *") {
  if (promoterTask) {
    logger.warn("Job promoter already running");
    return;
  }

  logger.info(`Starting job promoter with schedule: ${cronSchedule}`);

  promoterTask = cron.schedule(cronSchedule, async () => {
    try {
      await promoteJobs(redisQueue);
    } catch (error) {
      logger.error(`Job promoter cron error: ${error.message}`);
    }
  });

  // Also run immediately on startup to catch any missed jobs
  setTimeout(() => {
    promoteJobs(redisQueue).catch((error) => {
      logger.error(`Initial job promotion error: ${error.message}`);
    });
  }, 5000); // Wait 5 seconds for systems to initialize
}

/**
 * Stop the job promoter
 */
function stopJobPromoter() {
  if (promoterTask) {
    promoterTask.stop();
    promoterTask = null;
    logger.info("Job promoter stopped");
  }
}

/**
 * Manual promotion trigger (for testing or admin actions)
 */
async function triggerPromotion(redisQueue) {
  logger.info("Manual job promotion triggered");
  return promoteJobs(redisQueue);
}

/**
 * Get promoter status
 */
function getPromoterStatus() {
  return {
    running: promoterTask !== null,
    currentlyPromoting: isPromoting,
  };
}

module.exports = {
  startJobPromoter,
  stopJobPromoter,
  promoteJobs,
  triggerPromotion,
  getPromoterStatus,
};
