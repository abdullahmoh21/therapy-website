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
    eventName: {
      type: String,
      required: true,
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
    status: {
      type: String,
      required: true,
      enum: ["Active", "Completed", "Cancelled"],
      default: "Active",
    },
    location: {
      type: {
        type: String,
        enum: ["in-person", "online"],
      },
      join_url: {
        type: String,
      },
      zoom_pwd: {
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
        enum: ["User", "Admin"],
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
bookingSchema.index({ eventStartTime: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
