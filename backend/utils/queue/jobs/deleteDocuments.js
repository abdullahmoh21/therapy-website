const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Invitee = require("../../../models/Invitee");
const Booking = require("../../../models/Booking");
const Payment = require("../../../models/Payment");

/**
 * Handle database cleanup - bulk delete documents
 * Used for cleaning up orphaned or expired records
 *
 * @param {Object} job - BullMQ job object
 * @param {string[]} job.data.documentIds - Array of MongoDB IDs to delete
 * @param {string} job.data.model - Model name ('User', 'Booking', 'Payment', 'Invitee')
 */
const handleDatabaseCleanup = async (job) => {
  try {
    const { documentIds, model } = job.data;

    let modelInstance;
    switch (model) {
      case "User":
        modelInstance = User;
        break;
      case "Booking":
        modelInstance = Booking;
        break;
      case "Payment":
        modelInstance = Payment;
        break;
      case "Invitee":
        modelInstance = Invitee;
        break;
      default:
        logger.error(`Unknown model: ${model}`);
        throw new Error(`Unknown model: ${model}`);
    }

    await modelInstance.deleteMany({ _id: { $in: documentIds } });
    logger.info(
      `Successfully deleted ${documentIds.length} documents from ${model}`
    );
  } catch (error) {
    logger.error(
      `Error deleting documents from ${job.data.model}: ${error.message}`
    );
    throw error;
  }
};

module.exports = handleDatabaseCleanup;
