const Config = require("../models/Config");
const asyncHandler = require("express-async-handler");
const logger = require("../logs/logger");
const mongoose = require("mongoose");
const os = require("os");
const { redisClient, checkRedisAvailability } = require("../utils/redisClient");

//@desc Get system health and configuration
//@param valid admin jwt token
//@route GET /admin/system-health
//@access Private(admin)
const getSystemHealth = asyncHandler(async (req, res) => {
  try {
    // Basic Server Status (implicitly true if endpoint responds)
    const serverStatus = "Running";

    // Redis Status - Enhanced with more details
    let redisStatus = "Disconnected";
    let redisInfo = {};

    // Check if Redis client exists and has a status property
    if (redisClient) {
      redisStatus = redisClient.status || "Unknown";

      // Try to get more detailed Redis info if connected
      if (redisStatus === "ready") {
        try {
          // Get Redis info command results
          const info = await redisClient.info();
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
                  redisInfo[key.trim()] = value.trim();
                }
              }
            });
          }

          // Add client count
          const clientList = await redisClient.client("LIST");
          const clientCount = clientList
            .split("\n")
            .filter((line) => line.trim()).length;
          redisInfo.connected_clients = clientCount;

          // Add key count
          const dbSize = await redisClient.dbsize();
          redisInfo.keys = dbSize;
        } catch (redisError) {
          logger.error(`Error fetching Redis info: ${redisError.message}`);
          redisInfo.error = "Could not fetch detailed Redis information";
        }
      }
    } else {
      // Fallback to socket check if client is not available
      const isAvailable = await checkRedisAvailability();
      redisStatus = isAvailable ? "Available (Socket)" : "Unavailable";
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

    // Fetch Configuration
    const configurations = await Config.find({}).lean();

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
      redis: {
        status: redisStatus,
        info: redisInfo,
        dockerized:
          process.env.REDIS_HOST !== "localhost" &&
          process.env.REDIS_HOST !== undefined,
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
      configurations: configurations.reduce((acc, config) => {
        acc[config.key] = {
          value: config.value,
          description: config.description,
          editable: config.editable,
          _id: config._id, // Include ID for updates
        };
        return acc;
      }, {}),
    });
  } catch (error) {
    logger.error(`Error fetching system health: ${error.message}`);
    res.status(500).json({ message: "Failed to fetch system health data" });
  }
});

//@desc Update configuration value
//@param valid admin jwt token
//@route PATCH /admin/config/:key
//@access Private(admin)
const updateConfig = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ message: "Value is required" });
  }

  try {
    const configItem = await Config.findOne({ key });

    if (!configItem) {
      return res.status(404).json({ message: "Configuration key not found" });
    }

    if (!configItem.editable) {
      return res
        .status(403)
        .json({ message: "This configuration value cannot be edited" });
    }

    // Basic type validation/conversion (can be expanded)
    let newValue = value;
    if (typeof configItem.value === "number") {
      newValue = Number(value);
      if (isNaN(newValue)) {
        return res
          .status(400)
          .json({ message: "Invalid value type, expected a number" });
      }
    } else if (typeof configItem.value === "boolean") {
      newValue = value === "true" || value === true;
    }
    // Add more type checks if needed

    configItem.value = newValue;
    await configItem.save();

    logger.info(`Admin updated config key '${key}' to value '${newValue}'`);

    res.status(200).json({
      message: `Configuration '${key}' updated successfully`,
      config: {
        key: configItem.key,
        value: configItem.value,
        description: configItem.description,
        editable: configItem.editable,
        _id: configItem._id,
      },
    });
  } catch (error) {
    logger.error(`Error updating configuration '${key}': ${error.message}`);
    res.status(500).json({ message: "Failed to update configuration" });
  }
});

module.exports = {
  getSystemHealth,
  updateConfig,
};
