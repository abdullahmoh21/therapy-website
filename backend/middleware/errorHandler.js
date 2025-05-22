const logger = require("../logs/logger");
const { spawn } = require("child_process");

const errorHandler = (err, req, res, next) => {
  // Use Winston to log the error
  logger.info("Error handler triggered");
  logger.error(`${err.name}: ${err.message}\n${err.stack}`);
  if (res.headersSent) {
    return next(err);
  }

  res.status(500);
  res.json({ message: err.message, isError: true });
};

// production: uncomment

process.on("uncaughtException", function (err) {
  logger.error(`[UNHANDLED EXCEPTION] ${err.name}: ${err.message}`, {
    stack: err.stack,
  });
});

process.on("unhandledRejection", (reason, promise) => {
  if (reason instanceof Error) {
    logger.error(`[UNHANDLED PROMISE] ${reason.name}: ${reason.message}`, {
      stack: reason.stack,
    });
  } else {
    logger.error(`[UNHANDLED PROMISE] ${reason}`);
  }
});

module.exports = errorHandler;
