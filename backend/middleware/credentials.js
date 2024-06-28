const allowedOrigins = require('../config/allowedOrigins');

const credentials = (req,res,next) => {
    const origin = req.headers.origin;
    if(allowedOrigins.includes(origin) !== -1){
        res.header('Access-Control-Allow-Origin', origin);
    }
    next();
}

module.exports = credentials;