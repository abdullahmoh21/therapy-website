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
    recurring: {
      state: {
        type: Boolean,
        default: false,
      },
      interval: {
        type: String,
        enum: ["weekly", "biweekly", "monthly"],
      },
      day: {
        type: String,
        enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
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
      location: {
        type: {
          type: String,
          enum: ["in-person", "online"],
        },
        inPersonLocation: {
          type: String,
        },
      },
      recurringSeriesId: {
        type: mongoose.Schema.Types.ObjectId,
      },
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
