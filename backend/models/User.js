const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
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
        phone:{
            type: Number,
        },
        DOB: {
            type: Date,
        },
        refreshTokenHash: {
            type: String,
        },
        refreshTokenExp: {
            type: Date,
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);