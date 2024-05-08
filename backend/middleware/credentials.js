const allowedOrigins = require('../config/allowedOrigins');

/**
 * If origin is allowed then set the header on the response to allow the request
 * Middleware to handle credentials.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
*/
const credentials = (req,res,next) => {
    const origin = req.headers.origin;
    if(allowedOrigins.includes(origin) !== -1){
        res.header('Access-Control-Allow-Origin', origin);
    }
    next();
}

module.exports = credentials;