const mongoose = require("mongoose");

/**
 * Job Schema - MongoDB source of truth for scheduled and pending jobs
 *
 * Status flow:
 * - pending: Job created, waiting for runAt time
 * - promoted: Moved to Redis queue for execution
 * - completed: Successfully executed
 * - failed: Failed after all retries
 * - cancelled: Manually cancelled before execution
 */
const jobSchema = new mongoose.Schema(
  {
    // Job identification
    jobName: {
      type: String,
      required: true,
      index: true,
    },

    // Unique identifier for deduplication
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Job payload
    jobData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Scheduling
    runAt: {
      type: Date,
      required: true,
      index: true,
      default: Date.now, // Immediate execution by default
    },

    // Execution tracking
    status: {
      type: String,
      enum: ["pending", "promoted", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 5,
    },

    // Error tracking
    lastError: {
      type: String,
    },

    lastAttemptAt: {
      type: Date,
    },

    // Result tracking
    result: {
      type: mongoose.Schema.Types.Mixed,
    },

    completedAt: {
      type: Date,
    },

    // Metadata
    priority: {
      type: Number,
      default: 0, // Higher = more important
    },

    // For delayed/scheduled jobs
    promotionWindowMinutes: {
      type: Number,
      default: 60, // Promote jobs within 60 minutes of runAt
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
jobSchema.index({ status: 1, runAt: 1 });
jobSchema.index({ status: 1, createdAt: 1 });
jobSchema.index({ jobName: 1, status: 1 });

// TTL index: auto-delete completed jobs after 7 days
jobSchema.index(
  { completedAt: 1 },
  { expireAfterSeconds: 604800, sparse: true }
);

// TTL index: auto-delete failed jobs after 90 days
jobSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 7776000, // 90 days
    partialFilterExpression: { status: "failed" },
  }
);

// Methods
jobSchema.methods.markPromoted = async function () {
  this.status = "promoted";
  this.lastAttemptAt = new Date();
  this.attempts += 1;
  return this.save();
};

jobSchema.methods.markCompleted = async function (result = null) {
  this.status = "completed";
  this.completedAt = new Date();
  if (result) this.result = result;
  return this.save();
};

jobSchema.methods.markFailed = async function (error) {
  this.attempts += 1;
  this.lastError = error;
  this.lastAttemptAt = new Date();

  if (this.attempts >= this.maxAttempts) {
    this.status = "failed";
  } else {
    this.status = "pending"; // Retry later
  }

  return this.save();
};

// Static methods for querying
jobSchema.statics.findDueJobs = function (promotionWindow = 60) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + promotionWindow * 60 * 1000);

  return this.find({
    status: "pending",
    runAt: { $lte: futureTime },
    attempts: {
      $lt: mongoose.model("Job").schema.path("maxAttempts").defaultValue || 5,
    },
  })
    .sort({ priority: -1, runAt: 1 })
    .limit(100); // Process in batches
};

jobSchema.statics.findOverdueJobs = function () {
  return this.find({
    status: "pending",
    runAt: { $lt: new Date() },
  }).sort({ priority: -1, runAt: 1 });
};

jobSchema.statics.cancelJob = async function (jobId) {
  return this.findOneAndUpdate(
    { jobId, status: { $in: ["pending", "promoted"] } },
    { status: "cancelled" },
    { new: true }
  );
};

jobSchema.statics.getJobStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
