const jwt = require('jsonwebtoken');

/**
 * Retrieves the role from the authorization token and sends it as a JSON response.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the role is sent as a JSON response.
 */
const getRole = async (req, res) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if(!authHeader?.startsWith('Bearer ')) return res.sendStatus(401); //unauthorized
    const token = authHeader.split(' ')[1]; //take out jwt

    jwt.verify(
        token, 
        process.env.ACCESS_TOKEN_SECRET, 
        (err, decoded) => {
            if(err) return res.sendStatus(403); //forbidden
            res.json({role: decoded.userInfo.role});
        }
    );
}

module.exports = { getRole };