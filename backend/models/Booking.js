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
  unique: true,
});
bookingSchema.index({ eventStartTime: 1, _id: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ source: 1 });

// Helper method to check if this is a Calendly booking
bookingSchema.methods.isCalendlyBooking = function () {
  return this.source === "calendly";
};

// Helper method to check if this is an admin-created booking
bookingSchema.methods.isAdminCreated = function () {
  return this.source === "admin";
};

module.exports = mongoose.model("Booking", bookingSchema);
