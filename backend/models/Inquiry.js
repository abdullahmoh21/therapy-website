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
  },
  adminNotified: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Inquiry", inquirySchema);
