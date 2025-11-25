// Import refactored job handlers with clear, descriptive names
const handleUserAccountVerificationEmail = require("./verifyEmail");
const handleUserPasswordResetEmail = require("./resetPassword");
const handleBookingCancellationNotifications = require("./handleBookingCancellationNotifications");
const handlePaymentRefundConfirmation = require("./refundConfirmation");
const handleContactInquiry = require("./ContactMe");
const handleDatabaseCleanup = require("./deleteDocuments");
const handleUserInvitationEmail = require("./sendInvitation");
const handleSessionDeletionNotification = require("./eventDeleted");
const handleUnauthorizedBookingNotification = require("./unauthorizedBooking");
const handleSystemAlert = require("./adminAlert");
const handleGoogleCalendarSync = require("./syncCalendar");
const handleGoogleCalendarDeletion = require("./deleteCalendarEvent");
const handleClientCalendarInvitation = require("./addClientAttendee");
const handleGoogleCalendarCancellation = require("./cancelGoogleCalendarEvent");
const handleRecurringBookingBufferRefresh = require("./refreshRecurringBuffer");

module.exports = {
  // Email jobs - Authentication & Verification
  UserAccountVerificationEmail: handleUserAccountVerificationEmail,
  UserPasswordResetEmail: handleUserPasswordResetEmail,

  // Email jobs - Booking Cancellations (consolidated)
  BookingCancellationNotifications: handleBookingCancellationNotifications,
  EventDeletedNotification: handleSessionDeletionNotification,
  UnauthorizedBookingNotification: handleUnauthorizedBookingNotification,

  // Email jobs - Payments
  PaymentRefundConfirmation: handlePaymentRefundConfirmation,

  // Email jobs - Other
  ContactInquiry: handleContactInquiry,
  UserInvitationEmail: handleUserInvitationEmail,
  SystemAlert: handleSystemAlert,

  // Non-email jobs - Calendar sync & management
  GoogleCalendarEventSync: handleGoogleCalendarSync,
  GoogleCalendarEventDeletion: handleGoogleCalendarDeletion,
  GoogleCalendarEventCancellation: handleGoogleCalendarCancellation,
  ClientCalendarInvitation: handleClientCalendarInvitation,
  handleClientCalendarInvitation: handleClientCalendarInvitation, // Backwards compatibility alias

  // Non-email jobs - System tasks
  RecurringBookingBufferRefresh: handleRecurringBookingBufferRefresh,
  DatabaseCleanup: handleDatabaseCleanup,
};
