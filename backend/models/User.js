const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    emailVerified: {
      state: {
        type: Boolean,
        default: false,
      },
      encryptedToken: {
        type: String,
      },
      expiresIn: {
        type: Date,
      },
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    DOB: {
      type: Date,
    },
    accountType: {
      type: String,
      enum: ["domestic", "international"],
      required: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    bookingTokenJTI: {
      type: String,
    },
    refreshTokenHash: {
      type: String,
    },
    refreshTokenExp: {
      type: Date,
    },
    resetPasswordEncryptedToken: {
      type: String,
    },
    resetPasswordExp: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
