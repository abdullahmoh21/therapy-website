const { isMongoAvailable } = require("../utils/connectDB");
const { isCalendlyAvailable } = require("../utils/connectCalendly");
const logger = require("../logs/logger");

/**
 * Middleware to check if required dependencies are available
 * Sends a 503 Service Unavailable response if dependencies are down
 */
const dependencyGuard = (req, res, next) => {
  // Skip checks for health endpoint and webhook endpoints
  if (
    req.path === "/admin/system-health" ||
    req.path === "/bookings/calendly" ||
    req.path === "/payments/safepay"
  ) {
    return next();
  }

  // Check for MongoDB availability
  if (!isMongoAvailable()) {
    logger.warn(
      `Request to ${req.path} blocked due to MongoDB being unavailable`
    );
    return res.status(503).json({
      status: "error",
      message: "Service temporarily unavailable. Database connectivity issues.",
    });
  }

  if (!isCalendlyAvailable() && process.env.NODE_ENV == "production") {
    logger.warn(
      `Request to ${req.path} blocked due to Calendly being unavailable`
    );
    return res.status(503).json({
      status: "error",
      message:
        "Service temporarily unavailable. Calendar service connectivity issues.",
    });
  }

  next();
};

module.exports = dependencyGuard;
