const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Booking = require('../models/Booking');
const TemporaryBooking = require('../models/TemporaryBooking');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const logger = require('../logs/logger');
const {myQueue, deleteDocuments, sendVerificationEmail} = require('../utils/myQueue');
const { getFromCache } = require('../middleware/redisCaching');

// Cache environment variables to avoid repeated access
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRY = '4h';
const ACCESS_TOKEN_EXPIRY = '15m';
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


//@desc Create a new user
//@param {Object} req with valid email, password
//@route GET /auth
//@access Public
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const foundUser = await User.findOne({ email }, 'email role password emailVerified').exec();
    if (!foundUser) {
        return res.status(401).json({ message: 'Invalid login credentials' }); // Avoid user enumeration
    }

    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
        return res.status(401).json({ message: 'Invalid login credentials' }); // Consistent error message
    }

    if (foundUser.emailVerified.state === false) {
        return res.status(401).json({ message: 'Email not verified. Check your email for verification link' });
    }

    const accessToken = jwt.sign(
        { userInfo: { "email": foundUser.email, "role": foundUser.role, "userId": foundUser._id } },
        ACCESS_TOKEN_SECRET, 
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
        { "email": foundUser.email },
        REFRESH_TOKEN_SECRET, 
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    foundUser.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    foundUser.refreshTokenExp = Date.now() + 8 * 60 * 60 * 1000; // Consider moving magic numbers to constants or env variables
    await foundUser.save();

    res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ accessToken });
});


// @desc Refresh
// @param cookie with token
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = asyncHandler(async (req, res) => {
    const { jwt: refreshToken } = req.cookies;
    if (!refreshToken) return res.sendStatus(401);

    let email;
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        email = decoded.email;
    } catch (err) {
        return err instanceof jwt.TokenExpiredError ? 
               res.status(401).json({ message: 'Refresh token expired' }) : 
               res.sendStatus(500); // Internal Server Error for other JWT errors
    }

    if (!email) return res.sendStatus(403); // Forbidden, email not found in token

    // Optimized database query with projection to minimize data retrieval
    const foundUser = await User.findOne({ email }, '_id email role refreshTokenHash').exec();
    if (!foundUser) return res.sendStatus(403); // Forbidden, user not found

    const isMatch = await bcrypt.compare(refreshToken, foundUser.refreshTokenHash);
    if (!isMatch) return res.sendStatus(403); // Forbidden, token mismatch

    const accessToken = jwt.sign(
        { userInfo: { "email": foundUser.email, "role": foundUser.role, "userId": foundUser._id } },
        ACCESS_TOKEN_SECRET, 
        { expiresIn: '15m' }
    );

    console.log(`AccessToken refreshed!`);
    res.json({ accessToken });
});

//@desc Create a new user
//@param {Object} req with valid registration details
//@route POST /auth/register
//@access Public
const register = async (req, res) => {
    try {
        logger.info(`In register API`);
        const validationError = validateRegistration(req.body);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const { email, password, name, DOB, phone } = req.body;
        const duplicate = await checkForDuplicates(email, phone);
        if (duplicate) {
            return res.status(409).json({ message: `An account with this ${duplicate.email === email ? 'email' : 'phone number'} already exists.` });
        }

        const verificationToken = crypto.randomBytes(20).toString('hex');
        const userResult = await createUser({ email, password, name, DOB, phone, verificationToken });
        await handleTemporaryBookings(email, userResult._id);
        await sendEmail(email, name, verificationToken);

        return res.status(201).json({ message: 'User created successfully. Check your email for verification link' });
    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        return res.status(500).json({ message: 'Error during registration' });
    }
};



// ---------------- START OF REGISTER HELPER FUNCTIONS ----------------- //

const validateRegistration = ({ email, password, confirmPassword, name, DOB, phone, eventEndTime, eventStartTime, eventType }) => {
    if (!email || !password || (password !== confirmPassword) || !name || !DOB || !phone || !eventEndTime || !eventStartTime || !eventType) {
        return 'Incorrect or missing data. Please retry.';
    }
    return null;
};

const checkForDuplicates = async (email, phone) => {
    return await User.findOne({ $or: [{ email }, { phone }] }).lean().exec();
};

const createUser = async ({ email, password, name, DOB, phone, verificationToken }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const encryptedToken = encrypt(verificationToken);
    return await User.create({
        email,
        name,
        password: hashedPassword,
        DOB,
        phone,
        "emailVerified.state": false,
        "emailVerified.encryptedToken": encryptedToken,
        "emailVerified.expiresIn": Date.now() + 3600000, // 1 hour
    });
};
// Links users consultation to their account. deletes the temporary booking
const handleTemporaryBookings = async (email, userId) => {
    let tempBooking;
    tempBooking = await getFromCache(`tempBooking:${email}`);

    if(!tempBookings) { //if not in cache, get from db
        tempBookings = await TemporaryBooking.find({ email }).lean().exec();
    } else{
        logger.success(`Retrieved temporary bookings from cache for user: ${email}`)
    }

    if (tempBookings.length > 0) {
        const bookingPromises = tempBookings.map(tempBooking => {
            const { email, createdAt, ...bookingData } = tempBooking; // Correctly destructure inside the map function
            return Booking.create({ ...bookingData, userId });
        });
        await Promise.all(bookingPromises);

        const TemporaryBookingsToDelete = tempBookings.map(tempBooking => tempBooking._id);
        const jobData = { documentIds: TemporaryBookingsToDelete, model: 'TemporaryBooking' };

        //Attempt to add deleteDocuments job to queue. If fails, delete manually
        try{
            await myQueue.add('deleteDocuments', jobData);
        } catch (err) {
            logger.error(`Error adding deleteDocuments job to queue. continuing manuallt: ${err.message}`)
            await deleteDocuments(jobData)
        }

    } else {
        logger.error(`No temporary bookings found for user: ${email}`);
    }
};
const sendEmail = async (email, name,token) => {
    const link = `http://localhost:3200/verifyEmail?token=${token}`; //production: change to domain
    const emailJobData = { recipient: email, name, link };

    //Attempt to add deleteDocuments job to queue. If fails, delete manually
    try{
        await myQueue.add('verifyEmail', emailJobData);
        }catch (err) {
        logger.error(`Error adding verifyEmail job to queue. continuing manually: ${err.message}`)
        await sendVerificationEmail(emailJobData)
    }
    logger.info(`Added verification email to queue: ${email}`);
};

// ---------------- END OF REGISTER HELPER FUNCTIONS ----------------- //


// @desc Logout
// @route POST /auth/logout
// @access Public - clear cookie if exists
const logout = asyncHandler( async (req, res) => {
    //delete Access Token on client side
    const cookies = req.cookies;
    if(!cookies?.jwt) return res.sendStatus(204) //no content

    const refreshToken = cookies.jwt;

    // Decode the refresh token
    const decodedRefreshToken = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const { email } = decodedRefreshToken;
    if (!email) return res.sendStatus(204); // no content

    // is user in db?
    const foundUser = await User.findOne({ email }).exec();
    if (!foundUser) return res.sendStatus(204); // no content 

    
    //delete refresh token in db
    foundUser.refreshTokenHash = '';
    foundUser.refreshTokenExp = 0;
    await foundUser.save();
    
    res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true}); //ADD secure: true in production
    res.sendStatus(204); //no content
})

module.exports = { 
    login,
    refresh,
    register,
    logout
};