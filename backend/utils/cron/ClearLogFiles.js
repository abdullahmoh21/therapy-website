const cron = require("node-cron");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../../logs/logger");

function startClearLogFilesCron() {
  // Every Sunday at midnight
  cron.schedule("0 0 * * 0", async () => {
    const logsDir = path.join(__dirname, "../../logs");
    const errorLog = path.join(logsDir, "errors.log");
    const warnLog = path.join(logsDir, "warnings.log");

    try {
      await fs.truncate(errorLog, 0);
      await fs.truncate(warnLog, 0);
      logger.info("[CRON] Cleared errors.log and warnings.log");
    } catch (err) {
      logger.error("[CRON] Failed to clear log files:", err);
    }
  });

  logger.info("Log cleaner CRON job initialized.");
}

module.exports = startClearLogFilesCron;
