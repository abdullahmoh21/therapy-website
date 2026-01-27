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
const JOB_NAMES = require("../jobNames");

module.exports = {
  // Email jobs - Authentication & Verification
  [JOB_NAMES.USER_ACCOUNT_VERIFICATION_EMAIL]: handleUserAccountVerificationEmail,
  [JOB_NAMES.USER_PASSWORD_RESET_EMAIL]: handleUserPasswordResetEmail,

  // Email jobs - Booking Cancellations 
  [JOB_NAMES.BOOKING_CANCELLATION_NOTIFICATIONS]: handleBookingCancellationNotifications,
  [JOB_NAMES.EVENT_DELETED_NOTIFICATION]: handleSessionDeletionNotification,
  [JOB_NAMES.UNAUTHORIZED_BOOKING_NOTIFICATION]: handleUnauthorizedBookingNotification,

  // Email jobs - Payments
  [JOB_NAMES.PAYMENT_REFUND_CONFIRMATION]: handlePaymentRefundConfirmation,

  // Email jobs - Other
  [JOB_NAMES.CONTACT_INQUIRY]: handleContactInquiry,
  [JOB_NAMES.USER_INVITATION_EMAIL]: handleUserInvitationEmail,
  [JOB_NAMES.SYSTEM_ALERT]: handleSystemAlert,

  // Non-email jobs - Calendar sync & management
  [JOB_NAMES.GOOGLE_CALENDAR_EVENT_SYNC]: handleGoogleCalendarSync,
  [JOB_NAMES.GOOGLE_CALENDAR_EVENT_DELETION]: handleGoogleCalendarDeletion,
  [JOB_NAMES.GOOGLE_CALENDAR_EVENT_CANCELLATION]: handleGoogleCalendarCancellation,
  [JOB_NAMES.CLIENT_CALENDAR_INVITATION]: handleClientCalendarInvitation,

  // Non-email jobs - System tasks
  [JOB_NAMES.RECURRING_BOOKING_BUFFER_REFRESH]: handleRecurringBookingBufferRefresh,
  [JOB_NAMES.DATABASE_CLEANUP]: handleDatabaseCleanup,
};
