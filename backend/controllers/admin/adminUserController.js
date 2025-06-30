const User = require("../../models/User");
const asyncHandler = require("express-async-handler");
const logger = require("../../logs/logger");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const { invalidateByEvent } = require("../../middleware/redisCaching");
const Joi = require("joi");
const { emailSchema } = require("../../utils/validation/ValidationSchemas");

//@desc Get all users
//@param {Object} req with valid role
//@route GET /admin/users
//@access Private
const getAllUsers = asyncHandler(async (req, res) => {
  // Retrieve pagination parameters from the query string
  const page = parseInt(req.query.page, 10) || 1; // Default to page 1
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
  const search = req.query.search || ""; // Get search term from query params

  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 40) {
    return res.status(400).json({
      message:
        "Page and limit must be positive integers and limit should not exceed 40",
    });
  }

  try {
    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Create search query if search parameter exists
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } }, // Case-insensitive search on name
            { email: { $regex: search, $options: "i" } }, // Case-insensitive search on email
          ],
        }
      : {};

    // Add role filter if provided
    if (req.query.role && ["admin", "user"].includes(req.query.role)) {
      searchQuery.role = req.query.role;
    }

    const users = await User.find(searchQuery)
      .select("email name phone role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Get the total number of documents for pagination info
    const totalUsers = await User.countDocuments(searchQuery);

    // Send paginated response
    res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    // Handle any errors that occurred during the query
    logger.error(`Error retrieving users: ${error.message}`);
    res
      .status(500)
      .json({ message: "An error occurred while retrieving users", error });
  }
});

//@desc Delete a user
//@param {Object} req with valid role and email
//@route DELETE /admin/users/:userId
//@access Private
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const [bookings, payments, user] = await Promise.all([
      Booking.deleteMany({ userId }),
      Payment.deleteMany({ userId }),
      User.deleteOne({ _id: userId }),
    ]);

    logger.debug(
      `User deletion count: ${user.deletedCount}\nBooking deleted count: ${bookings.deletedCount}\nPayment deleted count: ${payments.deletedCount}`
    );

    await invalidateByEvent("user-deleted", { userId });
    await invalidateByEvent("admin-data-changed");

    // Return proper success response with message
    res.status(200).json({
      message: "User deleted successfully",
      deletedCount: user.deletedCount,
    });
  } catch (error) {
    logger.error(`Error deleting user: ${error}`);
    res.status(500).json({ message: "Error deleting user" });
  }
});

//@desc Update a user
//@param {Object} req with valid role and userId
//@route PATCH /admin/users/:userId
//@access Private
const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const { name, email, role, accountType } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch current user for email comparison
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create an update object with only the provided fields
    const updateData = {};

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res
          .status(400)
          .json({ message: "Name must be a non-empty string" });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const { error } = emailSchema.validate({ email });

      if (error) {
        return res.status(400).json({
          message: "Invalid email format",
          details: error.details[0].message,
        });
      }

      updateData.email = email;

      if (currentUser.email !== email) {
        updateData["emailVerified.state"] = false;
        updateData["emailVerified.encryptedToken"] = undefined;
        updateData["emailVerified.expiresIn"] = undefined;
      }
    }

    // Validate role if provided
    if (role !== undefined) {
      if (!["admin", "user"].includes(role)) {
        return res
          .status(400)
          .json({ message: "Role must be either 'admin' or 'user'" });
      }
      updateData.role = role;
    }

    // Validate accountType if provided
    if (accountType !== undefined) {
      if (!["domestic", "international"].includes(accountType)) {
        return res.status(400).json({
          message: "Account type must be either 'domestic' or 'international'",
        });
      }
      updateData.accountType = accountType;
    }

    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("name email role accountType emailVerified");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await invalidateByEvent("user-updated", { userId });
    await invalidateByEvent("admin-data-changed");

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    logger.error(`Error updating user: ${error}`);
    res.status(500).json({ message: "Error updating user" });
  }
});

//@desc Get user details by ID
//@param {Object} req with valid role and userId
//@route GET /admin/users/:userId
//@access Private
const getUserDetails = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(userId)
      .select(
        "email emailVerified.state role phone name DOB accountType createdAt updatedAt lastLoginAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error fetching user details: ${error}`);
    res.status(500).json({ message: "Error fetching user details" });
  }
});

module.exports = {
  getAllUsers,
  deleteUser,
  updateUser,
  getUserDetails,
};
