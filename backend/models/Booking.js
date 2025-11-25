const { isPast } = require("date-fns");
const { ca } = require("date-fns/locale");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require("mongoose-sequence")(mongoose);

const bookingSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    eventStartTime: {
      type: Date,
      required: true,
    },
    eventEndTime: {
      type: Date,
      required: true,
    },
    eventTimezone: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ["Active", "Completed", "Cancelled"],
      default: "Active",
    },
    source: {
      type: String,
      enum: ["admin", "system", "calendly"],
    },
    recurring: {
      state: {
        type: Boolean,
        default: false,
      },
      seriesId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
      },
      interval: {
        type: String,
        enum: ["weekly", "biweekly", "monthly"],
      },
      day: {
        type: Number,
        enum: [0, 1, 2, 3, 4, 5, 6],
      },
      time: {
        type: String,
        validate: {
          validator: function (v) {
            return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
          },
          message: (props) =>
            `${props.value} is not a valid time format (HH:MM)!`,
        },
      },
      endDate: {
        type: Date,
      },
    },
    calendly: {
      eventName: {
        type: String,
      },
      scheduledEventURI: {
        type: String,
      },
      eventTypeURI: {
        type: String,
      },
      cancelURL: {
        type: String,
      },
      rescheduleURL: {
        type: String,
      },
    },
    googleEventId: {
      type: String,
    },
    googleHtmlLink: {
      type: String,
    },
    syncStatus: {
      google: {
        type: String,
        enum: ["pending", "synced", "failed", "not_applicable"],
        default: "pending",
      },
      lastSyncAttempt: Date,
    },
    invitationSent: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ["in-person", "online"],
      },
      meetingLink: {
        type: String,
      },
      inPersonLocation: {
        type: String,
      },
    },
    cancellation: {
      reason: {
        type: String,
      },
      date: {
        type: Date,
      },
      cancelledBy: {
        type: String,
        enum: ["User", "Admin", "System"],
      },
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.plugin(autoIncrement, {
  inc_field: "bookingId",
  id: "booking_id",
  start_seq: 208,
});

// ===== INDEXES FOR QUERY OPTIMIZATION =====

// 1. Admin booking list (most common heavy query)
// Used in: adminBookingController.getBookings - filters by status, eventStartTime with pagination/sort
bookingSchema.index({ status: 1, eventStartTime: -1 });

// 2. User booking queries - find active bookings by userId
// Used in: bookingController (getBookings, cancelBooking), check max bookings
bookingSchema.index({ userId: 1, status: 1, eventStartTime: -1 });

// 3. User active non-system bookings count (max booking limit check)
// Used in: bookingController.generateBookingLink
bookingSchema.index({ userId: 1, status: 1, source: 1 });

// 4. Calendly webhook lookup - CRITICAL for webhook performance
// Used in: bookingController.calendlyWebhook to find booking by eventURI
bookingSchema.index({ "calendly.scheduledEventURI": 1 });

// 5. Recurring series lookups
// Used in: multiple places to find all bookings in a recurring series
bookingSchema.index({ "recurring.seriesId": 1, eventStartTime: 1 });

// 6. Cron job - update completed bookings
// Used in: UpdateBookingStatus cron to mark past bookings as complete
bookingSchema.index({ eventEndTime: 1, status: 1 });

// 7. Google Calendar sync status lookups
// Used in: Google Calendar sync operations
bookingSchema.index({ "syncStatus.google": 1 });

// 8. Admin timeline view - upcoming bookings
// Used in: adminBookingController.getBookingTimeline
bookingSchema.index({ eventStartTime: 1, status: 1 });

// Legacy indexes (kept for backward compatibility)
bookingSchema.index({ eventStartTime: 1, _id: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ source: 1 });

bookingSchema.index(
  { eventStartTime: 1, eventEndTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $ne: "Cancelled" },
    },
    name: "prevent_booking_conflicts",
  }
);

// Helper method to check if this is a Calendly booking
bookingSchema.methods.isCalendlyBooking = function () {
  return this.source === "calendly";
};

// Helper method to check if this is an admin-created booking
bookingSchema.methods.isAdminCreated = function () {
  return this.source === "admin";
};

module.exports = mongoose.model("Booking", bookingSchema);
