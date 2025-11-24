const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const logger = require("../logs/logger");
const {
  invalidateResourceCache,
  invalidateByEvent,
} = require("../middleware/redisCaching");
const { sendEmail } = require("../utils/queue/index");
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

function decrypt(text) {
  logger.info(`Decrypting token: ${text}`);
  try {
    let encryptedText = Buffer.from(text, "hex");
    let decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(TOKEN_ENCRYPTION_KEY, "hex"), // Convert hex string to binary data
      Buffer.from(TOKEN_ENCRYPTION_IV, "hex") // Convert hex string to binary data
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
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
    return res.status(400).json({ message: "Invalid request" });
  }

  // Construct query based on available parameters
  const query = token
    ? { "emailVerified.encryptedToken": encrypt(token) }
    : { email };

  const user = await User.findOne(query).exec();

  if (!user) {
    return res.status(400).json({ message: "No user found" });
  }

  if (user.emailVerified.state) {
    return res.status(400).json({ message: "Email already verified" });
  }
  logger.debug(`attempting to send ev link for: ${user.email}`);
  let verificationToken;
  // Check if token exists and not expired, else generate new token
  if (
    user.emailVerified.encryptedToken &&
    user.emailVerified.expiresIn > Date.now()
  ) {
    verificationToken = decrypt(user.emailVerified.encryptedToken);
    user.emailVerified.expiresIn = Date.now() + 3600000; // reset expiry
    await user.save();
    await invalidateByEvent("user-updated", { userId: user._id });
  } else {
    verificationToken = crypto.randomBytes(20).toString("hex");
    user.emailVerified.encryptedToken = encrypt(verificationToken);
    user.emailVerified.expiresIn = Date.now() + 3600000; // 1 hour
    await user.save();
    await invalidateByEvent("user-updated", { userId: user._id });
  }
  logger.debug(`verification token generated for: ${user.email}`);

  // Add job to email queue
  try {
    await sendEmail("UserAccountVerificationEmail", {
      userId: user._id.toString(),
      verificationToken,
    });
  } catch (err) {
    logger.error(`Error sending email verification link`);
    return res.sendStatus(500);
  }

  return res.status(200).json({ message: "Verification email sent" });
});

//@desc Verify a new users email
//@param valid token in query
//@route POST /users/verifyEmail?token=tokenData
//@access Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Invalid request" });

  logger.info(
    `Attempting to verify email with token: ${token.substring(0, 6)}...`
  );
  const encryptedToken = encrypt(token);
  logger.debug(`Encrypted token: ${encryptedToken.substring(0, 10)}...`);

  const user = await User.findOne(
    {
      "emailVerified.encryptedToken": encryptedToken,
      "emailVerified.expiresIn": { $gt: Date.now() }, //not expired
    },
    "emailVerified email"
  );

  if (!user) {
    logger.error(
      `Invalid or expired verification token: ${token.substring(0, 6)}...`
    );
    return res
      .status(400)
      .json({ message: "Invalid or expired verification token" });
  }
  if (user.emailVerified.state == true) {
    return res.status(204).send();
  }

  logger.info(`Email verified for user: ${user.email}!`);
  user.emailVerified.state = true;
  await user.save();

  // Invalidate cache after email verification
  await invalidateByEvent("user-updated", { userId: user._id });

  res.status(200).json({ message: "Email Verified!" });
});

//@desc send forgot password email
//@param {Object} req with valid email
//@route POST /users/forgotPassword
//@access Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  let user;
  user = await User.findOne({ email });
  logger.info(`result: ${JSON.stringify(user, null, 2)}`);

  if (!user) {
    return res.status(400).json({ message: "No user found with that email" });
  }

  // Try to reuse token, if not valid or expired, generate new token
  let resetToken;
  if (user.resetPasswordEncryptedToken && user.resetPasswordExp > Date.now()) {
    logger.info(
      `Existing token found. Encrypted token: ${user.resetPasswordEncryptedToken}`
    );
    resetToken = decrypt(user.resetPasswordEncryptedToken);
  } else {
    resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordEncryptedToken = encrypt(resetToken);
    user.resetPasswordExp = Date.now() + 3600000; // 1 hour
    user = await user.save();
    await invalidateByEvent("user-updated", { userId: user._id });
    logger.info(
      `Reset token generated for ${user.email}: ${resetToken} /n encrypted: ${user.resetPasswordEncryptedToken}`
    );
  }

  try {
    await sendEmail("UserPasswordResetEmail", {
      userId: user._id.toString(),
      resetToken,
    });
  } catch (err) {
    logger.error("Error sending forgot password email");
    return res.sendStatus(500);
  }

  return res
    .status(200)
    .json({ message: "Reset password link added to email queue" });
});

