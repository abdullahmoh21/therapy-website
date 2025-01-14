const { myQueue, sendVerificationEmail, sendResetPasswordEmail } = require('../utils/myQueue');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');  //middleware to handle exceptions
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const ROLES_LIST = require('../config/roles_list');
const logger  = require('../logs/logger');
const { invalidateCache } = require('../middleware/redisCaching');
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
const TOKEN_ENCRYPTION_IV = process.env.TOKEN_ENCRYPTION_IV;


//Encrypt & decrypt for tokens
function encrypt(text) {
    let cipher = crypto.createCipheriv(
        'aes-256-cbc', 
        Buffer.from(TOKEN_ENCRYPTION_KEY, 'hex'), // Convert hex string to binary data
        Buffer.from(TOKEN_ENCRYPTION_IV, 'hex')   // Convert hex string to binary data
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
}

function decrypt(text) {
    logger.info(`Decrypting token: ${text}`)
    try{    
        let encryptedText = Buffer.from(text, 'hex');
        let decipher = crypto.createDecipheriv(
            'aes-256-cbc', 
            Buffer.from(TOKEN_ENCRYPTION_KEY, 'hex'), // Convert hex string to binary data
            Buffer.from(TOKEN_ENCRYPTION_IV, 'hex')   // Convert hex string to binary data
        );
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }catch (err){
        logger.error(`Error decrypting token: ${err}`);
    }
}


//@desc Resend email verification
//@param {Object} req with valid email or token
//@route GET /users/resendEmailVerification
//@access Public
const resendEvLink = asyncHandler(async (req, res) => {
    const { token, email } = req.body;

    if (!token && !email) {
        return res.status(400).json({ 'message': 'Invalid request' });
    }

    // Construct query based on available parameters
    const query = token ? { 'emailVerified.encryptedToken': encrypt(token) } : { email };

    // Execute a single database query to find the user
    const user = await User.findOne(query).exec();

    if (!user) {
        return res.status(400).json({ 'message': 'No user found' });
    }

    if (user.emailVerified.state) {
        return res.status(400).json({ 'message': 'Email already verified' });
    }

    let link;
    // Check if token exists and not expired, else generate new token
    if (user.emailVerified.encryptedToken && user.emailVerified.expiresIn > Date.now()) {
        link = `http://localhost:5173/verifyEmail?token=${decrypt(user.emailVerified.encryptedToken)}`;
    } else {
        const newToken = crypto.randomBytes(20).toString('hex');
        user.emailVerified.encryptedToken = encrypt(newToken);
        user.emailVerified.expiresIn = Date.now() + 3600000; // 1 hour
        await user.save();
        link = `http://localhost:5173/verifyEmail?token=${newToken}`;
    }

    // Prepare email job data
    const emailJobData = {
        name: user.name,
        recipient: user.email,
        link: link
    };

    // Add job to email queue
    try{
        await myQueue.add('verifyEmail', emailJobData);
    }catch(err){
        logger.error(`Error adding job to queue. continuing manually: ${err.message}`);
        await sendVerificationEmail(emailJobData)
    }

    return res.status(200).json({ 'message': 'Verification email sent' });
});

//@desc Verify a new users email 
//@param valid token in query
//@route POST /users/verifyEmail?token=tokenData
//@access Public
const verifyEmail = asyncHandler( async (req, res) => {
    const { token } = req.query;
    if(!token) return res.status(400).send('Invalid request');
    
    logger.info(`In verifyEmail API. Token: ${token}`);
    const encryptedToken = encrypt(token);
    
    const user =  await User.findOne({ 
        "emailVerified.encryptedToken": encryptedToken,
        "emailVerified.expiresIn": { $gt: Date.now() } //not expired
    }, ('emailVerified,'));
    

    if (!user) {
        logger.error(`Invalid or expired verification token: ${token}`);
        return res.status(400).send('Invalid or expired verification token');
    }
    
    console.log("Email verified!!")
    user.emailVerified.state = true;   //set email verified to true
    user.emailVerified.hash = '';     
    user.emailVerified.expiresIn = undefined;
    await user.save();

    res.status(200).json({'message':'Email Verified!'});
});

//@desc send forgot password email
//@param {Object} req with valid email
//@route POST /users/forgotPassword
//@access Public
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    logger.info(`In forgotPassword API. Email: ${email}`);
    logger.debug(sendResetPasswordEmail);
    let user;
    user = await User.findOne({ email });
    logger.info(`result: ${JSON.stringify(user, null, 2)}`);

    if (!user) {
        return res.status(400).json({ 'message': 'No user found with that email' });
    }

    // Try to reuse token, if not valid or expired, generate new token
    let resetToken;
    if (user.resetPasswordEncryptedToken && user.resetPasswordExp > Date.now()) {
        logger.info(`Existing token found. Encrypted token: ${user.resetPasswordEncryptedToken}`);
        resetToken = decrypt(user.resetPasswordEncryptedToken);
    } else {
        resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordEncryptedToken = encrypt(resetToken);
        user.resetPasswordExp = Date.now() + 3600000; // 1 hour
        user = await user.save();
        logger.info(`Reset token generated for ${user.email}: ${resetToken} /n encrypted: ${user.resetPasswordEncryptedToken}`);
    }

    const link = `http://localhost:5173/resetPassword?token=${resetToken}`;  //production: change to domain

    let emailJobData = {
        name: user.name,
        recipient: user.email,
        link: link
    };
    
    try {
        logger.debug(`Attempting to add resetPassword job to queue`)
        const response = await myQueue.add('resetPassword', emailJobData);
    } catch (err) {
        logger.error(`Error adding resetPassword job to queue. continuing manually: ${err}`);
        emailJobData = {    //mock job created to pass to function
            data: {
                name: user.name,
                recipient: user.email,
                link: link
            },
            name: 'resetPassword'
        };
        
        try {
            logger.debug(`Attempting to send reset password email manually`)
            await sendResetPasswordEmail(emailJobData); // Ensure this function call is correct
        } catch (emailError) {
            logger.error(`Error sending reset password email manually: ${emailError}`);
            return res.status(500).json({ 'message': 'Internal Server Error' });
        }
    }

    return res.status(200).json({ 'message': 'Reset password link added to email queue' });
});


