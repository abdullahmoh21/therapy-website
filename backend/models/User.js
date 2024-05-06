const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: Number,
        default: 1111,
    },
    dateJoined: {
        type: Date,
        default: Date.now,
    },
    DOB: {
        type: Date,
    },
    accessToken: {
        type: String,
    },
    refreshToken: {
        type: String,
    },
    refreshTokenExp: {
        type: Date,
    },
});

module.exports = mongoose.model('User', userSchema);