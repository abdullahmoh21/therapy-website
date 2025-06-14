const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inviteeSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: false,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days by default
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
    default: null,
  },
});

// Index for quickly looking up active invitations by email and token
inviteeSchema.index({ email: 1, token: 1, isUsed: 1 });

module.exports = mongoose.model("Invitee", inviteeSchema);
