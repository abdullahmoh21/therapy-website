const { Queue } = require("bullmq");
const logger = require("../../logs/logger");
const { checkRedisQueueAvailability } = require("../redisClient");
const { buildWorker } = require("./worker");
const jobHandlers = require("./jobs/index");
const { startJobPromoter, stopJobPromoter } = require("./promoter");
const { addJob, sendEmail, setQueueInstance } = require("./jobScheduler");

let queue = null;
let worker = null;
let promoterStarted = false;

async function initializeQueue() {
  const redisAvailable = await checkRedisQueueAvailability();
  if (!redisAvailable) {
    logger.warn(
      "Redis Queue unavailable - jobs will be persisted to MongoDB only"
    );
    return false;
  }

  try {
    const connection = {
      host:
        process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || "localhost",
      port:
        process.env.REDIS_QUEUE_PORT ||
        (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) + 1 : 6380),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: false,
      retryDelayOnFailover: 100,
    };

    queue = new Queue("myQueue", {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 1800, count: 500 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
        attempts: 3,
      },
    });

    worker = await buildWorker("myQueue");
    logger.info("BullMQ queue system initialized successfully");

    // Set the queue instance in jobScheduler so job handlers can use it
    setQueueInstance(queue);

    // Start the job promoter to move jobs from MongoDB to Redis
    if (!promoterStarted && queue) {
      startJobPromoter(queue);
      promoterStarted = true;
    }

    return true;
  } catch (error) {
    logger.error(`Queue Initialization error: ${error.message}`);
    return false;
  }
}

/**
 * Fallback execute - run job handler directly (used when queue unavailable)
 */
const fallbackExecute = function (jobName, jobData) {
  const handler = jobHandlers[jobName];
  if (!handler) {
    throw new Error(`Unknown job type: ${jobName}`);
  }
  return handler({ data: jobData });
};

/**
 * Graceful shutdown
 */
async function shutdownQueue() {
  logger.info("Shutting down queue system...");

  if (promoterStarted) {
    stopJobPromoter();
    promoterStarted = false;
  }

  if (worker) {
    await worker.close();
    logger.info("Worker closed");
  }

  if (queue) {
    await queue.close();
    logger.info("Queue closed");
  }
}

module.exports = { initializeQueue, addJob, sendEmail, shutdownQueue, queue };
