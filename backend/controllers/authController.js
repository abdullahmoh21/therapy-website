const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const handleLogin = async (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });
    const foundUser = await User.findOne({ username: user });
    if (!foundUser) return res.sendStatus(401); //Unauthorized 
    console.log(`User found: ${foundUser}`);
    // evaluate password 
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
        const role = foundUser.role;
        // create JWTs
        const accessToken = jwt.sign(
            { 
                userInfo: {
                    "username": foundUser.username,
                    "role": foundUser.role
                } 
            },
             process.env.ACCESS_TOKEN_SECRET, 
             { expiresIn: '600s' }
        );
        const refreshToken = jwt.sign(
            { "username": foundUser.username },
             process.env.REFRESH_TOKEN_SECRET, 
             { expiresIn: '8h' }
        );

        //saving Refresh token in DB
        foundUser.refreshTokenHash = await bcrypt.hash(refreshToken,10);
        foundUser.refreshTokenExp = Date.now() + 8*60*60*1000;  //8 hours
        const result = await foundUser.save();
        console.log(result);

        //http only cookie cannot be accessed by JS
        res.cookie('jwt', refreshToken, { httpOnly: true ,sameSite: 'None', secure: true, maxAge:24*60*60*1000});
        res.json({accessToken});
        console.log(role);
    } else {
        res.sendStatus(401);
    }
}

module.exports = { handleLogin };