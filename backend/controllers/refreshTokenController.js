const User = require('../models/User');
const jwt = require('jsonwebtoken');


const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;

    if(!cookies?.jwt) return res.sendStatus(401)
    const refreshToken = cookies.jwt;

    const foundUser = await User.findOne({ refreshToken: refreshToken }).exec();
    if (!foundUser) return res.sendStatus(403); //Forbidden 
    // evaluate password 
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err,decoded) => {
            const role = Object.values(foundUser.role);
            if(err || foundUser.username !== decoded.username) return res.sendStatus(403);
            const accessToken = jwt.sign(
            { 
                userInfo: {
                    "username": decoded.username,
                    "role": role
                } 
            },
             process.env.ACCESS_TOKEN_SECRET, 
             { expiresIn: '600s' }
            );
            res.json({accessToken});
        }
    );
    
}

module.exports = { handleRefreshToken }