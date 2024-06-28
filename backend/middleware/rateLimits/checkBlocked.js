const redisClient = require('../../utils/redisClient');

// Custom middleware to check if an IP is blocked
const checkBlocked = async (req, res, next) => {
    
    // the following webhook endpoints are allowed to bypass the block check
    const allowedEndpoints = [
        '/booking/calendly',
        '/payments/safepay'
    ];

    // Check if the request path is one of the allowed endpoints
    if (allowedEndpoints.includes(req.path)) {
        return next(); // Skip the block check and continue to the next middleware
    }

    const isBlocked = await redisClient.get(`blocked:${req.ip}`);
    if (isBlocked) {
        return res.status(429).send('This IP is blocked. Please try again later.');
    }
    next();
};

module.exports = checkBlocked;