const winston = require("winston");
const path = require("path");

// Define custom logging levels including 'http'
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    success: 4,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "magenta",
    debug: "blue",
    success: "green",
  },
};

// Custom format for console output
const consoleFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Custom format for HTTP requests
const httpLogFormat = winston.format.printf(({ level, message, timestamp }) => {
  if (level === "http") {
    const [method, origin, url, statusCode, responseTime] = message.split(" ");
    // Padding the method to 7 characters wide, and origin to the length of the longest origin
    const methodPadded = method.padEnd(7, " ");
    const originPadded = origin.padEnd(30, " "); // Adjust based on your longest origin
    const urlPadded = url.padEnd(25, " "); // Adjust based on your longest URL path
    const statusCodePadded = statusCode.padEnd(3, " ");
    const responseTimeWithMs = `${responseTime}ms`.padEnd(8, " "); // Assuming 'XXXXms' as the longest response time format
    return `${timestamp}\t${methodPadded}\t${originPadded}\t${urlPadded}\t${statusCodePadded}\t${responseTimeWithMs}`;
  }
  return `${timestamp} [${level}]: ${message}`;
});

const httpOnlyFilter = winston.format((info, opts) => {
  return info.level === "http" ? info : false;
});

// Add colors to console output
winston.addColors(customLevels.colors);

// Create the base logger with all functionality
const baseLogger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  transports: [
    // Console transport with readable format
    new winston.transports.Console({
      level: "success",
      format: winston.format.combine(winston.format.colorize(), consoleFormat),
    }),
    // Error log file transport with JSON format
    new winston.transports.File({
      filename: "logs/errors.log",
      level: "error",
      format: winston.format.json(),
    }),
  ],
});

// Create a production logger that only processes error logs
const createProductionLogger = (logger) => {
  const productionLogger = {};

  // Copy all properties and methods from the original logger
  Object.getOwnPropertyNames(Object.getPrototypeOf(logger)).forEach(
    (method) => {
      if (typeof logger[method] === "function") {
        productionLogger[method] = logger[method].bind(logger);
      }
    }
  );

  // Override all log level methods except error
  Object.keys(customLevels.levels).forEach((level) => {
    if (level !== "error") {
      productionLogger[level] = () => {}; // No-op function for non-error logs
    }
  });

  return productionLogger;
};

// Determine which logger to use based on environment
const logger =
  process.env.NODE_ENV === "production"
    ? createProductionLogger(baseLogger)
    : baseLogger;

module.exports = logger;
