const Config = require("../../models/Config");
const asyncHandler = require("express-async-handler");
const logger = require("../../logs/logger");
const mongoose = require("mongoose");
const os = require("os");
const {
  redisCacheClient,
  redisQueueClient,
  checkRedisCacheAvailability,
  checkRedisQueueAvailability,
} = require("../../utils/redisClient");

//@desc Get system health and configuration
//@param valid admin jwt token
//@route GET /admin/system-health
//@access Private(admin)
const getSystemHealth = asyncHandler(async (req, res) => {
  try {
    // Basic Server Status (implicitly true if endpoint responds)
    const serverStatus = "Running";

    // Redis Cache Status - Enhanced with more details
    let redisCacheStatus = "Disconnected";
    let redisCacheInfo = {};

    // Check if Redis cache client exists and has a status property
    if (redisCacheClient) {
      redisCacheStatus = redisCacheClient.status || "Unknown";

      // Try to get more detailed Redis cache info if connected
      if (redisCacheStatus === "ready") {
        try {
          // Get Redis info command results
          const info = await redisCacheClient.info();
          const infoSections = info.split("#");

          // Parse memory section
          const memorySection = infoSections.find((section) =>
            section.includes("used_memory")
          );
          if (memorySection) {
            const memoryLines = memorySection
              .split("\r\n")
              .filter((line) => line.trim());
            memoryLines.forEach((line) => {
              if (line.includes(":")) {
                const [key, value] = line.split(":");
                if (key && value) {
                  redisCacheInfo[key.trim()] = value.trim();
                }
              }
            });
          }

          // Add client count
          const clientList = await redisCacheClient.client("LIST");
          const clientCount = clientList
            .split("\n")
            .filter((line) => line.trim()).length;
          redisCacheInfo.connected_clients = clientCount;

          // Add key count
          const dbSize = await redisCacheClient.dbsize();
          redisCacheInfo.keys = dbSize;
        } catch (redisError) {
          logger.error(
            `Error fetching Redis cache info: ${redisError.message}`
          );
          redisCacheInfo.error = "Could not fetch detailed Redis information";
        }
      }
    } else {
      // Fallback to socket check if client is not available
      const isAvailable = await checkRedisCacheAvailability();
      redisCacheStatus = isAvailable ? "Available (Socket)" : "Unavailable";
    }

    // Redis Queue Status
    let redisQueueStatus = "Disconnected";
    let redisQueueInfo = {};

    // Check if Redis queue client exists and has a status property
    if (redisQueueClient) {
      redisQueueStatus = redisQueueClient.status || "Unknown";

      // Try to get more detailed Redis queue info if connected
      if (redisQueueStatus === "ready") {
        try {
          // Get Redis info command results
          const info = await redisQueueClient.info();
          const infoSections = info.split("#");

          // Parse memory section
          const memorySection = infoSections.find((section) =>
            section.includes("used_memory")
          );
          if (memorySection) {
            const memoryLines = memorySection
              .split("\r\n")
              .filter((line) => line.trim());
            memoryLines.forEach((line) => {
              if (line.includes(":")) {
                const [key, value] = line.split(":");
                if (key && value) {
                  redisQueueInfo[key.trim()] = value.trim();
                }
              }
            });
          }

          // Add client count
          const clientList = await redisQueueClient.client("LIST");
          const clientCount = clientList
            .split("\n")
            .filter((line) => line.trim()).length;
          redisQueueInfo.connected_clients = clientCount;

          // Add key count
          const dbSize = await redisQueueClient.dbsize();
          redisQueueInfo.keys = dbSize;
        } catch (redisError) {
          logger.error(
            `Error fetching Redis queue info: ${redisError.message}`
          );
          redisQueueInfo.error = "Could not fetch detailed Redis information";
        }
      }
    } else {
      // Fallback to socket check if client is not available
      const isAvailable = await checkRedisQueueAvailability();
      redisQueueStatus = isAvailable ? "Available (Socket)" : "Unavailable";
    }

    // Memory Usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // CPU Information
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const cpuModel = cpus.length > 0 ? cpus[0].model : "Unknown";
    const loadAvg = os.loadavg();

    // Database Status & Stats
    let dbStatus = "Disconnected";
    let dbStats = {};
    if (mongoose.connection.readyState === 1) {
      // 1 === connected
      dbStatus = "Connected";
      try {
        dbStats = await mongoose.connection.db.stats();
        // Convert sizes to MB for readability
        dbStats.storageSizeMB = (dbStats.storageSize / (1024 * 1024)).toFixed(
          2
        );
        dbStats.dataSizeMB = (dbStats.dataSize / (1024 * 1024)).toFixed(2);
        dbStats.indexSizeMB = (dbStats.indexSize / (1024 * 1024)).toFixed(2);
        dbStats.totalSizeMB = (
          (dbStats.storageSize + dbStats.indexSize) /
          (1024 * 1024)
        ).toFixed(2);

        // Add collection stats
        const collections = await mongoose.connection.db
          .listCollections()
          .toArray();
        dbStats.collectionList = collections.map((c) => c.name);
      } catch (dbError) {
        logger.error(`Error fetching DB stats: ${dbError.message}`);
        dbStats = { error: "Could not fetch database statistics." };
      }
    }

    res.status(200).json({
      server: {
        status: serverStatus,
        uptime: process.uptime(), // Uptime in seconds
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        release: os.release(),
        loadAverage: loadAvg,
      },
      cpu: {
        count: cpuCount,
        model: cpuModel,
        load1: loadAvg[0].toFixed(2),
        load5: loadAvg[1].toFixed(2),
        load15: loadAvg[2].toFixed(2),
      },
      redisCache: {
        status: redisCacheStatus,
        info: redisCacheInfo,
        dockerized:
          process.env.REDIS_CACHE_HOST !== "localhost" &&
          process.env.REDIS_CACHE_HOST !== undefined,
      },
      redisQueue: {
        status: redisQueueStatus,
        info: redisQueueInfo,
        dockerized:
          process.env.REDIS_QUEUE_HOST !== "localhost" &&
          process.env.REDIS_QUEUE_HOST !== undefined,
      },
      memory: {
        rssMB: (memoryUsage.rss / (1024 * 1024)).toFixed(2), // Resident Set Size
        heapTotalMB: (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
        heapUsedMB: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
        externalMB: (memoryUsage.external / (1024 * 1024)).toFixed(2),
        systemTotalMB: (totalMemory / (1024 * 1024)).toFixed(2),
        systemUsedMB: (usedMemory / (1024 * 1024)).toFixed(2),
        systemFreeMB: (freeMemory / (1024 * 1024)).toFixed(2),
        systemUsedPercent: ((usedMemory / totalMemory) * 100).toFixed(2),
      },
      database: {
        status: dbStatus,
        stats: dbStats,
      },
    });
  } catch (error) {
    logger.error(`Error fetching system health: ${error.message}`);
    res.status(500).json({ message: "Failed to fetch system health data" });
  }
});

module.exports = {
  getSystemHealth,
};
