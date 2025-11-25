const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["New", "Responded", "Closed"],
    default: "New",
    index: true, // For filtering inquiries by status
  },
  adminNotified: {
    type: Boolean,
    default: false,
  },
});

// ===== INDEXES FOR QUERY OPTIMIZATION =====

// 1. Email lookup - find inquiries by email
// Used in: potential duplicate inquiry checks
inquirySchema.index({ email: 1 });

// 2. Status and creation date - admin inquiry list
// Used in: adminMetricsController to count new inquiries
inquirySchema.index({ status: 1, createdAt: -1 });

// 3. Admin notification flag
// Used in: to find inquiries that need admin notification
inquirySchema.index({ adminNotified: 1, createdAt: -1 });

module.exports = mongoose.model("Inquiry", inquirySchema);
