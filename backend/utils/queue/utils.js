const crypto = require("crypto");

function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function getJobUniqueId(jobName, jobData) {
  let stableKey;

  switch (jobName) {
    // Email jobs - Authentication & Verification
    case "UserAccountVerificationEmail":
    case "UserPasswordResetEmail":
      stableKey = jobData.recipient;
      break;
    case "UserInvitationEmail":
      stableKey = jobData.inviteeId;
      break;

    // Email jobs - Booking Cancellations
    case "BookingCancellationNotifications":
      stableKey = jobData.payment?._id || jobData.payment?.id || jobData.recipient;
      break;
    case "EventDeletedNotification":
    case "UnauthorizedBookingNotification":
      stableKey = jobData.recipient || jobData.calendlyEmail;
      break;

    // Email jobs - Payments
    case "PaymentRefundConfirmation":
      stableKey = jobData.payment?._id || jobData.payment?.id;
      break;

    // Email jobs - Other
    case "ContactInquiry":
      stableKey = `${jobData.email}-${crypto
        .createHash("md5")
        .update(jobData.message)
        .digest("hex")}`;
      break;
    case "SystemAlert":
      stableKey = `${jobData.alertType}-${Date.now()}`;
      break;

    // Non-email jobs - Calendar sync & management
    case "GoogleCalendarEventSync":
      stableKey = jobData.bookingId;
      break;
    case "GoogleCalendarEventDeletion":
    case "GoogleCalendarEventCancellation":
      stableKey = jobData.eventId || jobData.bookingId;
      break;
    case "ClientCalendarInvitation":
      stableKey = jobData.bookingId || jobData.eventId;
      break;

    // Non-email jobs - System tasks
    case "RecurringBookingBufferRefresh":
      stableKey = jobData.recurringId || jobData.bookingId;
      break;
    case "DatabaseCleanup":
      stableKey = `${jobData.model}-${jobData.documentIds.sort().join(",")}`;
      break;

    default:
      stableKey = stableStringify(jobData);
  }

  return `${jobName}-${crypto
    .createHash("sha256")
    .update(String(stableKey))
    .digest("hex")}`;
}

module.exports = { stableStringify, getJobUniqueId };
