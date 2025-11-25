const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
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

// ===== INDEXES FOR QUERY OPTIMIZATION =====

// 2. Role-based queries
// Used in: adminUserController to filter users by role
userSchema.index({ role: 1 });

// 3. Recurring state queries - find users with recurring enabled
// Used in: adminRecurringController, buffer refresh jobs
userSchema.index({ "recurring.state": 1 });

// 4. Next buffer refresh scheduling
// Used in: buffer refresh cron to find users needing buffer refresh
userSchema.index({ "recurring.state": 1, "recurring.nextBufferRefresh": 1 });

// 5. Recurring series ID lookups
// Used in: recurring booking operations to find user by series
userSchema.index({ "recurring.recurringSeriesId": 1 });

// 6. Account type filtering
// Used in: admin queries to filter by domestic/international
userSchema.index({ accountType: 1 });

// 7. Refresh token lookups for auth
// Used in: auth refresh token validation
userSchema.index({ refreshTokenHash: 1 });

// 8. Reset password token lookups
// Used in: password reset flow
userSchema.index({ resetPasswordEncryptedToken: 1 });

module.exports = mongoose.model("User", userSchema);
