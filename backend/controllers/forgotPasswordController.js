require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');


// RESEND EMAIL API configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    secure: true,
    port: 465,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_EMAIL_SECRET,
    },
});

// Forgot password route
const handleForgottenPwd = async (req, res) => {
    const { username } = req.body;
    let user;
    try {
        user = await User.findOne({ username });
    } catch (err) {
        return res.status(500).send('Error finding user');
    }

    if (!user) {
        return res.status(400).send('No user found with that username ');
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    try {
        await user.save();
    } catch (err) {
        return res.status(500).send('Error saving user');
    }

    const link = `http://localhost:3500/forgotPassword/${resetToken}`;  //production: change to domain
    console.log(link);

    const mailOptions = {
        from: 'help@fatimanaqvi.com',
        to: user.email,             //production: ensure actual email field is used not username
        subject: 'Password Reset',
        text: `Click on this link to reset your password: ${link}`
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
            res.status(500).send('Error sending email');
        } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send('Reset password link sent to your email');
        }
    });
};

// Reset password route
const handleResetPwd = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    console.log(token +"\t"+ password)

    if(!token || !password) return res.status(400).send('Invalid request');

    //find user with reset token
    let user;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    try {
        user = await User.findOne({ resetPasswordTokenHash: (hashedToken), resetPasswordExpires: { $gt: Date.now() } });
    } catch (err) {
        return res.status(500).send('Error finding user');
    }

    if (!user) {
        return res.status(400).send('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;

    try {
        await user.save();
    } catch (err) {
        return res.status(500).send('Error saving user');
    }

    res.status(200).send('Password reset successful');
};

module.exports = { handleForgottenPwd, handleResetPwd };