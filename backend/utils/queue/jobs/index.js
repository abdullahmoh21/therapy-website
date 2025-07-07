const verifyEmail = require("./verifyEmail");
const resetPassword = require("./resetPassword");
const adminCancellationNotif = require("./adminCancellationNotif");
const refundConfirmation = require("./refundConfirmation");
const ContactMe = require("./ContactMe");
const deleteDocuments = require("./deleteDocuments");
const sendInvitation = require("./sendInvitation");
const eventDeleted = require("./eventDeleted");
const unauthorizedBooking = require("./unauthorizedBooking");
const adminAlert = require("./adminAlert");
const userCancellation = require("./userCancellation");

module.exports = {
  verifyEmail,
  resetPassword,
  adminCancellationNotif,
  refundConfirmation,
  ContactMe,
  deleteDocuments,
  sendInvitation,
  eventDeleted,
  unauthorizedBooking,
  adminAlert,
  userCancellation,
};
