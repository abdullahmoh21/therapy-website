const jwt = require('jsonwebtoken');
const Joi = require('joi');
const ROLES_LIST = require('../config/roles_list');
const logger = require('../logs/logger');

const schema = Joi.object({
    email: Joi.string().email().required(),
    role: Joi.number().valid(ROLES_LIST.Admin, ROLES_LIST.User).required(), // Ensure role is one of the numbers in ROLES_LIST
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required() // Ensure _id is a 24-character hexadecimal string
});

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if(!authHeader?.startsWith('Bearer ')) return res.sendStatus(401); //unauthorized

    const token = authHeader.split(' ')[1]; //take out jwt
    jwt.verify(
        token, 
        process.env.ACCESS_TOKEN_SECRET, 
        (err, decoded) => {
        if(err){
            return res.status(403).json({ message: 'Invalid JWT payload. Access Denied'});
        }
        const { error } = schema.validate(decoded.userInfo);
        if(error) {
            logger.error(`JWT payload validation error: ${error.message}`);
            return res.status(403).json({ message: 'Invalid JWT payload. Access Denied'});
        }
        //for role based access control
        req.email = decoded.userInfo.email;
        req.role = decoded.userInfo.role;   //for role based access control
        req.userId = decoded.userInfo.userId;  //for cache keys
        next();
    });
}

module.exports = verifyJWT;