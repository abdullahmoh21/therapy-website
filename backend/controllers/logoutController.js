const User = require('../models/User');

const handleLogout = async (req, res) => {
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
    foundUser.refreshToken = '';
    const result = await foundUser.save();
    console.log(result);

    res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true}); //ADD secure: true in production
    res.sendStatus(204); //no content
}

module.exports = { handleLogout }