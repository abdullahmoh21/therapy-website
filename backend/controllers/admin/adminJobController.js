const Job = require("../../models/Job");
const logger = require("../../logs/logger");
const {
  triggerPromotion,
  getPromoterStatus,
} = require("../../utils/queue/promoter");
const outboxService = require("../../utils/queue/outbox");

/**
 * Get job statistics
 * @route GET /api/admin/jobs/stats
 */
const getJobStats = async (req, res) => {
  try {
    const stats = await Job.getJobStats();

    // Add some additional metrics
    const overdue = await Job.countDocuments({
      status: "pending",
      runAt: { $lt: new Date() },
    });

    const upcoming = await Job.countDocuments({
      status: "pending",
      runAt: { $gt: new Date() },
    });

    const promoterStatus = getPromoterStatus();

    res.json({
      success: true,
      stats: {
        ...stats,
        overdue,
        upcoming,
      },
      promoter: promoterStatus,
    });
  } catch (error) {
    logger.error(`Failed to get job stats: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve job statistics",
    });
  }
};

/**
 * Get jobs by status
 * @route GET /api/admin/jobs?status=pending&limit=50
 */
const getJobs = async (req, res) => {
  try {
    const { status = "pending", limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find({ status })
      .sort({ runAt: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Job.countDocuments({ status });

    res.json({
      success: true,
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`Failed to get jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve jobs",
    });
  }
};

/**
 * Get a specific job by ID
 * @route GET /api/admin/jobs/:jobId
 */
const getJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({ jobId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    logger.error(`Failed to get job: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve job",
    });
  }
};

/**
 * Get overdue jobs
 * @route GET /api/admin/jobs/overdue
 */
const getOverdueJobs = async (req, res) => {
  try {
    const overdueJobs = await Job.findOverdueJobs();

    res.json({
      success: true,
      jobs: overdueJobs,
      count: overdueJobs.length,
    });
  } catch (error) {
    logger.error(`Failed to get overdue jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve overdue jobs",
    });
  }
};

/**
 * Retry a failed job
 * @route POST /api/admin/jobs/:jobId/retry
 */
const retryJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await outboxService.retryJob(jobId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: "Job marked for retry",
      job: result.job,
    });
  } catch (error) {
    logger.error(`Failed to retry job: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retry job",
    });
  }
};

/**
 * Cancel a pending job
 * @route POST /api/admin/jobs/:jobId/cancel
 */
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await outboxService.cancelJob(jobId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: "Job cancelled",
      job: result.job,
    });
  } catch (error) {
    logger.error(`Failed to cancel job: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to cancel job",
    });
  }
};

/**
 * Manually trigger job promotion
 * @route POST /api/admin/jobs/promote
 */
const promoteJobs = async (req, res) => {
  try {
    // Get the queue instance
    const queueModule = require("../../utils/queue/index");
    const queue = queueModule.queue;

    if (!queue) {
      return res.status(503).json({
        success: false,
        message: "Queue not initialized - Redis may be unavailable",
      });
    }

    const result = await triggerPromotion(queue);

    res.json({
      success: true,
      message: "Manual promotion completed",
      result,
    });
  } catch (error) {
    logger.error(`Failed to promote jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to promote jobs",
      error: error.message,
    });
  }
};

/**
 * Clean up old completed jobs
 * @route POST /api/admin/jobs/cleanup
 */
const cleanupJobs = async (req, res) => {
  try {
    const { retentionDays = 7 } = req.body;

    const result = await outboxService.cleanupOldJobs(retentionDays);

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} old jobs`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error(`Failed to cleanup jobs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup jobs",
    });
  }
};

module.exports = {
  getJobStats,
  getJobs,
  getJob,
  getOverdueJobs,
  retryJob,
  cancelJob,
  promoteJobs,
  cleanupJobs,
};
