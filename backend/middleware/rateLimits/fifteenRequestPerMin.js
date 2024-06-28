const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../../utils/redisClient');
const logger = require('../../logs/logger');


const rateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 15, // 15 requests per window
    message: 'Too many requests from this IP, please try again after a 5 minute pause',
    handler: async (req, res) => {
        logger.error(`[RATE LIMIT] Too Many Requests: ${req.ip}\t${req.method}\t${req.url}\t${req.headers.origin}`);
        await redisClient.set(`blocked:${req.ip}`, true, 'EX', 60 * 5); // Set a separate key to block the IP for 5 minutes
        res.status(429).json({ 'message': 'Too many requests from this IP, please try again after a 5 minute pause' });
    },
    store: new RedisStore({
        sendCommand: async (...args) => redisClient.call(...args),
        prefix: '15min-rate-limit',
        expiry: 60 * 1000, // 60 seconds
    }),
});

// Webhook endpoints that should bypass the rate limit
const allowedEndpoints = [
    '/bookings/calendly',
    '/payments/safepay'
];

// Middleware to apply rate limiting conditionally
const conditionalRateLimiter = (req, res, next) => {
    if (allowedEndpoints.includes(req.path)) {
        return next(); // Bypass rate limiting for whitelisted endpoints
    }
    return rateLimiter(req, res, next); // Apply rate limiting for all other endpoints
};

module.exports = conditionalRateLimiter;