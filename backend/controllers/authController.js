const usersDB = {
    users: require('../model/users.json'),
    setUsers: function (data) { this.users = data }
}
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const fsPromises = require('fs').promises;  //since no DB as of yet
const path = require('path');


const handleLogin = async (req, res) => {
    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });
    const foundUser = usersDB.users.find(person => person.username === user);
    if (!foundUser) return res.sendStatus(401); //Unauthorized 
    // evaluate password 
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
        // create JWTs
        const accessToken = jwt.sign(
            { "username": foundUser.username },
             process.env.ACCESS_TOKEN_SECRET, 
             { expiresIn: '60s' }
        );
        const refreshToken = jwt.sign(
            { "username": foundUser.username },
             process.env.REFRESH_TOKEN_SECRET, 
             { expiresIn: '1d' }
        );

        //saving Refresh token in DB
        const otherUsers = usersDB.users.filter(person => person.username !== foundUser.username);
        const currentUsers = { ...foundUser, refreshToken };
        usersDB.setUsers([...otherUsers, currentUsers]);
        await fsPromises.writeFile(path.join(__dirname, '../model/users.json'), JSON.stringify(usersDB.users, null, 2));

        //http only cookie cannot be accessed by JS
        res.cookie('jwt', refreshToken, { httpOnly: true ,sameSite: 'None', secure: true, maxAge:24*60*60*1000});
        res.json({accessToken});
    } else {
        res.sendStatus(401);
    }
}

module.exports = { handleLogin };