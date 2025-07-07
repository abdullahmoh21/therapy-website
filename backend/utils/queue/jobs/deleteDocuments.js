const logger = require("../../../logs/logger");
const User = require("../../../models/User");
const Invitee = require("../../../models/Invitee");
const Booking = require("../../../models/Booking");
const Payment = require("../../../models/Payment");

const deleteDocuments = async (job) => {
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
        return;
    }

    await modelInstance.deleteMany({ _id: { $in: documentIds } });
    logger.info(
      `Successfully deleted documents from ${model} with IDs: ${documentIds}`
    );
  } catch (error) {
    logger.error(`Error deleting documents from ${job.data.model}: ${error}`);
    throw error;
  }
};

module.exports = deleteDocuments;
