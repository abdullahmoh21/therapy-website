const { getJobUniqueId, stableStringify } = require("../../../utils/queue/utils");
const JOB_NAMES = require("../../../utils/queue/jobNames");

describe("Queue Utils - getJobUniqueId", () => {
  describe("Job Name Coverage", () => {
    it("should have explicit case handling for all job names in JOB_NAMES constant", () => {
      // This test ensures we don't have mismatched job names between JOB_NAMES and getJobUniqueId switch cases
      const allJobNames = Object.values(JOB_NAMES);
      const failedJobs = [];

      allJobNames.forEach((jobName) => {
        // Create minimal test data for each job type
        const testData = getTestDataForJob(jobName);
        
        try {
          const jobId = getJobUniqueId(jobName, testData);
          
          // Job ID should start with the job name (not fall through to default with stringified data)
          if (!jobId.startsWith(`${jobName}-`)) {
            failedJobs.push({
              jobName,
              issue: `Job ID doesn't start with job name. Got: ${jobId}`,
            });
          }

          // Job ID should not contain colons (BullMQ restriction)
          if (jobId.includes(":")) {
            failedJobs.push({
              jobName,
              issue: `Job ID contains colon which is not allowed by BullMQ: ${jobId}`,
            });
          }
        } catch (error) {
          failedJobs.push({
            jobName,
            issue: `Error generating job ID: ${error.message}`,
          });
        }
      });

      if (failedJobs.length > 0) {
        console.error("Failed job name validations:");
        failedJobs.forEach((fail) => {
          console.error(`  - ${fail.jobName}: ${fail.issue}`);
        });
      }

      expect(failedJobs).toHaveLength(0);
    });

    it("should not allow colons in any generated job IDs", () => {
      const allJobNames = Object.values(JOB_NAMES);
      const jobsWithColons = [];

      allJobNames.forEach((jobName) => {
        const testData = getTestDataForJob(jobName);
        const jobId = getJobUniqueId(jobName, testData);

        if (jobId.includes(":")) {
          jobsWithColons.push({ jobName, jobId });
        }
      });

      if (jobsWithColons.length > 0) {
        console.error("Job IDs with colons (not allowed by BullMQ):");
        jobsWithColons.forEach((job) => {
          console.error(`  - ${job.jobName}: ${job.jobId}`);
        });
      }

      expect(jobsWithColons).toHaveLength(0);
    });

    it("should generate consistent job IDs for the same input", () => {
      const jobName = JOB_NAMES.CONTACT_INQUIRY;
      const jobData = {
        email: "test@example.com",
        message: "Test message",
        name: "Test User",
      };

      const jobId1 = getJobUniqueId(jobName, jobData);
      const jobId2 = getJobUniqueId(jobName, jobData);

      expect(jobId1).toBe(jobId2);
    });

    it("should generate different job IDs for different input", () => {
      const jobName = JOB_NAMES.CONTACT_INQUIRY;
      const jobData1 = {
        email: "test1@example.com",
        message: "Message 1",
      };
      const jobData2 = {
        email: "test2@example.com",
        message: "Message 2",
      };

      const jobId1 = getJobUniqueId(jobName, jobData1);
      const jobId2 = getJobUniqueId(jobName, jobData2);

      expect(jobId1).not.toBe(jobId2);
    });
  });

  describe("Specific Job Types", () => {
    it("should generate job ID for UserAccountVerificationEmail", () => {
      const jobId = getJobUniqueId(JOB_NAMES.USER_ACCOUNT_VERIFICATION_EMAIL, {
        recipient: "user@example.com",
      });

      expect(jobId).toMatch(/^UserAccountVerificationEmail-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for UserPasswordResetEmail", () => {
      const jobId = getJobUniqueId(JOB_NAMES.USER_PASSWORD_RESET_EMAIL, {
        recipient: "user@example.com",
      });

      expect(jobId).toMatch(/^UserPasswordResetEmail-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for BookingCancellationNotifications", () => {
      const jobId = getJobUniqueId(JOB_NAMES.BOOKING_CANCELLATION_NOTIFICATIONS, {
        payment: { _id: "507f1f77bcf86cd799439011" },
        recipient: "user@example.com",
      });

      expect(jobId).toMatch(/^BookingCancellationNotifications-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for EventDeletedNotification", () => {
      const jobId = getJobUniqueId(JOB_NAMES.EVENT_DELETED_NOTIFICATION, {
        recipient: "user@example.com",
      });

      expect(jobId).toMatch(/^EventDeletedNotification-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for UnauthorizedBookingNotification", () => {
      const jobId = getJobUniqueId(JOB_NAMES.UNAUTHORIZED_BOOKING_NOTIFICATION, {
        calendlyEmail: "user@example.com",
      });

      expect(jobId).toMatch(/^UnauthorizedBookingNotification-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for PaymentRefundConfirmation", () => {
      const jobId = getJobUniqueId(JOB_NAMES.PAYMENT_REFUND_CONFIRMATION, {
        payment: { id: "payment_123" },
      });

      expect(jobId).toMatch(/^PaymentRefundConfirmation-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for ContactInquiry", () => {
      const jobId = getJobUniqueId(JOB_NAMES.CONTACT_INQUIRY, {
        email: "contact@example.com",
        message: "Hello, I have a question",
      });

      expect(jobId).toMatch(/^ContactInquiry-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for UserInvitationEmail", () => {
      const jobId = getJobUniqueId(JOB_NAMES.USER_INVITATION_EMAIL, {
        inviteeId: "507f1f77bcf86cd799439011",
      });

      expect(jobId).toMatch(/^UserInvitationEmail-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for SystemAlert", () => {
      const jobId = getJobUniqueId(JOB_NAMES.SYSTEM_ALERT, {
        alertType: "critical",
        message: "System error occurred",
      });

      expect(jobId).toMatch(/^SystemAlert-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for GoogleCalendarEventSync", () => {
      const jobId = getJobUniqueId(JOB_NAMES.GOOGLE_CALENDAR_EVENT_SYNC, {
        bookingId: "507f1f77bcf86cd799439011",
      });

      expect(jobId).toMatch(/^GoogleCalendarEventSync-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for GoogleCalendarEventDeletion", () => {
      const jobId = getJobUniqueId(JOB_NAMES.GOOGLE_CALENDAR_EVENT_DELETION, {
        eventId: "event_123",
      });

      expect(jobId).toMatch(/^GoogleCalendarEventDeletion-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for GoogleCalendarEventCancellation", () => {
      const jobId = getJobUniqueId(JOB_NAMES.GOOGLE_CALENDAR_EVENT_CANCELLATION, {
        bookingId: "507f1f77bcf86cd799439011",
      });

      expect(jobId).toMatch(/^GoogleCalendarEventCancellation-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for ClientCalendarInvitation", () => {
      const jobId = getJobUniqueId(JOB_NAMES.CLIENT_CALENDAR_INVITATION, {
        bookingId: "507f1f77bcf86cd799439011",
      });

      expect(jobId).toMatch(/^ClientCalendarInvitation-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for RecurringBookingBufferRefresh", () => {
      const jobId = getJobUniqueId(JOB_NAMES.RECURRING_BOOKING_BUFFER_REFRESH, {
        recurringId: "507f1f77bcf86cd799439011",
      });

      expect(jobId).toMatch(/^RecurringBookingBufferRefresh-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });

    it("should generate job ID for DatabaseCleanup", () => {
      const jobId = getJobUniqueId(JOB_NAMES.DATABASE_CLEANUP, {
        model: "User",
        documentIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
      });

      expect(jobId).toMatch(/^DatabaseCleanup-[a-f0-9]{64}$/);
      expect(jobId).not.toContain(":");
    });
  });

  describe("stableStringify", () => {
    it("should produce consistent output for same object regardless of key order", () => {
      const obj1 = { b: 2, a: 1, c: 3 };
      const obj2 = { a: 1, c: 3, b: 2 };

      const result1 = stableStringify(obj1);
      const result2 = stableStringify(obj2);

      expect(result1).toBe(result2);
      expect(result1).toBe('{"a":1,"b":2,"c":3}');
    });

    it("should handle objects with same keys in different order consistently", () => {
      const obj1 = {
        z: "last",
        a: "first",
      };
      const obj2 = {
        a: "first",
        z: "last",
      };

      const result1 = stableStringify(obj1);
      const result2 = stableStringify(obj2);

      expect(result1).toBe(result2);
    });
  });
});

/**
 * Helper function to generate appropriate test data for each job type
 */
function getTestDataForJob(jobName) {
  switch (jobName) {
    case JOB_NAMES.USER_ACCOUNT_VERIFICATION_EMAIL:
    case JOB_NAMES.USER_PASSWORD_RESET_EMAIL:
      return { recipient: "test@example.com" };

    case JOB_NAMES.USER_INVITATION_EMAIL:
      return { inviteeId: "507f1f77bcf86cd799439011" };

    case JOB_NAMES.BOOKING_CANCELLATION_NOTIFICATIONS:
      return {
        payment: { _id: "507f1f77bcf86cd799439011" },
        recipient: "test@example.com",
      };

    case JOB_NAMES.EVENT_DELETED_NOTIFICATION:
    case JOB_NAMES.UNAUTHORIZED_BOOKING_NOTIFICATION:
      return { recipient: "test@example.com" };

    case JOB_NAMES.PAYMENT_REFUND_CONFIRMATION:
      return { payment: { id: "payment_123" } };

    case JOB_NAMES.CONTACT_INQUIRY:
      return {
        email: "test@example.com",
        message: "Test message",
      };

    case JOB_NAMES.SYSTEM_ALERT:
      return {
        alertType: "test",
        message: "Test alert",
      };

    case JOB_NAMES.GOOGLE_CALENDAR_EVENT_SYNC:
      return { bookingId: "507f1f77bcf86cd799439011" };

    case JOB_NAMES.GOOGLE_CALENDAR_EVENT_DELETION:
      return { eventId: "event_123" };

    case JOB_NAMES.GOOGLE_CALENDAR_EVENT_CANCELLATION:
      return { bookingId: "507f1f77bcf86cd799439011" };

    case JOB_NAMES.CLIENT_CALENDAR_INVITATION:
      return { bookingId: "507f1f77bcf86cd799439011" };

    case JOB_NAMES.RECURRING_BOOKING_BUFFER_REFRESH:
      return { recurringId: "507f1f77bcf86cd799439011" };

    case JOB_NAMES.DATABASE_CLEANUP:
      return {
        model: "User",
        documentIds: ["507f1f77bcf86cd799439011"],
      };

    default:
      return { test: "data" };
  }
}
