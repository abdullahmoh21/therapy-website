const jwt = require('jsonwebtoken');


const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if(!authHeader?.startsWith('Bearer ')) return res.sendStatus(401); //unauthorized

    const token = authHeader.split(' ')[1]; //take out jwt
    jwt.verify(
        token, 
        process.env.ACCESS_TOKEN_SECRET, 
        (err, decoded) => {
        if(err) return res.sendStatus(403); //forbidden
        //so other middleware can use this info
        req.username = decoded.userInfo.username;
        req.role = decoded.userInfo.role
        console.log(`The username ${req.username} has been added to the request object`)
        next();
    });
}

module.exports = verifyJWT;