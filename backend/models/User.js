const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // Ensure email is always stored in lowercase
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
        type: Number,
        enum: [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday, 6 = Saturday
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
      nextBufferRefresh: {
        type: Date,
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

// Add a pre-save hook to normalize email
userSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