//@desc reset password
//@param {Object} req body with valid password and token in query params
//@route POST /users/resetPassword?token=tokenString
//@access Public
const resetPassword = async (req, res) => {
    const { token } = req.query;
    const { password } = req.body;
    
    console.log(`in resetpassword. token: ${token}`);  //debugging
    
    //find user with reset token
    let user;
    const encryptedToken = encrypt(token);

    let currentDate = new Date(Date.now())
    user = await User.findOne({ resetPasswordEncryptedToken: encryptedToken, resetPasswordExp: { $gt: currentDate } });

    if (!user) {
        return res.status(400).json({'message':'Invalid or expired token'});
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExp = undefined;
    await user.save();
    logger.info(`Password reset to ${password}`); 

    res.status(200).json({'message':'Password reset successfully!'});
};

//@desc get users own data
//@route GET /users/me
//@access Private
const getMyData=  asyncHandler( async (req, res) => {
    const{ email } = req; //from verifyJWT
    const user = await User.findOne({ email }).select('_id email phone role DOB name').lean().exec();
    if (!user) return res.status(204).json({ 'message': 'No users found' });
    res.json(user);
});


//@desc Update users own data
//@param {Object} req with valid new data
//@route PATCH /users/me
//@access Private
const updateMyUser = asyncHandler( async (req, res) => {
    const { email } = req;   //from verifyJWT
    const newData = req.body;

    // whitelist of fields that can be updated
    const allowedUpdates = ['name', 'phone', 'DOB'];

   // filter out any fields that are not allowed to be edited
    const updates = Object.keys(newData)
       .filter(key => allowedUpdates.includes(key))
       .reduce((obj, key) => {
           obj[key] = newData[key];
           return obj;
       }, {});
    
    const updatedUser = await User.findOneAndUpdate(
        { email: email }, // find a document with this email
        updates, // filtered data to update
        { new: true, runValidators: true } // options: return updated one, run all schema validators again
    ).select('_id email phone role DOB name');

    if (!updatedUser) {return res.status(404).json({ message: 'User not found' });}

    logger.success(`User Updated! Invalidating User cache`)
    invalidateCache(`user:${updatedUser._id}`)
    return res.status(201).json(updatedUser);
})

module.exports = {
    getMyData,
    updateMyUser,
    verifyEmail,
    resendEvLink,
    forgotPassword,
    resetPassword
}