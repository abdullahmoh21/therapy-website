const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inviteeSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true, // Ensure email is always stored in lowercase
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  accountType: {
    type: String,
    enum: ["domestic", "international"],
    required: true,
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

// Add a pre-save hook to normalize email
inviteeSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// ===== INDEXES FOR QUERY OPTIMIZATION =====

// 1. Email and token lookup - CRITICAL for invitation validation
// Used in: authController.register to validate invitation tokens
inviteeSchema.index({ email: 1, token: 1 });

// 2. Active invitations query
// Used in: adminInvitationController to filter unused invitations
inviteeSchema.index({ isUsed: 1, expiresAt: 1 });

// 3. Compound query for invitation validation
// Used in: registration flow to check valid, unused invitations
inviteeSchema.index({ email: 1, token: 1, isUsed: 1 });

// 4. Inviter lookup - find all invitations sent by an admin
// Used in: admin queries to track who invited whom
inviteeSchema.index({ invitedBy: 1, createdAt: -1 });

// 5. TTL index - auto-delete expired invitations after 30 days
inviteeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("Invitee", inviteeSchema);
