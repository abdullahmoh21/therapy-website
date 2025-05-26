const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler"); //middleware to handle exceptions
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const logger = require("../logs/logger");
const { invalidateCache } = require("../middleware/redisCaching");
const {
  myQueue,
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../utils/myQueue");
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

  let link;
  // Check if token exists and not expired, else generate new token
  if (
    user.emailVerified.encryptedToken &&
    user.emailVerified.expiresIn > Date.now()
  ) {
    link = `${FRONTEND_URL}/verifyEmail?token=${decrypt(
      user.emailVerified.encryptedToken
    )}`;
    user.emailVerified.expiresIn = Date.now() + 3600000; // reset expiry
    await user.save();
  } else {
    const newToken = crypto.randomBytes(20).toString("hex");
    user.emailVerified.encryptedToken = encrypt(newToken);
    user.emailVerified.expiresIn = Date.now() + 3600000; // 1 hour
    await user.save();
    link = `${FRONTEND_URL}/verifyEmail?token=${newToken}`;
  }

  // Prepare email job data
  const emailJobData = {
    name: user.name,
    recipient: user.email,
    link: link,
  };

  // Add job to email queue
  try {
    await sendEmail("verifyEmail", emailJobData);
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
  if (!token) return res.status(400).send("Invalid request");
  const encryptedToken = encrypt(token);

  const user = await User.findOne(
    {
      "emailVerified.encryptedToken": encryptedToken,
      "emailVerified.expiresIn": { $gt: Date.now() }, //not expired
    },
    "emailVerified,"
  );

  if (!user) {
    logger.error(`Invalid or expired verification token: ${token}`);
    return res.status(400).send("Invalid or expired verification token");
  }

  console.log("Email verified!!");
  user.emailVerified.state = true; //set email verified to true
  user.emailVerified.hash = "";
  user.emailVerified.expiresIn = undefined;
  await user.save();

  res.status(200).json({ message: "Email Verified!" });
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
    logger.info(
      `Reset token generated for ${user.email}: ${resetToken} /n encrypted: ${user.resetPasswordEncryptedToken}`
    );
  }

  const link = `${FRONTEND_URL}/resetPassword?token=${resetToken}`; //production: change to domain

  let emailJobData = {
    name: user.name,
    recipient: user.email,
    link: link,
  };

  try {
    await sendEmail("resetPassword", emailJobData);
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
const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;

  console.log(`in resetpassword. token: ${token}`); //debugging

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
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExp = undefined;
  await user.save();
  logger.info(`Password reset to ${password}`);

  res.status(200).json({ message: "Password reset successfully!" });
};

//@desc get users own data
//@route GET /users/me
//@access Private
const getMyData = asyncHandler(async (req, res) => {
  const userId = req.user.id; //from verifyJWT
  const user = await User.findById(userId)
    .select("_id email phone role DOB name")
    .lean()
    .exec();
  if (!user) return res.status(204).json({ message: "No users found" });
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

  const updatedUser = await User.findOneAndUpdate({ _id: userId }, updates, {
    new: true,
    runValidators: true,
  }).select("_id email phone role DOB name");

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  logger.success(`User Updated! Invalidating User cache`);
  invalidateCache(req.url, req.user.id);
  return res.status(201).json(updatedUser);
});

//@desc returns booking documents with payment and booking details with filters and searching
//@param valid user jwt token
//@route GET /user/bookings
//@access Private
const getAllMyBookings = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  let page = parseInt(req.query.page, 10) || 1;
  if (page < 1) page = 1; // Ensure page is not less than 1
  const limit = parseInt(req.query.limit, 10) || 10;
  const {
    search,
    transactionRef,
    paymentStatus,
    startDate,
    endDate,
    location,
  } = req.query;
  const skip = (page - 1) * limit;

  const query = { userId };

  // Search by Booking ID (customerBookingId)
  if (search) {
    if (!isNaN(search)) {
      query.bookingId = parseInt(search, 10);
    } else {
      query.bookingId = -1; // No booking will have ID -1
    }
  }

  // Date filtering using startDate and endDate parameters
  if (startDate && endDate) {
    try {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Invalid date format provided." });
      }

      query.eventStartTime = { $gte: parsedStartDate, $lte: parsedEndDate };
    } catch (e) {
      logger.error(`Error parsing date parameters: ${e.message}`);
      return res.status(400).json({ message: "Invalid date parameters." });
    }
  }

  // Location filtering
  if (location && (location === "online" || location === "in-person")) {
    query["location.type"] = location;
  }

  const aggregatePipeline = [
    { $match: query }, // Initial match on booking fields
    {
      $lookup: {
        from: "payments",
        let: { pid: "$paymentId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
          {
            $project: {
              _id: 1,
              amount: 1,
              transactionStatus: 1,
              currency: 1,
              transactionReferenceNumber: 1, // Add this field to projection
            },
          },
        ],
        as: "payment",
      },
    },
    { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
  ];

  // Filter by payment transaction reference if provided
  if (transactionRef) {
    // Remove "T-" prefix if present
    const searchRefNumber = transactionRef.startsWith("T-")
      ? transactionRef.substring(2)
      : transactionRef;

    // Add a match stage for transaction reference number
    aggregatePipeline.push({
      $match: {
        $or: [
          { "payment.transactionReferenceNumber": searchRefNumber },
          {
            "payment.transactionReferenceNumber": new RegExp(
              searchRefNumber,
              "i"
            ),
          }, // Case insensitive search
        ],
      },
    });

    logger.debug(`Filtering by transaction reference: ${searchRefNumber}`);
  }

  // Filter by paymentStatus if provided
  if (paymentStatus) {
    aggregatePipeline.push({
      $match: { "payment.transactionStatus": paymentStatus },
    });
  }

  // Add sorting, $facet for pagination, and final $project
  aggregatePipeline.push(
    { $sort: { eventStartTime: -1 } },
    {
      $facet: {
        metadata: [{ $count: "totalBookings" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              eventStartTime: 1,
              eventEndTime: 1,
              bookingId: 1,
              status: 1,
              eventName: 1,
              location: 1,
              notes: 1,
              cancellation: 1,
              createdAt: 1,
              payment: 1,
            },
          },
        ],
      },
    },
    { $unwind: { path: "$metadata", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        totalBookings: { $ifNull: ["$metadata.totalBookings", 0] },
        bookings: "$data",
      },
    }
  );

  try {
    const [result] = await Booking.aggregate(aggregatePipeline).exec();

    const totalBookings = result?.totalBookings || 0;
    const bookings = result?.bookings || [];

    logger.debug(
      `Found ${bookings.length} bookings out of ${totalBookings} total for page ${page} with filters: search='${search}', transactionRef='${transactionRef}', paymentStatus='${paymentStatus}', startDate='${startDate}', endDate='${endDate}', location='${location}'`
    );

    res.json({
      page: page,
      limit,
      totalBookings,
      totalPages: Math.ceil(totalBookings / limit),
      bookings,
    });
  } catch (error) {
    logger.error(`Error fetching bookings: ${error.message}`);
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

module.exports = {
  getMyData,
  updateMyUser,
  verifyEmail,
  resendEvLink,
  forgotPassword,
  resetPassword,
  getAllMyBookings,
};
