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

const warnOnlyFilter = winston.format((info) => {
  return info.level === "warn" ? info : false;
});

// Add colors to console output
winston.addColors(customLevels.colors);

/* ---------- Transport configuration ---------- */
const transports = [
  new winston.transports.Console({
    level: "success",
    format: winston.format.combine(winston.format.colorize(), consoleFormat),
  }),
];

if (process.env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/errors.log"),
      level: "error",
      format: winston.format.json(),
    })
  );
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/warnings.log"),
      level: "warn",
      format: winston.format.combine(warnOnlyFilter(), winston.format.json()),
    })
  );
}

/* ---------- Base logger ---------- */
const baseLogger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  transports,
});

/* ---------- Production wrapper ---------- */
const createProductionLogger = (logger) => {
  const productionLogger = {};

  // Forward all methods
  Object.getOwnPropertyNames(Object.getPrototypeOf(logger)).forEach(
    (method) => {
      if (typeof logger[method] === "function") {
        productionLogger[method] = logger[method].bind(logger);
      }
    }
  );

  // No-op for levels other than error & warn
  Object.keys(customLevels.levels).forEach((level) => {
    if (level !== "error" && level !== "warn") {
      productionLogger[level] = () => {};
    }
  });

  return productionLogger;
};

/* ---------- Export the correct logger ---------- */
const logger =
  process.env.NODE_ENV === "production"
    ? createProductionLogger(baseLogger)
    : baseLogger;

module.exports = logger;
