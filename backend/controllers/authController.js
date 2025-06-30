const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Booking = require("../models/Booking");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const logger = require("../logs/logger");
const { sendEmail } = require("../utils/myQueue");
const { response } = require("express");
const Invitee = require("../models/Invitee");
const { invalidateByEvent } = require("../middleware/redisCaching");

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
const TOKEN_ENCRYPTION_IV = process.env.TOKEN_ENCRYPTION_IV;
const REFRESH_TOKEN_EXPIRY = "4h";
const ACCESS_TOKEN_EXPIRY = "15m";

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

//@desc Creates a new session and returns jwt and refresh cookie
//@param {Object} req with valid email, password
//@route POST /auth
//@access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const foundUser = await User.findOne(
    { email },
    "email role password emailVerified"
  ).exec();
  if (!foundUser) {
    return res.status(401).json({ message: "Invalid login credentials" });
  }

  const match = await bcrypt.compare(password, foundUser.password);
  if (!match) {
    return res.status(401).json({ message: "Invalid login credentials" });
  }

  if (!foundUser.emailVerified.state) {
    return res.status(401).json({
      message: "Email not verified. Check your email for verification link",
    });
  }

  const payload = {
    user: {
      email: foundUser.email,
      role: foundUser.role,
      id: foundUser._id,
    },
  };

  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours in ms

  foundUser.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  foundUser.refreshTokenExp = Date.now() + REFRESH_TOKEN_TTL_MS;
  foundUser.lastLoginAt = new Date();
  await foundUser.save();

  invalidateByEvent("user-login", { userId: foundUser._id });

  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in ms
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    sameSite: isProd ? "None" : "Lax",
    secure: isProd,
    maxAge: ONE_DAY_MS,
  });

  res.json({ accessToken });
});

// @desc    Logout (invalidate refresh token & clear cookie)
// @route   POST /auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  const { jwt: refreshToken } = req.cookies ?? {};

  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: isProd ? "None" : "Lax",
    secure: isProd,
  });

  if (!refreshToken) return res.sendStatus(204);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.sendStatus(204);
  }

  const { email } = decoded;
  if (!email) return res.sendStatus(204);

  const user = await User.findOne({ email }).exec();
  if (!user || !user.refreshTokenHash) return res.sendStatus(204);

  const cookieHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  if (cookieHash === user.refreshTokenHash) {
    user.refreshTokenHash = "";
    user.refreshTokenExp = 0;
    await user.save();
  }

  return res.sendStatus(204);
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
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

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

    if (!email || !password || !name || !DOB || !phone || !token) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const duplicate = await checkForDuplicates(email, phone);
    if (duplicate) {
      logger.debug("Account registration cancelled. This user already exists");
      return res.status(409).json({
        message: `An account with this ${
          duplicate.email === email ? "email" : "phone number"
        } already exists.`,
      });
    }

    const invitation = await checkInvitation(email, token);
    if (!invitation) {
      return res.status(400).json({
        message:
          "Invalid or expired invitation. Please contact an administrator.",
      });
    }

    const accountType = invitation.accountType;
    const verificationToken = crypto.randomBytes(20).toString("hex");
    userResult = await createUser({
      email,
      password,
      name,
      DOB,
      phone,
      verificationToken,
      accountType,
    });

    const link = `${process.env.FRONTEND_URL}/verifyEmail?token=${verificationToken}`;

    try {
      await sendEmail("verifyEmail", {
        recipient: email,
        name,
        link,
      });
      logger.info(`Verification email sent to ${email} during registration`);
    } catch (err) {
      logger.error(
        `Error sending verification email during registration: ${err.message}`
      );
    }

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
  accountType,
}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const encryptedToken = encrypt(verificationToken);
  return await User.create({
    email,
    name,
    password: hashedPassword,
    DOB,
    phone,
    accountType,
    "emailVerified.state": false,
    "emailVerified.encryptedToken": encryptedToken,
    "emailVerified.expiresIn": Date.now() + 3600000, // 1 hour
  });
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

module.exports = {
  login,
  refresh,
  register,
  logout,
};
