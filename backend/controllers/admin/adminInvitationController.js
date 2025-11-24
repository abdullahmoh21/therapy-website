const Invitee = require("../../models/Invitee");
const User = require("../../models/User");
const asyncHandler = require("express-async-handler");
const { invalidateByEvent } = require("../../middleware/redisCaching");
const logger = require("../../logs/logger");
const crypto = require("crypto");
const { sendEmail } = require("../../utils/queue/index");
const mongoose = require("mongoose");

// Helper function to safely convert user ID to a valid string for MongoDB ObjectId
const safeObjectId = (id) => {
  if (!id) return null;

  // If it's already a string, return it
  if (typeof id === "string") return id;

  // If it's an ObjectId, convert to string
  if (id instanceof mongoose.Types.ObjectId) return id.toString();

  // If it's an object with toString method (like our test mock), use that
  if (typeof id === "object" && id.toString) return id.toString();

  // Otherwise return the original (let Mongoose handle any conversion errors)
  return id;
};

//@desc Get all invitations with filters
//@param {Object} req with valid role, optional search, role filter
//@route GET /admin/invitations
//@access Private (admin)
const getAllInvitations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || "";
  const role = req.query.role || "";

  if (page < 1 || limit < 1 || limit > 40) {
    return res.status(400).json({
      message:
        "Page and limit must be positive integers and limit should not exceed 40",
    });
  }

  try {
    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Build the search query
    const searchQuery = {};

    // Add search conditions for name or email
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } }, // Case-insensitive search on name
        { email: { $regex: search, $options: "i" } }, // Case-insensitive search on email
      ];
    }

    // Add role filter if provided
    if (role && ["admin", "user"].includes(role)) {
      searchQuery.role = role;
    }

    // Only show active invitations (not used and not expired)
    searchQuery.isUsed = false;
    searchQuery.expiresAt = { $gt: new Date() };

    // Retrieve invitations with pagination and filters
    const invitations = await Invitee.find(searchQuery)
      .skip(skip)
      .limit(limit)
      .select("name email token role accountType createdAt expiresAt")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Get the total number of documents for pagination info
    const totalInvitations = await Invitee.countDocuments(searchQuery);

    // Send paginated response
    res.status(200).json({
      page,
      limit,
      totalInvitations,
      totalPages: Math.ceil(totalInvitations / limit),
      invitations,
    });
  } catch (error) {
    logger.error(`Error retrieving invitations: ${error.message}`);
    res.status(500).json({
      message: "An error occurred while retrieving invitations",
      error: error.message,
    });
  }
});

//@desc Delete an invitation
//@param {Object} req with valid role and invitationId
//@route DELETE /admin/invitations/:invitationId
//@access Private (admin)
const deleteInvitation = asyncHandler(async (req, res) => {
  const invitationId = req.params.invitationId;

  if (!invitationId) {
    return res.status(400).json({ message: "Invitation ID is required" });
  }

  try {
    const result = await Invitee.findByIdAndDelete(invitationId);

    if (!result) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    await invalidateByEvent("invitation-deleted");

    logger.info(`Admin deleted invitation: ${invitationId}`);

    res.status(200).json({
      message: "Invitation deleted successfully",
      deletedInvitationId: invitationId,
    });
  } catch (error) {
    logger.error(`Error deleting invitation: ${error.message}`);
    res.status(500).json({ message: "Failed to delete invitation" });
  }
});

