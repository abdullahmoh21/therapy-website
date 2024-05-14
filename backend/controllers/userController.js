//CRUD operations for user
const User = require('../models/User');
const asyncHandler = require('express-async-handler');  //middleware to handle exceptions
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const ROLES_LIST = require('../config/roles_list');

//TODO: incorporate data validation using joi

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


//@desc Get all users
//@param {Object} req with valid role
//@route GET /users
//@access Private
const getAllUsers_ADMIN = asyncHandler( async (req, res) => {
    if (req.role !== ROLES_LIST.Admin) return res.sendStatus(401);
    const users = await User.find({}).select('-password').lean(); 
    if (!users) return res.status(400).json({ 'message': 'No users found' });
    res.json(users);
})

//@desc Delete a user
//@param {Object} req with valid role and email
//@route DELETE /users
//@access Private
const deleteUser_ADMIN = asyncHandler( async (req, res) => {
    if (req.role !== ROLES_LIST.Admin) return res.sendStatus(401);
    const { email } = req.body;
    const users = await User.deleteOne({ email: email }).exec();
    if (!users) return res.status(204).json({ 'message': 'No users found' });
    
    res.json(users).status(200).json({ 'message': 'User' +user+ 'deleted' });
})

//@desc Create a new user
//@param {Object} req with valid email, password, name, and DOB
//@route POST /users
//@access Public
const createNewUser = asyncHandler( async (req, res) => {
    const { email, password,name ,DOB} = req.body;
    if (!email || !password || !name || !DOB) return res.status(400).json({ message: 'All fields are required.' });

    // check for duplicate usernames in the db
    const duplicate = await User.findOne({ email }).lean().exec();
    if (duplicate) return res.sendStatus(409).json({ message: 'Duplicate email' }); //Conflict 

    //encrypt the password
    const hashedPassword = await bcrypt.hash(password, 10);  
    const token = crypto.randomBytes(20).toString('hex');
    const verificationHash = crypto.createHash('sha256').update(token).digest('hex');
    console.log(`Token: ${token} \t Hashed token: ${verificationHash}`);  //debugging


    const result = await User.create({ 
        "email": email,
        "emailVerified.data.state": false,
        "name": name,
        "password": hashedPassword,
        "DOB": DOB,
        "emailVerified.data.hash": verificationHash,
        "emailVerified.data.expiresIn": Date.now() + 3600000, // 1 hour
    });

    if (!result){ return res.sendStatus(400).json({ 'message': 'Error creating user' }); }

    res.status(201).json({ 'success': `New user ${email} created! Email Verification Pending` });

    // email verification link with unhashed token
    const link = `http://localhost:3500/users/verifyEmail/${token}`   //production: change to domain and https

    const mailOptions = {
        from: 'notifications@fatimanaqvi.com',
        to: email,             //production: ensure actual this field is always actual email
        subject: 'Welcome to my Clinic',
        text: 
       `Dear ${name}, 

        Click on this link to activate your account: ${link}
        This link expires in One hour.
        If you did not sign up for this account, please ignore this email.
        
        Regards,
        Fatima Naqvi`
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
            res.status(500).send('Error sending email');
        } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send('Email Verification link sent to your email');
        }
    });

})

//@desc Verify a new user
//@param {Object} req with valid token
//@route GET /users/verifyEmail/:token
//@access Public
const verifyEmail = async (req, res) => {
    const { token } = req.params;

    if(!token) return res.status(400).send('Invalid request');

    //find user with same verification hash and expiry time greater than now
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');    //hash the token to compare with db

    console.log(hashedToken);  //debugging

    const user =  await User.findOne( { "emailVerified.data.hash": hashedToken } );

    console.log(user);  //debugging

    if (!user) {
        return res.status(400).send('Invalid or expired verification token');
    }
    
    user.emailVerified.data.state = true;   //set email verified to true
    user.emailVerified.data.hash = '';     //TODO: fix, not deleting hash for now
    user.emailVerified.data.expiresIn = undefined;
    user.markModified('emailVerified.data');    //subdocument changes need to be marked modified

    await user.save();
    res.status(200).send('Email Verified!');
};

//@desc send forgot password email
//@param {Object} req with valid email
//@route POST /users/forgotPassword
//@access Public
const forgotPassword =  asyncHandler( async (req, res) => {
    const { email } = req.body;

    let user;
    user = await User.findOne({ email });

    if (!user) {
        return res.status(400).send('No user found with that email ');
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExp = Date.now() + 3600000; // 1 hour


   user = await user.save();


    const link = `http://localhost:3500/forgotPassword/${resetToken}`;  //production: change to domain
    console.log(link);

    const mailOptions = {
        from: 'notifications@fatimanaqvi.com',
        to: user.email,             //production: ensure actual email field is used not email
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
})

//@desc reset password
//@param {Object} req with valid token and password
//@route POST /users/forgotPassword/:token
//@access Public
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    
    if(!token || !password) return res.status(400).send('Invalid request');
    
    //find user with reset token
    let user;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');   //hash input to search in db

    let currentDate = new Date(Date.now())
    user = await User.findOne({ resetPasswordTokenHash: hashedToken, resetPasswordExp: { $gt: currentDate } });

    if (!user) {
        return res.status(400).send('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExp = undefined;
    await user.save();

    res.status(200).send('Password reset successful');
};

//@desc get users own data
//@route GET /users/me
//@access Public
const getMyData= async (req, res) => {
    const{ email } = req; //from verifyJWT
    const user = await User.findOne({ "email": email }).select('-password').lean();
    if (!user) return res.status(204).json({ 'message': 'No users found' });
    res.json(user);
}

//@desc Update users own data
//@param {Object} req with valid new data
//@route PATCH /users/me
//@access Public
const updateMyUser = asyncHandler( async (req, res) => {
    const { email } = req;   //from verifyJWT
    const newData = req.body;

    // whitelist of fields that can be updated
    const allowedUpdates = ['name', 'phone', 'DOB'];

   // filter out any fields that are not allowed 
    const updates = Object.keys(newData)
       .filter(key => allowedUpdates.includes(key))
       .reduce((obj, key) => {
           obj[key] = newData[key];
           return obj;
       }, {});

    const updatedUser = await User.findOneAndUpdate(
        { email: email }, // find a document with this email
        updates, // data to update
        { new: true, runValidators: true } // options: return updated one, run all schema validators again
    );

    if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.json(updatedUser);

})

module.exports = {
    getAllUsers_ADMIN,
    deleteUser_ADMIN,
    getMyData,
    updateMyUser,
    createNewUser,
    verifyEmail,
    forgotPassword,
    resetPassword
}