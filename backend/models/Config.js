const mongoose = require("mongoose");
const logger = require("../logs/logger");
const fs = require("fs");
const path = require("path");
const LOCAL_CONFIG_FILE = path.join(__dirname, "../configLocalCache.bin");

// Load local cache from binary file
function loadLocalCache() {
  try {
    if (fs.existsSync(LOCAL_CONFIG_FILE)) {
      const buffer = fs.readFileSync(LOCAL_CONFIG_FILE);
      const json = buffer.toString("utf-8");
      return JSON.parse(json);
    }
  } catch (err) {
    logger.error(`Error loading local config cache: ${err.message}`);
  }
  return {};
}

// Save local cache to binary file (only adminEmail and devEmail)
function saveLocalCache(cache = {}) {
  try {
    const existing = loadLocalCache();
    const updated = { ...existing, ...cache };
    const buffer = Buffer.from(JSON.stringify(updated, null, 2), "utf-8");
    fs.writeFileSync(LOCAL_CONFIG_FILE, buffer);
  } catch (err) {
    logger.error(`Error saving local config cache: ${err.message}`);
  }
}

// Config cache constants
const CONFIG_CACHE_PREFIX = "config:";
// Removing TTL - configs will never expire

// Helper function to get Redis cache key (was missing)
function getRedisCacheKey(key) {
  return `${CONFIG_CACHE_PREFIX}${key}`;
}

// Default values for critical configs when DB/Redis are unavailable
const CONFIG_DEFAULTS = {
  sessionPrice: 8000,
  adminEmail: "abdullahmohsin21007@gmail.com",
  devEmail: "abdullahmohsin21007@gmail.com",
  maxBookings: "3",
  cancelCutoffDays: 2,
};

// Track error logged state to prevent log spam
const errorLoggedKeys = new Set();

const configSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    editable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Check if Redis is available - get the client dynamically to avoid circular deps
const isRedisAvailable = () => {
  try {
    // Dynamically import redisClient to avoid circular dependency
    const redisClient = require("../utils/redisClient");
    return redisClient && redisClient.status === "ready";
  } catch (err) {
    logger.error(`Error checking Redis availability: ${err.message}`);
    return false;
  }
};

// Method to get a specific config value
configSchema.statics.getValue = async function (key) {
  try {
    // First check Redis cache if available
    if (isRedisAvailable()) {
      try {
        // Dynamically import redisClient to avoid circular dependency
        const redisClient = require("../utils/redisClient");
        const cachedValue = await redisClient.get(getRedisCacheKey(key));
        if (cachedValue) {
          return JSON.parse(cachedValue);
          // No longer resetting TTL since we want permanent caching
        }
      } catch (redisError) {
        logger.error(
          `Redis error when getting config ${key}: ${redisError.message}`
        );
      }
    }

    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      // Log once per key to avoid log spam
      if (!errorLoggedKeys.has(key)) {
        logger.warn(
          `Cannot get config value for '${key}': MongoDB not connected`
        );
        errorLoggedKeys.add(key);
      }

      // Return default or local cache if available
      if (key in CONFIG_DEFAULTS) {
        const localCache = loadLocalCache();
        if (localCache[key]) {
          return localCache[key];
        }
        return CONFIG_DEFAULTS[key];
      }

      return undefined;
    }

    // Fetch from database with a timeout
    const config = await this.findOne({ key }).lean().maxTimeMS(5000);

    if (config) {
      // Cache in Redis if available
      if (isRedisAvailable()) {
        try {
          const redisClient = require("../utils/redisClient");
          // Store without expiry (permanent)
          await redisClient.set(
            getRedisCacheKey(key),
            JSON.stringify(config.value)
          );
        } catch (redisCacheError) {
          logger.error(
            `Failed to cache config ${key} in Redis: ${redisCacheError.message}`
          );
        }
      }

      return config.value;
    }

    return undefined;
  } catch (err) {
    logger.error(
      `Error retrieving config value for key=${key}: ${err.message}`
    );
    return undefined;
  }
};

