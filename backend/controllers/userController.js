//CRUD operations for user
const User = require('../models/User');

const getMyData= async (req, res) => {
    const{ username } = req; //from verifyJWT
    const user = await User.findOne({ "username": username });
    if (!user) return res.status(204).json({ 'message': 'No users found' });
    res.json(user);
}
const updateMyData = async (req, res) => {
    const { username } = req;
    const newData = req.body;

    try {
        const updatedUser = await User.findOneAndUpdate(
            { username: username }, // find a document with this username
            newData, // data to update
            { new: true, runValidators: true } // options: return updated one, run all schema validators again
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json(updatedUser);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

module.exports = {
    updateMyData,
    getMyData,
}