//@desc reset password
//@param {Object} req body with valid password and token in query params
//@route POST /users/resetPassword?token=tokenString
//@access Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  //find user with reset token
  let user;
  const encryptedToken = encrypt(token);

  let currentDate = new Date(Date.now());
  user = await User.findOne({
    resetPasswordEncryptedToken: encryptedToken,
    resetPasswordExp: { $gt: currentDate },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordEncryptedToken = undefined;
  user.resetPasswordExp = undefined;
  await user.save();
  await invalidateByEvent("user-updated", { userId: user._id });
  logger.info(`Password reset successfully for user: ${user.email}`);

  res.status(200).json({ message: "Password reset successfully!" });
});

//@desc get users own data
//@route GET /user
//@access Private
const getMyData = asyncHandler(async (req, res) => {
  const userId = req.user.id; // from verifyJWT

  // Optimization: Use findById (uses _id index) and only select needed fields
  const user = await User.findById(userId)
    .select("_id email phone role DOB name accountType") // Added accountType since it's often needed
    .lean() // Convert to plain JS object (faster)
    .exec();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});

//@desc Update users own data
//@param {Object} req with valid new data
//@route PATCH /users/me
//@access Private
const updateMyUser = asyncHandler(async (req, res) => {
  const userId = req.user.id; //from verifyJWT
  const newData = req.body;
  logger.debug(`in update user:\n${JSON.stringify(newData)}`);

  // whitelist of fields that can be updated
  const allowedUpdates = ["name", "phone", "DOB"];

  // filter out any fields that are not allowed to be edited
  const updates = Object.keys(newData)
    .filter((key) => allowedUpdates.includes(key))
    .reduce((obj, key) => {
      obj[key] = newData[key];
      return obj;
    }, {});

  // Check if phone number is being updated
  if (updates.phone) {
    // Optimization: Use countDocuments instead of findOne (faster when you just need existence check)
    const phoneExists = await User.exists({
      phone: updates.phone,
      _id: { $ne: userId },
    });

    if (phoneExists) {
      logger.debug(`Duplicate phone number detected: ${updates.phone}`);
      return res.status(409).json({
        message:
          "This phone number is already registered with another account.",
      });
    }
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
    lean: true, // Return plain object instead of Mongoose document
  }).select("_id email phone role DOB name accountType");

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  logger.debug(`User Updated! Invalidating User cache for userId: ${userId}`);
  await invalidateByEvent("user-profile-updated", { userId });

  return res.status(200).json(updatedUser); // Use 200 instead of 201 for updates
});

//@desc Get user's recurring booking info and next upcoming recurring session
//@route GET /user/recurring
//@access Private
const getRecurringBooking = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Fetch user's recurring info (lightweight query)
  const user = await User.findById(userId)
    .select(
      "recurring.state recurring.interval recurring.day recurring.time recurring.location"
    )
    .lean()
    .exec();

  // If user doesn't have recurring enabled, return empty object early
  if (!user || !user.recurring?.state) {
    return res.json({});
  }

  // Optimization: Use aggregation pipeline to fetch booking + payment in one query
  const result = await Booking.aggregate([
    {
      $match: {
        userId: user._id,
        source: "system",
        "recurring.state": true,
        status: "Active",
        eventEndTime: { $gt: new Date() },
      },
    },
    { $sort: { eventStartTime: 1 } },
    { $limit: 1 }, // Only get the first one
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "bookingId",
        as: "payment",
      },
    },
    { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        bookingId: 1,
        eventStartTime: 1,
        eventEndTime: 1,
        location: 1,
        source: 1, // Include source field so frontend can identify booking type
        amount: "$payment.amount",
        currency: "$payment.currency",
        transactionStatus: "$payment.transactionStatus",
      },
    },
  ]);

  const nextRecurringBooking = result.length > 0 ? result[0] : null;

  // Return recurring schedule info + next booking
  res.json({
    recurringSchedule: {
      interval: user.recurring.interval,
      day: user.recurring.day,
      time: user.recurring.time,
      location: user.recurring.location,
    },
    nextRecurringBooking,
  });
});

module.exports = {
  getMyData,
  updateMyUser,
  verifyEmail,
  resendEvLink,
  forgotPassword,
  resetPassword,
  getRecurringBooking,
  encrypt, // Export encrypt for testing
};