// Method to set a specific config value
configSchema.statics.setValue = async function (key, value) {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.error("Cannot set config value: MongoDB not connected");
      throw new Error("Database connection unavailable");
    }

    const result = await this.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true, runValidators: true }
    ).maxTimeMS(5000);

    // Update Redis cache if available
    if (isRedisAvailable() && result) {
      try {
        const redisClient = require("../utils/redisClient");
        // Store without expiry (permanent)
        await redisClient.set(
          getRedisCacheKey(key),
          JSON.stringify(result.value)
        );
        logger.debug(`Updated Redis cache for config ${key}`);
      } catch (redisError) {
        logger.error(
          `Failed to update Redis cache for config ${key}: ${redisError.message}`
        );
      }
    }

    // Update local file cache for adminEmail and devEmail
    if (["adminEmail", "devEmail"].includes(key)) {
      saveLocalCache({ [key]: result.value });
    }

    return result;
  } catch (err) {
    logger.error(`Error setting config value for key=${key}: ${err.message}`);
    throw err;
  }
};

// Method to invalidate cache for a specific key
configSchema.statics.invalidateCache = async function (key) {
  if (isRedisAvailable()) {
    try {
      const redisClient = require("../utils/redisClient");
      if (key) {
        await redisClient.del(getRedisCacheKey(key));
        logger.debug(`Invalidated Redis cache for config ${key}`);
      } else {
        // Get all config keys from Redis
        const keys = await redisClient.keys(`${CONFIG_CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await redisClient.del(keys);
          logger.debug(
            `Invalidated Redis cache for all ${keys.length} config keys`
          );
        }
      }
    } catch (redisError) {
      logger.error(
        `Failed to invalidate Redis cache for config: ${redisError.message}`
      );
    }
  }

  // Clear error logged state
  if (key) {
    errorLoggedKeys.delete(key);
  } else {
    errorLoggedKeys.clear();
  }
};

// Ensure config values exist on startup
configSchema.statics.initializeConfig = async function () {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.warn(
        "Cannot initialize config: MongoDB not connected. Will retry when connection is established."
      );
      return false;
    }

    const Config = this;
    const requiredKeys = [
      {
        key: "sessionPrice",
        value: 8000,
        description: "Price per 1-hour session in PKR",
      },
      {
        key: "adminEmail",
        value: "abdullahmohsin21007@gmail.com",
        description: "Admin email for system notifications",
      },
      {
        key: "devEmail",
        value: "abdullahmohsin21007@gmail.com",
        description: "Developer email for technical alerts",
      },
      {
        key: "maxBookings",
        value: "3",
        description: "Maximum number of active booking allowed at a time.",
      },
      {
        key: "cancelCutoffDays",
        value: 2,
        description:
          "The cutoff period for cancellations in days. If set to '2', users will only be able to cancel up to 2 days before a booking.",
      },
    ];

    for (const item of requiredKeys) {
      try {
        // Check if item exists
        const existing = await Config.findOne({ key: item.key }).lean();

        if (!existing) {
          logger.info(`Initializing config key: ${item.key}`);
          await Config.create(item);

          // Cache the new value if Redis is available
          if (isRedisAvailable()) {
            const redisClient = require("../utils/redisClient");
            // Store without expiry (permanent)
            await redisClient.set(
              getRedisCacheKey(item.key),
              JSON.stringify(item.value)
            );
          }
        } else if (isRedisAvailable()) {
          // Cache existing values in Redis
          const redisClient = require("../utils/redisClient");
          // Store without expiry (permanent)
          await redisClient.set(
            getRedisCacheKey(item.key),
            JSON.stringify(existing.value)
          );
        }
      } catch (err) {
        logger.error(
          `Failed to initialize config key ${item.key}: ${err.message}`
        );
      }
    }

    // After initialization, update local cache for adminEmail and devEmail
    const localSeed = {};
    requiredKeys.forEach((item) => {
      if (["adminEmail", "devEmail"].includes(item.key)) {
        localSeed[item.key] = item.value;
      }
    });
    saveLocalCache(localSeed);

    return true;
  } catch (err) {
    logger.error(`Config initialization error: ${err.message}`);
    return false;
  }
};

module.exports = mongoose.model("Config", configSchema);
