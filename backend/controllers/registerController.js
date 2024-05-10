const User = require('../models/User.js');
const bcrypt = require('bcrypt');
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

const handleNewUser = async (req, res) => {
    const { email, pwd,name ,DOB} = req.body;
    if (!email || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });

    // check for duplicate usernames in the db
    const duplicate = await User.findOne({ username: email}).exec();
    if (duplicate) return res.sendStatus(409); //Conflict 

    //TODO: add verification link for email

    try {
        const hashedPwd = await bcrypt.hash(pwd, 10);   //encrypt the password
        const result = await User.create({ 
            "email": email,
            "emailVerified.data.State": false,
            "password": hashedPwd,
            "DOB": DOB
        });
        
        res.status(201).json({ 'success': `New user ${email} created! Email Verification Pending` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
    

    const user = await User.findOne({ email });//get created user
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.emailVerified.data.Hash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerified.data.ExpiresIn = Date.now() + 3600000; // 1 hour

    const link = `https://localhost:3500/verifyEmail/${verificationToken}`   //production: change to domain


    try {
        await user.save(); // save the user with the new hash and expiry
    } catch (err) {
        return res.status(500).send('Error saving user');
    }

    const mailOptions = {
        from: 'notifications@fatimanaqvi.com',
        to: email,             //production: ensure actual email field is used not username
        subject: 'Welcome to my Clinic',
        text: `Dear ${name}, 

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

}

module.exports = { handleNewUser };