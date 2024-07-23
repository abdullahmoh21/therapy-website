const redisClient = require('../../utils/redisClient');

// Custom middleware to check if an IP is blocked
const checkBlocked = async (req, res, next) => {
    
    // the following webhook endpoints are allowed to bypass the block check
    const allowedEndpoints = [
        '/bookings/calendly',
        '/payments/safepay'
    ];

    // Check if the request path is one of the allowed endpoints
    if (allowedEndpoints.includes(req.path) || redisClient.status !== 'ready') {
        return next(); // Skip the block check and continue to the next middleware
    }

    const isBlocked = await redisClient.get(`blocked:${req.ip}`);
    if (isBlocked) {
        return res.status(429).json({ 'message': 'You are currently blocked. Please try again later.3' });
    }
    next();
};

module.exports = checkBlocked;