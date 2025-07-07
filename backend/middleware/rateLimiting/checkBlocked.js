const { redisClient } = require("../../utils/redisClient");
const logger = require("../../logs/logger");

// Allowed webhooks / admin paths skip the block check
const allowedEndpoints = ["/bookings/calendly", "/payments/safepay"];

const checkBlocked = async (req, res, next) => {
  const isRedisReady = redisClient && redisClient.status === "ready";

  if (
    !isRedisReady ||
    req.path.startsWith("/admin") ||
    allowedEndpoints.includes(req.path)
  ) {
    return next();
  }

  try {
    const key = `blocked:${req.ip}`;
    const isBlocked = await redisClient.get(key);

    if (isBlocked) {
      const ttl = await redisClient.ttl(key); // seconds remaining
      logger.debug(`The IP: ${req.ip} is blocked for ${ttl}s`);

      return res.status(429).json({
        message: "You are currently blocked. Please try again later.",
        timeLeft: ttl,
      });
    }
  } catch (error) {
    logger.error(`[CHECK BLOCKED] Error accessing Redis: ${error.message}`);
  }

  next();
};

module.exports = checkBlocked;
