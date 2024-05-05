const allowedOrigins = require('../config/allowedOrigins');

//if origin is allowed then set the header on the response to allow the request
const credentials = (req,res,next) => {
    const origin = req.headers.origin;
    if(allowedOrigins.includes(origin) !== -1){
        res.header('Access-Control-Allow-Origin', origin);
    }
    next();
}

module.exports = credentials;