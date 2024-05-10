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


const handleVerification = async (req, res) => {
    const { token } = req.params;

    if(!token) return res.status(400).send('Invalid request');

    //find user with same verification hash and expiry time greater than now
    let user;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');    //hash the token to compare with db
    try {
        user =  await User.findOne( { "emailVerified.data.hash": hashedToken } );
    } catch (err) {
        return res.status(500).send('Error finding user');
    }


    if (!user) {
        return res.status(400).send('Invalid or expired reset token');
    }
    
    user.emailVerified.data.state = true;   //set email verified to true
    user.emailVerified.data.hash = '';     //TODO: fix, not deleting hash for now
    user.emailVerified.data.expiresIn = undefined;
    user.markModified('emailVerified.data');    //subdocument changes need to be marked modified
    try {
        await user.save();
    } catch (err) {
        console.log(err);
        return res.status(500).send('Error saving user');
    }

    res.status(200).send('Email Verified!');
};

module.exports = { handleVerification };