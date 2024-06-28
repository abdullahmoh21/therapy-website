const logger = require('../logs/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now(); // Capture the start time of the request

    // Function to log the completed request
    const logCompletedRequest = () => {
        const duration = Date.now() - start;
        const { method } = req;
        const url = req.originalUrl; // Use originalUrl to get the full path
        const origin = req.headers.origin || 'unknown-origin'; 
        const statusCode = res.statusCode ? res.statusCode : 500; 

        // Check conditions to filter out unwanted logs
        if ((origin !== 'unknown-origin' && url !== "/") && method !== "OPTIONS") {
            logger.http(`${method} ${origin} ${url} ${statusCode} ${duration}`);
        }
    };

    // Attach the logCompletedRequest function to the finish event of the response
    res.on('finish', logCompletedRequest);

    next();
};

module.exports = requestLogger;