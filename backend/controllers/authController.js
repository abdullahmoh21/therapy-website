const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Booking = require("../models/Booking");
const asyncHandler = require("express-async-handler");
const { createHash } = require("crypto");
const crypto = require("crypto");
const { promisify } = require("util");
const jwtSignAsync = promisify(jwt.sign);
const logger = require("../logs/logger");
const { sendEmail } = require("../utils/queue/index");
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

  // Indexed, lean read (no doc hydration)
  const foundUser = await User.findOne(
    { email },
    { email: 1, role: 1, password: 1, emailVerified: 1 } // projection
  )
    .lean()
    .exec();

  if (!foundUser) {
    return res.status(401).json({ message: "Invalid login credentials" });
  }

  const match = await bcrypt.compare(password, foundUser.password);
  if (!match) {
    return res.status(401).json({ message: "Invalid login credentials" });
  }

  if (!foundUser.emailVerified?.state) {
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

  // Async signing avoids blocking the event loop
  const accessToken = await jwtSignAsync(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = await jwtSignAsync(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // Use fast SHA-256 for refresh token persistence (no bcrypt here)
  const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours in ms
  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  const refreshTokenExp = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  // Targeted atomic update; avoids doc save overhead
  await User.updateOne(
    { _id: foundUser._id },
    {
      $set: {
        refreshTokenHash,
        refreshTokenExp,
        lastLoginAt: new Date(),
      },
    }
  ).exec();

  // Fire-and-forget; if you want strict durability, await this
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

  // Verify the refresh JWT
  let userId;
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    userId = decoded.user.id;
  } catch (err) {
    return err.name === "TokenExpiredError" || err.message === "jwt expired"
      ? res.status(401).json({ message: "Refresh token expired" })
      : res.sendStatus(500);
  }

  if (!userId) return res.sendStatus(403); // Forbidden, userId not found in token

  // Minimal, lean read (no doc hydration)
  const foundUser = await User.findById(
    userId,
    "_id email role refreshTokenHash refreshTokenExp"
  )
    .lean()
    .exec();

  if (!foundUser) return res.sendStatus(403); // Forbidden, user not found

  // Server-side TTL guard (independent of JWT's own exp)
  if (
    foundUser.refreshTokenExp &&
    new Date(foundUser.refreshTokenExp).getTime() < Date.now()
  ) {
    return res.status(401).json({ message: "Refresh token expired" });
  }

  // Hash the presented refresh token with SHA-256 and compare (no bcrypt here)
  const presentedHash = createHash("sha256").update(refreshToken).digest("hex");
  if (presentedHash !== foundUser.refreshTokenHash) {
    return res.sendStatus(403); // Forbidden, token mismatch
  }

  // Async sign to avoid blocking the event loop
  const accessToken = await new Promise((resolve, reject) => {
    jwt.sign(
      {
        user: {
          email: foundUser.email,
          role: foundUser.role,
          id: foundUser._id,
        },
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
      (err, token) => (err ? reject(err) : resolve(token))
    );
  });

  res.json({ accessToken });
});

//@desc Create a new user based on admin invitation
//@param {Object} req with valid registration details and invitation token
//@route POST /auth/register
//@access Public
const register = async (req, res) => {
  let createdUser = null;
  let markedInvitation = null;

  try {
    const { email, password, name, DOB, phone, token } = req.body;

    // Enhanced validation with better error messages
    if (!email || !password || !name || !DOB || !phone || !token) {
      const missing = [];
      if (!email) missing.push("email");
      if (!password) missing.push("password");
      if (!name) missing.push("name");
      if (!DOB) missing.push("DOB");
      if (!phone) missing.push("phone");
      if (!token) missing.push("invitation token");

      logger.warn(
        `Registration attempt with missing fields: ${missing.join(
          ", "
        )} for email: ${email || "unknown"}`
      );
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
        code: "MISSING_FIELDS",
      });
    }

    // Normalize inputs consistently
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedToken = token.trim();

    // Step 1: Check for duplicates first (before any mutations)
    const duplicate = await checkForDuplicates(normalizedEmail, phone);
    if (duplicate) {
      logger.warn(
        `Registration attempt for existing user - email: ${normalizedEmail}, phone: ${phone}`
      );
      return res.status(409).json({
        message: `An account with this ${
          duplicate.email === normalizedEmail ? "email" : "phone number"
        } already exists.`,
        code: "DUPLICATE_USER",
      });
    }

    // Step 2: Check invitation validity (before any mutations)
    const invitation = await checkInvitation(normalizedEmail, normalizedToken);
    if (!invitation) {
      logger.warn(
        `Registration failed: Invalid invitation for ${normalizedEmail}`
      );
      return res.status(400).json({
        message:
          "Invalid or expired invitation. Please contact an administrator.",
        code: "INVALID_INVITATION",
      });
    }

    // Step 3: Mark invitation as used FIRST (atomic operation)
    markedInvitation = await markInvitationAsUsed(
      normalizedEmail,
      normalizedToken
    );
    if (!markedInvitation) {
      logger.warn(`Failed to mark invitation as used for ${normalizedEmail}`);
      return res.status(400).json({
        message: "Invitation may have already been used or expired.",
        code: "INVITATION_ALREADY_USED",
      });
    }

    // Step 4: Create user (if this fails, we need to rollback invitation)
    const accountType = invitation.accountType;
    const verificationToken = crypto.randomBytes(20).toString("hex");

    try {
      createdUser = await createUser({
        email: normalizedEmail,
        password,
        name,
        DOB,
        phone,
        verificationToken,
        accountType,
      });
    } catch (userCreationError) {
      // Rollback invitation marking
      await rollbackInvitationMarking(markedInvitation._id);
      throw userCreationError;
    }

    // Step 5: Send verification email (non-critical, don't rollback if this fails)
    let emailSent = false;
    try {
      await sendEmail("UserAccountVerificationEmail", {
        userId: createdUser._id.toString(),
        verificationToken,
      });
      emailSent = true;
      logger.info(
        `Verification email sent to ${normalizedEmail} during registration`
      );
    } catch (emailError) {
      logger.error(
        `Error sending verification email to '${normalizedEmail}' during registration: ${emailError.message}`
      );
    }

    // Step 6: Cache invalidation (non-critical)
    try {
      await invalidateByEvent("user-registered", {
        userId: createdUser._id,
        email: normalizedEmail,
      });
    } catch (cacheError) {
      logger.error(
        `Error invalidating cache for '${normalizedEmail}': ${cacheError.message}`
      );
    }

    return res.status(201).json({
      message: emailSent
        ? "User created successfully. Check your email for verification link"
        : "User created successfully, but there was an issue sending the verification email.",
      code: "REGISTRATION_SUCCESS",
    });
  } catch (error) {
    logger.error(
      `Registration error for email ${req.body?.email || "unknown"}: ${
        error.message
      }`,
      {
        stack: error.stack,
        email: req.body?.email,
        name: req.body?.name,
      }
    );

    // Rollback logic without transactions
    if (createdUser && markedInvitation) {
      // Both operations succeeded but something else failed - rollback both
      try {
        await Promise.all([
          rollbackUserCreation(createdUser.email),
          rollbackInvitationMarking(markedInvitation._id),
        ]);
        logger.info(
          `Successfully rolled back user and invitation for ${createdUser.email}`
        );
      } catch (rollbackError) {
        logger.error(
          `Critical: Failed to rollback registration for ${createdUser.email}: ${rollbackError.message}`
        );
      }
    } else if (markedInvitation && !createdUser) {
      // Only invitation was marked but user creation failed - rollback invitation
      try {
        await rollbackInvitationMarking(markedInvitation._id);
        logger.info(
          `Successfully rolled back invitation marking for ${req.body?.email}`
        );
      } catch (rollbackError) {
        logger.error(
          `Critical: Failed to rollback invitation marking: ${rollbackError.message}`
        );
      }
    }

    // Handle specific error types
    if (error.code === 11000) {
      logger.error(`Duplicate key error during registration: ${error.message}`);
      return res.status(409).json({
        message: "An account with this email or phone number already exists.",
        code: "DUPLICATE_USER",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid data provided",
        code: "VALIDATION_ERROR",
        details: error.message,
      });
    }

    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongoTimeoutError"
    ) {
      return res.status(503).json({
        message: "Database connection issue. Please try again.",
        code: "DATABASE_ERROR",
      });
    }

    // Generic server error
    return res.status(500).json({
      message: "Error during registration. Please try again.",
      code: "INTERNAL_ERROR",
    });
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

