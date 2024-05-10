const mongoose = require('mongoose');
const { handleRefreshToken } = require('../controllers/refreshTokenController');
const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        emailVerified: {
            data:{
                state:{
                    type:Boolean,
                    default:false
                },
                handleRefreshTokenash:{
                    type:String,

                },
                expiresIn:{
                    type:Date,
                },
            }
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
        resetPasswordTokenHash: {
            type: String,
        },
        resetPasswordExpires: {
            type: Date,
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);