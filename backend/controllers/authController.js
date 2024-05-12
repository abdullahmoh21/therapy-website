const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc Login
// @route POST /auth
// @access Public
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ 'message': 'Username and password are required.' });
    const foundUser = await User.findOne({ email: email });
    if (!foundUser) return res.sendStatus(401); //Unauthorized 

    //TODO: Validation check sending number as pwd crashes server

    // evaluate password 
    const match = await bcrypt.compare(password, foundUser.password);
    if (match) {
        const role = foundUser.role;
        // create JWTs
        const accessToken = jwt.sign(
            { 
                userInfo: {
                    "email": foundUser.email,
                    "role": foundUser.role
                } 
            },
             process.env.ACCESS_TOKEN_SECRET, 
             { expiresIn: '600s' }
        );
        const refreshToken = jwt.sign(
            { "email": foundUser.email },
             process.env.REFRESH_TOKEN_SECRET, 
             { expiresIn: '8h' }
        );

        //saving Refresh token in DB
        foundUser.refreshTokenHash = await bcrypt.hash(refreshToken,10);
        foundUser.refreshTokenExp = Date.now() + 8*60*60*1000;  //8 hours
        const result = await foundUser.save();

        //http only cookie cannot be accessed by JS
        res.cookie('jwt', refreshToken, { httpOnly: true ,sameSite: 'None', secure: true, maxAge:24*60*60*1000});
        res.json({accessToken});
        console.log(`role from authController: ${role}`);
    } else {
        res.sendStatus(401);
    }
}

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = async (req, res) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    // Decode the refresh token
    const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const { email } = decodedRefreshToken;
    if (!email) return res.sendStatus(403); // Forbidden

    const foundUser = await User.findOne({ email }).exec();
    if (!foundUser) return res.sendStatus(403); // Forbidden 

    // Compare the refresh token with the hashed version stored in the database
    const isMatch = await bcrypt.compare(refreshToken, foundUser.refreshTokenHash);
    if (!isMatch) return res.sendStatus(403); // Forbidden

    // generate new access token
    const accessToken = jwt.sign(
        { 
            userInfo: {
                "email": foundUser.email,
                "role": foundUser.role
            } 
        },
         process.env.ACCESS_TOKEN_SECRET, 
         { expiresIn: '600s' }
    );
    res.json({ accessToken });
}

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = async (req, res) => {
    //delete Access Token on client side

    const cookies = req.cookies;
    if(!cookies?.jwt) return res.sendStatus(204) //no content

    const refreshToken = cookies.jwt;

    // is refresh token in db?
    const foundUser = await User.findOne({ refreshToken: refreshToken }).exec();
    if (!foundUser) {
        res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true});
        return res.sendStatus(204); //no content
    }

    //delete refresh token on server side
    foundUser.refreshTokenHash = '';
    const result = await foundUser.save();
    console.log(result);

    res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true}); //ADD secure: true in production
    res.sendStatus(204); //no content
}

module.exports = { 
    login,
    refresh,
    logout
};