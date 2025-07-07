const { Queue } = require("bullmq");
const logger = require("../../logs/logger");
const { checkRedisAvailability } = require("../redisClient");
const { getJobUniqueId } = require("./utils");
const { buildWorker } = require("./worker");
const jobHandlers = require("./jobs/index");

let queue = null;
let worker = null;

async function initializeQueue() {
  const redisAvailable = await checkRedisAvailability();
  if (!redisAvailable) return false;

  try {
    const connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: false,
      retryDelayOnFailover: 100,
    };

    queue = new Queue("myQueue", {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: true,
        attempts: 5,
      },
    });

    worker = await buildWorker("myQueue");
    logger.info("BullMQ queue system initialized successfully");
    return true;
  } catch (error) {
    logger.error(`Queue Initialization error: ${error.message}`);
    return false;
  }
}

async function addJob(jobName, jobData) {
  if (!queue) {
    throw new Error("Queue not initialized");
  }

  try {
    const jobId = getJobUniqueId(jobName, jobData);
    return await queue.add(jobName, jobData, {
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 5, // This ensures 5 retries for job execution failures
    });
  } catch (error) {
    if (/already exists/i.test(error.message)) {
      logger.info(`Skipping duplicate job: ${jobName}`);
      return { success: true, skipped: true, reason: "duplicate" };
    }
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("Connection is closed") ||
      error.message.includes("Connection lost") ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND"
    ) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
    throw error;
  }
}

const sendEmail = async (jobName, jobData) => {
  if (!queue) {
    logger.warn(`Queue unavailable — executing ${jobName} directly`);
    return fallbackExecute(jobName, jobData);
  }

  try {
    return await addJob(jobName, jobData);
  } catch (error) {
    if (error.message.includes("Redis connection failed")) {
      logger.warn(
        `Queue unavailable (Redis connection failed) — executing ${jobName} directly`
      );
      return fallbackExecute(jobName, jobData);
    }

    // For other errors, still fallback but log differently
    logger.warn(
      `Queue add failed — executing ${jobName} inline: ${error.message}`
    );
    return fallbackExecute(jobName, jobData);
  }
};

const fallbackExecute = function (jobName, jobData) {
  const handler = jobHandlers[jobName];
  if (!handler) {
    throw new Error(`Unknown job type: ${jobName}`);
  }
  return handler({ data: jobData });
};

module.exports = { initializeQueue, addJob, sendEmail };
