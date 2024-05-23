const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Booking = require('../models/Booking');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const nodemailer = require('nodemailer');



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


// @desc Login
// @route POST /auth
// @access Public
const login = asyncHandler( async (req, res) => {
    //TODO: Validation check sending number as pwd crashes server

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ 'message': 'Username and password are required.' });
    const foundUser = await User.findOne({ email: email });
    if (!foundUser) return res.status(401).json({ message: 'Unauthorized' }); //Unauthorized 


    // evaluate password 
    const match = await bcrypt.compare(password, foundUser.password);
    if (match) {

        const role = foundUser.role;

        //check if email is verified
        if(foundUser.emailVerified.data.state === false){
            return res.status(401).json({ message: 'Email not verified. Check your email for verification link' });
        }

        // create JWTs
        const accessToken = jwt.sign(
            { 
                userInfo: {
                    "email": foundUser.email,
                    "role": foundUser.role
                } 
            },
             process.env.ACCESS_TOKEN_SECRET, 
             { expiresIn: '600s' }
        );

        console.log(`AccessToken created!`);

        const refreshToken = jwt.sign(
            { "email": foundUser.email },
             process.env.REFRESH_TOKEN_SECRET, 
             { expiresIn: '8h' }
        );

        //saving Refresh token in DB
        foundUser.refreshTokenHash = await bcrypt.hash(refreshToken,10);
        foundUser.refreshTokenExp = Date.now() + 8*60*60*1000;  //8 hours
        const result = await foundUser.save();

        //http only cookie cannot be accessed by JS
        res.cookie('jwt', refreshToken, { httpOnly: true ,sameSite: 'None', secure: true, maxAge:24*60*60*1000});
        res.json({accessToken});
    } else {
        return res.status(401).json({ message: 'Unauthorized' }); //Unauthorized 
    }
})

//@desc Create a new user
//@param {Object} req with valid email, password, name, and DOB
//@route POST /users
//@access Public
const register = asyncHandler( async (req, res) => {
    console.log(`In register API`);
    const { email, password, confirmPassword ,DOB, phone, eventEndTime, eventStartTime, eventType} = req.body;
    const name = req.body.fullName || req.body.name;

    if (!email || !password || (password !== confirmPassword) || !name || !DOB || !phone || !eventEndTime|| !eventStartTime || !eventType){
         return res.status(400).json({ message: 'Incorrect or missing data. Please retry ' });
    }

    // check for duplicate usernames in the db
    let duplicate = await User.findOne({ email }).lean().exec();
    if (duplicate) return res.status(409).json({ message: 'An account with this email already exists. Please Sign in' }); //Conflict 

    duplicate = await User.findOne({ phone }).lean().exec();
    if (duplicate) return res.status(409).json({ message: 'An account with this phone number already exists' }); //Conflict 

    //encrypt the password
    const hashedPassword = await bcrypt.hash(password, 10);  
    const token = crypto.randomBytes(20).toString('hex');
    const verificationHash = crypto.createHash('sha256').update(token).digest('hex');
    
    console.log(`\n Token: ${token} \t Hashed token: ${verificationHash}`);  //debugging


    const userResult = await User.create({ 
        "email": email,
        "name": name,
        "password": hashedPassword,
        "DOB": DOB,
        "phone": phone,
        "emailVerified.data.state": false,
        "emailVerified.data.hash": verificationHash,
        "emailVerified.data.expiresIn": Date.now() + 3600000, // 1 hour
    });

    if(!userResult){ return res.sendStatus(500).json({ 'message': 'Error creating user' }); }

    //add 15min consultation booking every new client needs
    const bookingResult = await Booking.create({
        "userId": userResult._id,  //link to user created above
        "eventStartTime": eventStartTime,
        "eventEndTime": eventEndTime,
        "eventType": eventType,
        "paymentAmmount": 0, //free
    });

    if (!bookingResult){ 
        //delete user if booking creation fails
        await User.deleteOne({_id: userResult._id}).exec();
        return res.sendStatus(500).json({ 'message': 'Error creating Booking. Registration aborted' });
        console.log(`Booking creation failed. User deleted.`)
    }


    // email verification link with unhashed token
    const link = `http://localhost:3500/users/verifyEmail/${token}`   //production: change to domain and https

    const mailOptions = {
        from: 'verification@fatimanaqvi.com',
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
            res.status(201).json({ 'bookingId': bookingResult.bookingId, 'message': 'User created. Check your email for verification link'});
        }
    });

})

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = asyncHandler( async (req, res) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    // Decode the refresh token
    
    let decodedRefreshToken; let email;
    try {
        decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        email = decodedRefreshToken.email;
    } catch (err) {
        if(err instanceof jwt.TokenExpiredError){
            return res.status(401).json({ message: 'Refresh token expired' });
        }
        throw err;
    }
    if (!email) return res.sendStatus(403).json({ message: 'Could not find ID in token' });; // Forbidden

    const foundUser = await User.findOne({ email }).exec();
    if (!foundUser) return res.sendStatus(403); // Forbidden 

    // Compare the refresh token with the hashed version stored in the database
    const isMatch = await bcrypt.compare(refreshToken, foundUser.refreshTokenHash);
    if (!isMatch) return res.sendStatus(403).json({ message: 'Token tampered with. Retry' }); // Forbidden

    // generate new access token
    const accessToken = jwt.sign(
        { 
            userInfo: {
                "email": foundUser.email,
                "role": foundUser.role
            } 
        },
         process.env.ACCESS_TOKEN_SECRET, 
         { expiresIn: '600s' }
    );
    console.log(`AccessToken refreshed!`);
    res.json({ accessToken });
})

// @desc Logout
// @route POST /auth/logout
// @access Public - clear cookie if exists
const logout = asyncHandler( async (req, res) => {
    //delete Access Token on client side

    console.log(`in logout`)
    const cookies = req.cookies;
    if(!cookies?.jwt) return res.sendStatus(204) //no content

    const refreshToken = cookies.jwt;

    // Decode the refresh token
    const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const { email } = decodedRefreshToken;
    if (!email) return res.sendStatus(204); // no content

    // is user in db?
    const foundUser = await User.findOne({ email }).exec();
    if (!foundUser) return res.sendStatus(204); // no content 

    
    //delete refresh token in db
    foundUser.refreshTokenHash = '';
    foundUser.refreshTokenExp = 0;
    const result = await foundUser.save();
    console.log("result from logout: ", result);
    
    res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true}); //ADD secure: true in production
    res.sendStatus(204); //no content
})

module.exports = { 
    login,
    refresh,
    register,
    logout
};