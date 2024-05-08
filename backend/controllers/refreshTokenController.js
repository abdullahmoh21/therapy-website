const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    // Decode the refresh token
    let decodedRefreshToken;
    try {
        decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        return res.sendStatus(403); // Forbidden
    }

    const { username } = decodedRefreshToken;
    if (!username) return res.sendStatus(403); // Forbidden

    const foundUser = await User.findOne({ username }).exec();
    if (!foundUser) return res.sendStatus(403); // Forbidden 

    // Compare the refresh token with the hashed version stored in the database
    const isMatch = await bcrypt.compare(refreshToken, foundUser.refreshTokenHash);
    if (!isMatch) return res.sendStatus(403); // Forbidden

    // generate new access token
    const role = foundUser.role;
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
    res.json({ accessToken });
}
module.exports = { handleRefreshToken };