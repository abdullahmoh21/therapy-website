const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redisClient } = require("../../utils/redisClient");
const logger = require("../../logs/logger");

/* ------------------------------------------------------------------ */
/*                       factory: redis + memory                      */
/* ------------------------------------------------------------------ */
const WINDOW_MS = 60_000; // 1 minute

// Store limiters globally so we can rebuild them when Redis connects
let limiters = {};

const createLimiter = (max, prefix) => {
  const redisReady = redisClient && redisClient.status === "ready";

  const store = redisReady
    ? new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix,
        expiry: WINDOW_MS / 1000,
      })
    : new rateLimit.MemoryStore();

  return rateLimit({
    windowMs: WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,

    handler: async (req, res) => {
      logger.warn(`[RATE LIMIT] ${req.ip} hit ${prefix} – blocking 5 min`);

      if (redisReady)
        await redisClient.set(`blocked:${req.ip}`, "1", "EX", 300);

      res.set("Retry-After", "300");
      if (req.method === "OPTIONS") return res.status(204).end();
      return res.status(429).json({
        message:
          "Too many requests from this IP, please try again after a 5 minute pause",
      });
    },

    onRequest: (req, res, options) => {
      store
        .increment(req)
        .then((current) => {
          logger.debug(
            `[RATE DEBUG] ${req.ip} at ${prefix}: ${
              current.totalHits
            }/${max} requests (${Math.round(
              (WINDOW_MS - (Date.now() - current.resetTime)) / 1000
            )}s remaining)`
          );
        })
        .catch((err) => {
          logger.error(
            `[RATE DEBUG] Error counting requests for ${req.ip}: ${err.message}`
          );
        });
    },

    store,
  });
};

/* ------------------------------------------------------------------ */
/*                    Redis connection handling                       */
/* ------------------------------------------------------------------ */
// Function to rebuild all limiters when Redis becomes available
const rebuildLimitersWithRedis = () => {
  if (!redisClient || redisClient.status !== "ready") return;

  logger.info("Rate Limiters initiated with redis");

  // Rebuild all limiters with Redis store
  limiters = {
    authLogin: createLimiter(10, "rl:auth:login:"),
    authRefresh: createLimiter(60, "rl:auth:refresh:"),
    authOther: createLimiter(20, "rl:auth:other:"),
    user: createLimiter(50, "rl:user:"),
    bookings: createLimiter(50, "rl:bookings:"),
    payments: createLimiter(50, "rl:payments:"),
    contactMe: createLimiter(20, "rl:contactme:"),
    config: createLimiter(60, "rl:config:"),
    general: createLimiter(40, "rl:general:"),
  };

  // Recreate rules with new limiters
  rules = [
    { regex: /^\/api\/auth\/refresh$/, limiter: limiters.authRefresh },
    { regex: /^\/api\/auth\/(logout|register)$/, limiter: limiters.authOther },
    { regex: /^\/api\/auth$/, limiter: limiters.authLogin },

    { regex: /^\/api\/user/, limiter: limiters.user },
    { regex: /^\/api\/bookings/, limiter: limiters.bookings },
    { regex: /^\/api\/payments/, limiter: limiters.payments },
    { regex: /^\/api\/contactMe/, limiter: limiters.contactMe },
    { regex: /^\/api\/config/, limiter: limiters.config },
  ];
};

// Set up Redis connection listeners (if Redis client exists)
if (redisClient) {
  // Listen for connect/ready event to switch to Redis store
  redisClient.on("ready", () => {
    rebuildLimitersWithRedis();
  });

  // Handle potential Redis disconnections
  redisClient.on("error", (err) => {
    logger.warn(
      `[RATE LIMIT] Redis error: ${err.message} - rate limiting will use MemoryStore`
    );
  });
}

/* ------------------------------------------------------------------ */
/*                         limiter instances                          */
/* ------------------------------------------------------------------ */
// Initialize limiters (will use MemoryStore if Redis not ready)
limiters = {
  authLogin: createLimiter(10, "rl:auth:login:"),
  authRefresh: createLimiter(60, "rl:auth:refresh:"),
  authOther: createLimiter(20, "rl:auth:other:"),
  user: createLimiter(50, "rl:user:"),
  bookings: createLimiter(50, "rl:bookings:"),
  payments: createLimiter(50, "rl:payments:"),
  contactMe: createLimiter(20, "rl:contactme:"),
  config: createLimiter(60, "rl:config:"),
  general: createLimiter(40, "rl:general:"),
};

/* ------------------------------------------------------------------ */
/*                          matching rules                            */
/* ------------------------------------------------------------------ */
/**
 * Ordered list: first regex that matches `req.path` wins.
 * Add new rules here (long-term scalable).
 */
let rules = [
  { regex: /^\/api\/auth\/refresh$/, limiter: limiters.authRefresh },
  { regex: /^\/api\/auth\/(logout|register)$/, limiter: limiters.authOther },
  { regex: /^\/api\/auth$/, limiter: limiters.authLogin },

  { regex: /^\/api\/user/, limiter: limiters.user },
  { regex: /^\/api\/bookings/, limiter: limiters.bookings },
  { regex: /^\/api\/payments/, limiter: limiters.payments },
  { regex: /^\/api\/contactMe/, limiter: limiters.contactMe },
  { regex: /^\/api\/config/, limiter: limiters.config },
];

/* Webhooks or admin paths that bypass all limits */
const allowlist = [
  /^\/api\/bookings\/calendly$/,
  /^\/api\/payments\/safepay$/,
  /^\/api\/admin/,
];

/* ------------------------------------------------------------------ */
/*                        dispatcher middleware                       */
/* ------------------------------------------------------------------ */
module.exports = function conditionalRateLimiter(req, res, next) {
  const path = req.path;

  // 1. Allowlisted?
  if (allowlist.some((re) => re.test(path))) {
    return next();
  }

  // 2. Find first rule whose regex matches
  const matched = rules.find((r) => r.regex.test(path));
  if (matched) {
    return matched.limiter(req, res, next);
  }

  return limiters.general(req, res, next);
};
