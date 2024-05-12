const mongoose = require('mongoose');
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
                hash:{
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
        name: {
            type: String,
            required: true,
        },
        phone:{
            type: Number,
        },
        DOB: {
            type: Date,
        },
        dateJoined: {
            type: Date,
            default: Date.now,
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
        resetPasswordExp: {
            type: Date,
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', userSchema);