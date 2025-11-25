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

// ===== INDEXES FOR QUERY OPTIMIZATION =====

// 1. User payments lookup - find all payments for a user
// Used in: user billing page, admin payment queries
paymentSchema.index({ userId: 1, createdAt: -1 });

// 3. Transaction status filtering - find payments by status
// Used in: admin payment list, overdue payment queries
paymentSchema.index({ transactionStatus: 1, createdAt: -1 });

// 4. Payment tracker lookup - CRITICAL for Safepay webhook
// Used in: paymentController.safepayWebhook
paymentSchema.index({ tracker: 1 });

// 5. User + Booking compound lookup
// Used in: combined payment/booking queries
paymentSchema.index({ userId: 1, bookingId: 1 });

// 6. Overdue payments query (admin dashboard)
// Used in: adminBookingController to find payments that aren't completed
paymentSchema.index({ transactionStatus: 1, bookingId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
