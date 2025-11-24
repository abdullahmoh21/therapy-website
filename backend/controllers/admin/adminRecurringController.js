const asyncHandler = require("express-async-handler");
const logger = require("../../logs/logger");
const { addJob } = require("../../utils/queue/index");
const User = require("../../models/User");

//@desc Manually trigger recurring buffer maintenance for all users (for testing)
//@param {Object} req with valid admin role
//@route POST /admin/recurring/maintain-buffer
//@access Private (Admin only)
const triggerBufferMaintenance = asyncHandler(async (req, res) => {
  logger.info("Manual buffer maintenance triggered by admin");

  try {
    // Find all recurring users
    const recurringUsers = await User.find({
      "recurring.state": true,
    }).select("_id name email recurring");

    if (recurringUsers.length === 0) {
      return res.status(200).json({
        message: "No recurring users found",
        count: 0,
      });
    }

    logger.info(`Found ${recurringUsers.length} recurring users to process`);

    // Queue a buffer refresh job for each user
    const results = {
      total: recurringUsers.length,
      queued: 0,
      failed: 0,
    };

    for (const user of recurringUsers) {
      try {
        await addJob(
          "refreshRecurringBuffer",
          { userId: user._id.toString() },
          { priority: 1 } // High priority for manual triggers
        );
        results.queued++;
        logger.debug(
          `Queued buffer refresh for user ${user._id} (${user.name})`
        );
      } catch (error) {
        results.failed++;
        logger.error(
          `Failed to queue buffer refresh for user ${user._id}: ${error.message}`
        );
      }
    }

    res.status(200).json({
      message: "Buffer maintenance jobs queued successfully",
      results,
    });
  } catch (error) {
    logger.error(`Error in manual buffer maintenance: ${error.message}`);
    res.status(500).json({
      message: "Failed to queue buffer maintenance jobs",
      error: error.message,
    });
  }
});

//@desc Manually trigger buffer refresh for a specific user (for testing)
//@param {Object} req with valid admin role and userId
//@route POST /admin/recurring/:userId/refresh-buffer
//@access Private (Admin only)
const triggerUserBufferRefresh = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  logger.info(`Manual buffer refresh triggered for user ${userId}`);

  try {
    // Verify user is recurring
    const user = await User.findOne({
      _id: userId,
      "recurring.state": true,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found or not in recurring mode",
      });
    }

    // Queue the refresh job with immediate execution
    await addJob(
      "refreshRecurringBuffer",
      { userId: userId.toString() },
      { priority: 10 } // Highest priority
    );

    logger.info(`Queued buffer refresh job for user ${userId}`);

    res.status(200).json({
      message: `Buffer refresh queued for user ${user.name}`,
      userId,
      nextScheduledRefresh: user.recurring.nextBufferRefresh,
    });
  } catch (error) {
    logger.error(
      `Error queuing buffer refresh for user ${userId}: ${error.message}`
    );
    res.status(500).json({
      message: "Failed to queue buffer refresh",
      error: error.message,
    });
  }
});

module.exports = {
  triggerBufferMaintenance,
  triggerUserBufferRefresh,
};
