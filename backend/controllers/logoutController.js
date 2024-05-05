const usersDB = {
    users: require('../model/users.json'),
    setUsers: function (data) { this.users = data }
}
const fsPromises = require('fs').promises;
const path = require('path');

const handleLogout = async (req, res) => {
    //delete Access Token on client side

    const cookies = req.cookies;
    if(!cookies?.jwt) return res.sendStatus(204) //no content

    const refreshToken = cookies.jwt;

    const foundUser = usersDB.users.find(person => person.refreshToken === refreshToken);
    if (!foundUser) {
        res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true});
        return res.sendStatus(204); //no content
    }

    //delete refresh token on server side
    const otherUsers = usersDB.users.filter(person => person.refreshToken !== refreshToken);
    const currentUsers = {...foundUser, refreshToken: ''};
    usersDB.setUsers([...otherUsers, currentUsers]);
    await fsPromises.writeFile(path.join(__dirname, '../model/users.json'), JSON.stringify(usersDB.users));

    res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true}); //ADD secure: true in production
    res.sendStatus(204); //no content
}

module.exports = { handleLogout }