const rollbackInvitationMarking = async (invitationId) => {
  try {
    await Invitee.findByIdAndUpdate(invitationId, {
      isUsed: false,
      usedAt: null,
    });
    logger.info(`Rolled back invitation marking for ID: ${invitationId}`);
  } catch (rollbackError) {
    logger.error(
      `Error rolling back invitation marking: ${rollbackError.message}`
    );
    throw rollbackError;
  }
};

const checkInvitation = async (email, token) => {
  try {
    // Normalize email to lowercase to ensure consistent comparison
    const normalizedEmail = email.toLowerCase().trim();

    const invitation = await Invitee.findOne({
      email: normalizedEmail,
      token: token.trim(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      const existingInvitation = await Invitee.findOne({
        email: normalizedEmail,
        token: token.trim(),
      });

      if (existingInvitation) {
        if (existingInvitation.isUsed) {
          logger.warn(
            `Invitation for ${normalizedEmail} has already been used at ${existingInvitation.usedAt}`
          );
        } else if (existingInvitation.expiresAt <= new Date()) {
          logger.warn(
            `Invitation for ${normalizedEmail} has expired at ${existingInvitation.expiresAt}`
          );
        }
      } else {
        logger.warn(
          `No matching invitation found for ${normalizedEmail} with provided token`
        );
      }
    }

    return invitation;
  } catch (error) {
    logger.error(`Error checking invitation: ${error.message}`);
    throw error;
  }
};

const markInvitationAsUsed = async (email, token) => {
  try {
    // Normalize email and token consistently
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedToken = token.trim();

    // Store the expiration check time to ensure consistency
    const now = new Date();

    const result = await Invitee.findOneAndUpdate(
      {
        email: normalizedEmail,
        token: normalizedToken,
        isUsed: false,
        expiresAt: { $gt: now }, // Add expiration check here to be consistent
      },
      {
        isUsed: true,
        usedAt: now,
      },
      { new: true } // Return the updated document
    );

    if (!result) {
      logger.warn(
        `Failed to mark invitation as used for ${normalizedEmail} - invitation may have expired or been used`
      );

      // Additional diagnostic query
      const existingInvite = await Invitee.findOne({
        email: normalizedEmail,
        token: normalizedToken,
      });

      if (existingInvite) {
        logger.warn(
          `Diagnostic: Found invitation but couldn't mark as used. ` +
            `isUsed: ${existingInvite.isUsed}, ` +
            `expired: ${existingInvite.expiresAt <= now}, ` +
            `expiresAt: ${existingInvite.expiresAt}`
        );
      }
    } else {
      logger.info(
        `Successfully marked invitation as used for ${normalizedEmail}`
      );
    }

    return result;
  } catch (error) {
    logger.error(`Error marking invitation as used: ${error.message}`);
    throw error;
  }
};

// ---------------- END OF REGISTER HELPER FUNCTIONS ----------------- //

module.exports = {
  login,
  refresh,
  register,
  logout,
  // Export these helper functions for testing purposes
  checkForDuplicates,
  checkInvitation,
  createUser,
  markInvitationAsUsed,
  rollbackUserCreation,
  rollbackInvitationMarking,
};
