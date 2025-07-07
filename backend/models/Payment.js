const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const autoIncrement = require("mongoose-sequence")(mongoose);

const paymentSchema = new Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      index: true, // Keep this as it's a foreign key lookup
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Keep this as it's a foreign key lookup
    },
    tracker: {
      type: String,
    },
    transactionReferenceNumber: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Credit Card"],
      default: "Cash",
    },
    netAmountReceived: {
      type: Number,
    },
    feePaid: {
      type: Number,
    },
    exchangeRate: {
      type: Number,
    },
    transactionStatus: {
      type: String,
      required: true,
      enum: [
        "Not Initiated",
        "Completed",
        "Cancelled",
        "Refund Requested",
        "Refunded",
        "Partially Refunded",
        "Error",
      ],
      default: "Not Initiated",
      index: true,
    },
    errorMessage: {
      type: String,
    },
    linkGeneratedDate: {
      type: Date,
    },
    paymentCompletedDate: {
      type: Date,
    },
    paymentRefundedDate: {
      type: Date,
    },
    refundRequestedDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Keep this important compound index for related data lookups
paymentSchema.index({ userId: 1, bookingId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
