//CRUD operations for admin
const User = require('../models/User');

const getAllUsers = async (req, res) => {
    const users = await User.find();
    if (!users) return res.status(204).json({ 'message': 'No users found' });
    res.json(users);
}
const updateUser = async (req, res) => {
    if (!req?.body?.username) {
        return res.status(400).json({ 'message': 'Username required' });
    }
    const user = await User.findOne({ username: req.body.username }).exec();
    if (!user) {
        return res.status(204).json({ "message": `No employee matches ID ${req.body.username}.` });
    }
    if (req.body?.firstname) user.firstname = req.body.firstname;
    if (req.body?.lastname) user.lastname = req.body.lastname;
    const result = await User.save();
    res.json(result);
}
const deleteUser = async (req, res) => {
    if (!req?.body?.username) return res.status(400).json({ "message": 'User ID required' });
    const user = await User.findOne({ username: req.body.username }).exec();
    if (!user) {
        return res.status(204).json({ 'message': `Username ${req.body.username} not found` });
    }
    const result = await user.deleteOne({ username: req.body.username });
    res.json(result);
}
const getUser = async (req, res) => {
    if (!req?.params?.username) {return res.status(400).json({ "message": 'Username required' });}
    const user = await User.findOne({ username: req.params.username }).exec();
    if (!user) {
        return res.status(204).json({ 'message': `Username ${req.params.username} not found` });
    }
    res.json(user);
}

module.exports = {
    getAllUsers,
    deleteUser,
    getUser,
    updateUser
}