//@desc invite a user to register
//@param valid admin jwt token
//@route POST /admin/invite
//@access Private(admin)
const inviteUser = asyncHandler(async (req, res) => {
  try {
    const { email, name, accountType } = req.body;
    const adminId = safeObjectId(req.user.id);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (accountType !== "domestic" && accountType !== "international") {
      return res.status(400).json({
        message:
          "The field 'accountType' must be: 'domestic' or 'international'",
      });
    }

    const [existingUser, activeInvitation] = await Promise.all([
      User.findOne({ email }).lean().exec(),
      Invitee.findOne({
        email,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
        .lean()
        .exec(),
    ]);

    // Handle duplicates
    if (existingUser) {
      logger.warn(`Invitation attempt for existing user: ${email}`);
      return res.status(409).json({
        message: "User with this email already exists",
        code: "USER_EXISTS",
      });
    }

    // If there's already an active invitation, return its details
    if (activeInvitation) {
      return res.status(200).json({
        message: "Invitation already exists for this email",
        invitationId: activeInvitation._id,
        expiresAt: activeInvitation.expiresAt,
      });
    }

    // Generate invitation token
    const token = crypto.randomBytes(20).toString("hex");

    // Create new invitation record
    const invitation = await Invitee.create({
      email: email.toLowerCase(), // Ensure email is stored in lowercase
      name,
      accountType,
      token,
      invitedBy: adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Generate invitation URL
    const invitationUrl = `${
      process.env.FRONTEND_URL
    }/signup?invitation=${token}&email=${encodeURIComponent(email)}`;

    logger.info(`Created invitation for: ${email}, URL: ${invitationUrl}`);

    // Send invitation email
    try {
      await sendEmail("UserInvitationEmail", {
        inviteeId: invitation._id.toString(),
      });
      logger.info(`Invitation email sent successfully to: ${email}`);
      await invalidateByEvent("invitation-created");
    } catch (emailError) {
      logger.error(
        `Failed to send invitation email to ${email}: ${emailError.message}`
      );
      // Don't fail the invitation creation, just log the error
      return res.status(201).json({
        message:
          "Invitation created but email sending failed. Please contact the user directly.",
        invitationId: invitation._id,
        expiresAt: invitation.expiresAt,
        invitationUrl: invitationUrl,
        code: "INVITATION_CREATED_EMAIL_FAILED",
      });
    }

    // Success response
    res.status(201).json({
      message: "Invitation sent successfully",
      invitationId: invitation._id,
      expiresAt: invitation.expiresAt,
      invitationUrl: invitationUrl,
      code: "INVITATION_SENT",
    });
  } catch (error) {
    logger.error(
      `Error in inviteUser for email ${req.body?.email || "unknown"}: ${
        error.message
      }`,
      {
        stack: error.stack,
        adminId: req.user?.id,
      }
    );

    if (error.code === 11000) {
      logger.error(`Duplicate key error: ${error.message}`);
      return res.status(409).json({
        message: "An invitation for this email already exists.",
        code: "DUPLICATE_INVITATION",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid invitation data",
        code: "VALIDATION_ERROR",
        details: error.message,
      });
    }

    res.status(500).json({
      message: "Error creating invitation",
      code: "INTERNAL_ERROR",
    });
  }
});

//@desc resend invitation to user using invite ID
//@param valid admin jwt token and invite ID
//@route POST /admin/invitations/:invitationId/resend
//@access Private(admin)
const resendInvitation = asyncHandler(async (req, res) => {
  try {
    const { invitationId } = req.params;
    const adminId = safeObjectId(req.user.id);

    // Find existing invitee by ID
    const invitee = await Invitee.findById(invitationId).exec();

    if (!invitee) {
      return res
        .status(404)
        .json({ message: "No invitation found with this ID." });
    }

    let token = invitee.token;
    const now = new Date();

    // Check if the token is expired
    if (invitee.expiresAt <= now) {
      token = crypto.randomBytes(20).toString("hex");
      invitee.token = token;
    }

    // Update expiry date to 7 days from now
    invitee.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    invitee.invitedBy = adminId;
    await invitee.save();
    await invalidateByEvent("invitation-created");

    // Generate invitation URL
    const invitationUrl = `${
      process.env.FRONTEND_URL
    }/signup?invitation=${token}&email=${encodeURIComponent(invitee.email)}`;

    try {
      // Send invitation email
      await sendEmail("UserInvitationEmail", {
        inviteeId: invitee._id.toString(),
      });

      // Success response
      return res.status(200).json({
        message: "Invitation resent successfully",
        invitationUrl: invitationUrl,
      });
    } catch (emailError) {
      logger.error(`Failed to resend invitation email: ${emailError.message}`);
      return res.status(500).json({
        message: "Failed to send invitation email",
        error: emailError.message,
      });
    }
  } catch (error) {
    logger.error(`Unexpected error in resendInvitation: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = {
  inviteUser,
  getAllInvitations,
  deleteInvitation,
  resendInvitation,
};
