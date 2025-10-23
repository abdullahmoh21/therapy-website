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
const adminInitiatedCancellation = require("./adminInitiatedCancellation");
const syncCalendar = require("./syncCalendar");
const deleteCalendarEvent = require("./deleteCalendarEvent");
const addClientAttendee = require("./addClientAttendee");
const cancelGoogleCalendarEvent = require("./cancelGoogleCalendarEvent");

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
  adminInitiatedCancellation,
  syncCalendar,
  deleteCalendarEvent,
  addClientAttendee,
  cancelGoogleCalendarEvent,
};
