const crypto = require("crypto");

function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function getJobUniqueId(jobName, jobData) {
  let stableKey;

  switch (jobName) {
    case "verifyEmail":
    case "resetPassword":
    case "sendInvitation":
      stableKey = jobData.recipient;
      break;
    case "adminCancellationNotif":
    case "refundConfirmation":
      stableKey = jobData.payment?._id || jobData.payment?.id;
      break;
    case "ContactMe":
      stableKey = `${jobData.email}:${crypto
        .createHash("md5")
        .update(jobData.message)
        .digest("hex")}`;
      break;
    case "deleteDocuments":
      stableKey = `${jobData.model}:${jobData.documentIds.sort().join(",")}`;
      break;
    case "adminAlert":
      stableKey = `${jobData.alertType}:${Date.now()}`;
      break;
    case "eventDeleted":
    case "unauthorizedBooking":
    case "userCancellation":
      stableKey = jobData.recipient || jobData.calendlyEmail;
      break;
    case "syncCalendar":
      stableKey = jobData.bookingId;
      break;
    default:
      stableKey = stableStringify(jobData);
  }

  return `${jobName}:${crypto
    .createHash("sha256")
    .update(String(stableKey))
    .digest("hex")}`;
}

module.exports = { stableStringify, getJobUniqueId };
