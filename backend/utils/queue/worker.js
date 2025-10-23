const { Worker } = require("bullmq");
const { getRedisConnection } = require("./connection");
const logger = require("../../logs/logger");
const Config = require("../../models/Config");
const Job = require("../../models/Job");
const { transporter } = require("../emailTransporter");
const jobHandlers = require("./jobs/index");

async function buildWorker(queueName) {
  const connection = await getRedisConnection();

  const worker = new Worker(
    queueName,
    async (job) => {
      const { name, data } = job;
      logger.info(`Processing job ${name} (${job.id})`);

      // Make sure handler exists
      if (!jobHandlers[name]) {
        throw new Error(`Unknown job type: ${name}`);
      }

      try {
        // Call appropriate handler based on job name
        const result = await jobHandlers[name]({ data });
        logger.info(`Completed job ${name} (${job.id})`);

        // Mark as completed in MongoDB
        try {
          const mongoJob = await Job.findOne({ jobId: job.id });
          if (mongoJob && mongoJob.status === "promoted") {
            await mongoJob.markCompleted(result);
          }
        } catch (mongoError) {
          logger.error(
            `Failed to update MongoDB job status: ${mongoError.message}`
          );
          // Don't fail the Redis job just because MongoDB update failed
        }

        return result;
      } catch (error) {
        logger.error(
          `Error processing job ${name} (${job.id}): ${error.message}`
        );

        // Mark as failed in MongoDB
        try {
          const mongoJob = await Job.findOne({ jobId: job.id });
          if (mongoJob) {
            await mongoJob.markFailed(error.message);
          }
        } catch (mongoError) {
          logger.error(
            `Failed to update MongoDB job failure: ${mongoError.message}`
          );
        }

        throw error;
      }
    },
    {
      connection: {
        host:
          process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || "localhost",
        port:
          process.env.REDIS_QUEUE_PORT ||
          (process.env.REDIS_PORT
            ? parseInt(process.env.REDIS_PORT) + 1
            : 6380),
      },
      concurrency: 5, // Process 5 jobs at a time
      lockDuration: 30000, // 30 seconds lock
    }
  );

  // Set up event handlers
  worker.on("completed", (job) => {
    logger.debug(`Job ${job.id} completed successfully`);
  });

  worker.on("failed", async (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
    if (job.attemptsMade === job.opts.attempts) {
      const devEmail = await Config.getValue("devEmail");
      if (!devEmail) {
        logger.error(
          "Admin email not found in config. Could not send job failure emails"
        );
        return;
      }
      const mailOptions = {
        from: "server@fatimanaqvi.com",
        to: devEmail,
        subject: "Job Failure Notification",
        html: `
          <h1>Job Failure Alert</h1>
          <p>Job ID: ${job.id}</p>
          <p>Job Name: ${job.name}</p>
          <p>Recipient: ${job.data.recipient}</p>
          <p>Error Message: ${err.message}</p>
          <pre>${JSON.stringify(job.data, null, 2)}</pre>`,
      };
      try {
        await transporter.sendMail(mailOptions);
        logger.info(`Error log sent to admin for job ${job.id}`);
      } catch (e) {
        logger.error(`Could not notify admin: ${e.message}`);
      }
    }
  });

  return worker;
}

module.exports = { buildWorker };
