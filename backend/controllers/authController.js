const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Booking = require("../models/Booking");
const TemporaryBooking = require("../models/TemporaryBooking");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const logger = require("../logs/logger");
const {
  myQueue,
  deleteDocuments,
  sendVerificationEmail,
} = require("../utils/myQueue");
const { getFromCache } = require("../middleware/redisCaching");
const { response } = require("express");
const Invitee = require("../models/Invitee");

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRY = "4h";
const ACCESS_TOKEN_EXPIRY = "15m";
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
const TOKEN_ENCRYPTION_IV = process.env.TOKEN_ENCRYPTION_IV;

//Encrypt & decrypt for tokens
function encrypt(text) {
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(TOKEN_ENCRYPTION_KEY, "hex"), // Convert hex string to binary data
    Buffer.from(TOKEN_ENCRYPTION_IV, "hex") // Convert hex string to binary data
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
}

//@desc Create a new user
//@param {Object} req with valid email, password
//@route GET /auth
//@access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const foundUser = await User.findOne(
    { email },
    "email role password emailVerified"
  ).exec();
  if (!foundUser) {
    return res.status(401).json({ message: "Invalid login credentials" }); // Avoid user enumeration
  }

  const match = await bcrypt.compare(password, foundUser.password);
  if (!match) {
    return res.status(401).json({ message: "Invalid login credentials" }); // Consistent error message
  }

  if (foundUser.emailVerified.state === false) {
    return res.status(401).json({
      message: "Email not verified. Check your email for verification link",
    });
  }

  const accessToken = jwt.sign(
    {
      user: {
        email: foundUser.email,
        role: foundUser.role,
        id: foundUser._id,
      },
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      user: {
        email: foundUser.email,
        role: foundUser.role,
        id: foundUser._id,
      },
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  foundUser.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  foundUser.refreshTokenExp = Date.now() + 8 * 60 * 60 * 1000; // Consider moving magic numbers to constants or env variables
  await foundUser.save();

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    sameSite: "None",
    secure: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ accessToken });
});

// @desc Refresh
// @param cookie with token
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = asyncHandler(async (req, res) => {
  const { jwt: refreshToken } = req.cookies;
  if (!refreshToken) return res.sendStatus(401);

  let userId;
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    userId = decoded.user.id;
  } catch (err) {
    return err instanceof jwt.TokenExpiredError
      ? res.status(401).json({ message: "Refresh token expired" })
      : res.sendStatus(500); // Internal Server Error for other JWT errors
  }

  if (!userId) return res.sendStatus(403); // Forbidden, userId not found in token

  // Optimized database query with projection to minimize data retrieval
  const foundUser = await User.findById(
    userId, // Pass the userId directly, not as an object
    "_id email role refreshTokenHash"
  ).exec();
  if (!foundUser) return res.sendStatus(403); // Forbidden, user not found

  const isMatch = await bcrypt.compare(
    refreshToken,
    foundUser.refreshTokenHash
  );
  if (!isMatch) return res.sendStatus(403); // Forbidden, token mismatch

  const accessToken = jwt.sign(
    {
      user: {
        email: foundUser.email,
        role: foundUser.role,
        id: foundUser._id,
      },
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  console.log(`AccessToken refreshed!`);
  res.json({ accessToken });
});

//@desc Create a new user based on admin invitation
//@param {Object} req with valid registration details and invitation token
//@route POST /auth/register
//@access Public
const register = async (req, res) => {
  let userResult;

  try {
    const { email, password, name, DOB, phone, token } = req.body;

    // Validate that all required fields are present
    if (!email || !password || !name || !DOB || !phone || !token) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Check for duplicate email or phone
    const duplicate = await checkForDuplicates(email, phone);
    if (duplicate) {
      logger.debug("Account registration cancelled. This user already exists");
      return res.status(409).json({
        message: `An account with this ${
          duplicate.email === email ? "email" : "phone number"
        } already exists.`,
      });
    }

    // Verify the invitation token
    const invitation = await checkInvitation(email, token);
    if (!invitation) {
      return res.status(400).json({
        message:
          "Invalid or expired invitation. Please contact an administrator.",
      });
    }

    // Create the user
    const verificationToken = crypto.randomBytes(20).toString("hex");
    userResult = await createUser({
      email,
      password,
      name,
      DOB,
      phone,
      verificationToken,
    });

    // Send the verification email
    await sendEmail(email, name, verificationToken);

    // Mark invitation as used
    await markInvitationAsUsed(email);

    return res.status(201).json({
      message:
        "User created successfully. Check your email for verification link",
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);

    if (userResult) {
      await rollbackUserCreation(userResult.email);
    }

    return res.status(500).json({ message: "Error during registration" });
  }
};

// ---------------- START OF REGISTER HELPER FUNCTIONS ----------------- //

const checkForDuplicates = async (email, phone) => {
  const duplicate = await User.findOne({ $or: [{ email }, { phone }] })
    .lean()
    .exec();

  if (duplicate) {
    logger.debug("Duplicate user found.");
  }

  return duplicate;
};

const createUser = async ({
  email,
  password,
  name,
  DOB,
  phone,
  verificationToken,
}) => {
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

const sendEmail = async (email, name, token) => {
  const link = `${FRONTEND_URL}/verifyEmail?token=${token}`; //production: change to domain
  const emailJobData = { recipient: email, name, link };

  try {
    await myQueue.add("verifyEmail", emailJobData);
  } catch (err) {
    logger.error(
      `Error adding verifyEmail job to queue. continuing manually: ${err.message}`
    );
    return res.sendStatus(500);
  }
};

const rollbackUserCreation = async (email) => {
  try {
    await User.deleteOne({ email });
    logger.info(`Rolled back user creation for ${email}`);
  } catch (deleteError) {
    logger.error(`Error during user rollback: ${deleteError.message}`);
  }
};

const checkInvitation = async (email, token) => {
  const invitation = await Invitee.findOne({
    email,
    token,
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  });

  return invitation;
};

const markInvitationAsUsed = async (email) => {
  await Invitee.findOneAndUpdate(
    { email },
    {
      isUsed: true,
      usedAt: Date.now(),
    }
  );
};

// ---------------- END OF REGISTER HELPER FUNCTIONS ----------------- //

// @desc Logout
// @route POST /auth/logout
// @access Public - clear cookie if exists
const logout = asyncHandler(async (req, res) => {
  //delete Access Token on client side
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //no content

  const refreshToken = cookies.jwt;

  // Decode the refresh token
  const decodedRefreshToken = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

  const { email } = decodedRefreshToken;
  if (!email) return res.sendStatus(204); // no content

  // is user in db?
  const foundUser = await User.findOne({ email }).exec();
  if (!foundUser) return res.sendStatus(204); // no content

  //delete refresh token in db
  foundUser.refreshTokenHash = "";
  foundUser.refreshTokenExp = 0;
  await foundUser.save();

  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true }); //ADD secure: true in production
  res.sendStatus(204); //no content
});

module.exports = {
  login,
  refresh,
  register,
  logout,
};
