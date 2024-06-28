// Import your Winston logger instance
const logger = require('../logs/logger');

const errorHandler = (err, req, res, next) => {
    // Use Winston to log the error
    logger.error(`${err.name}: ${err.message}`, { stack: err.stack });

    if (res.headersSent) {
        return next(err);
    }

    const status = err.statusCode || 500; // Assuming err can have a statusCode property

    res.status(status);
    res.json({ message: err.message, isError: true });
}

module.exports = errorHandler;