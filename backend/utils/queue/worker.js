const { Worker } = require("bullmq");
const { getRedisConnection } = require("./connection");
const logger = require("../../logs/logger");
const Config = require("../../models/Config");
const { transporter } = require("../emailTransporter");
const jobHandlers = require("./jobs/index");

async function buildWorker(queueName) {
  const connection = await getRedisConnection();

  const worker = new Worker(
    queueName,
    async (job) => {
      const handler = jobHandlers[job.name];
      if (!handler) {
        logger.error(`Unknown job name: ${job.name}`);
        return { success: false, error: "Unknown job type" };
      }
      return handler(job);
    },
    { connection }
  );

  worker.on("failed", async (job, err) => {
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
