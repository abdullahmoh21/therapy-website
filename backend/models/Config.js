const mongoose = require("mongoose");
const logger = require("../logs/logger");
const fs = require("fs");
const path = require("path");
const LOCAL_CONFIG_FILE = path.join(__dirname, "../configLocalCache.bin");

const REQUIRED_CONFIG_KEYS = [
  {
    key: "sessionPrice",
    value: 8000,
    displayName: "Domestic Session Price",
    description:
      "Price per session in PKR. This rate will be applied to domestic clients.",
  },
  {
    key: "intlSessionPrice",
    value: 100,
    displayName: "International Session Price",
    description:
      "Price per session in USD. This rate will be applied to international clients.",
  },
  {
    key: "maxBookings",
    value: "3",
    displayName: "Maximum Bookings",
    description: "Maximum number of active booking allowed at a time.",
  },
  {
    key: "noticePeriod",
    value: 2,
    displayName: "Cancellation Notice Period",
    description:
      "The notice period for cancellations in days. If set to '2', users will only be able to cancel up to 2 days before a booking.",
  },
  {
    key: "adminEmail",
    value: "abdullahmohsin21007@gmail.com",
    displayName: "Admin Email",
    description: "Admin email for system notifications",
  },
  {
    key: "devEmail",
    value: "abdullahmohsin21007@gmail.com",
    displayName: "Developer Email",
    description: "Developer email for technical alerts",
  },
  {
    key: "bankAccounts",
    value: [
      {
        bankAccount: "Meezan Bank",
        accountNo: "12345678901234",
        accountTitle: "Fatima Mohsin Naqvi",
      },
      {
        bankAccount: "Jazz Cash",
        accountNo: "03001234567",
        accountTitle: "Fatima Mohsin Naqvi",
      },
    ],
    displayName: "Payment Accounts",
    description:
      "Bank account details for payments. Please ensure they are correct since all clients will see on their dashboard.",
  },
  {
    key: "googleRefreshToken",
    value: null,
    displayName: "Google Calendar Refresh Token",
    description:
      "OAuth2 refresh token for Google Calendar API access. This is automatically managed by the system.",
    viewable: false, // Hidden from admin interface
  },
  {
    key: "googleAccessToken",
    value: null,
    displayName: "Google Calendar Access Token",
    description:
      "OAuth2 access token for Google Calendar API access. This is automatically refreshed and managed by the system.",
    viewable: false, // Hidden from admin interface
  },
  {
    key: "googleTokenExpiry",
    value: null,
    displayName: "Google Token Expiry",
    description:
      "Expiry timestamp for Google access token. This is automatically updated when tokens are refreshed.",
    viewable: false, // Hidden from admin interface
  },
  {
    key: "googleUserEmail",
    value: null,
    displayName: "Google Account Email",
    description:
      "Email address of the connected Google account. This is automatically set when connecting to Google Calendar.",
    viewable: false, // Hidden from admin interface
  },
];

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
  bankAccounts: [
    {
      bankAccount: "Meezan Bank",
      accountNo: "12345678901234",
      accountTitle: "Fatima Mohsin Naqvi",
    },
    {
      bankAccount: "Jazz Cash",
      accountNo: "03001234567",
      accountTitle: "Fatima Mohsin Naqvi",
    },
  ],
  googleRefreshToken: null,
  googleAccessToken: null,
  googleTokenExpiry: null,
  googleUserEmail: null,
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
      required: false, // Make value field optional
      validate: {
        validator: function (value) {
          // Allow null values for Google tokens
          const googleTokenKeys = [
            "googleRefreshToken",
            "googleAccessToken",
            "googleTokenExpiry",
            "googleUserEmail",
          ];

          // If it's a Google token key, allow null values
          if (googleTokenKeys.includes(this.key)) {
            return true; // Always valid for Google token keys
          }

          // For other keys, require a non-null, non-undefined value
          return value !== null && value !== undefined;
        },
        message: "Value is required for non-Google token configuration keys",
      },
      default: function () {
        // Set default to null for Google tokens
        const googleTokenKeys = [
          "googleRefreshToken",
          "googleAccessToken",
          "googleTokenExpiry",
          "googleUserEmail",
        ];
        if (googleTokenKeys.includes(this.key)) {
          return null;
        }
        return undefined;
      },
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    viewable: {
      type: Boolean,
      default: true, // By default, configs are viewable in admin interface
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

    // First check if the config exists
    const existingConfig = await this.findOne({ key }).lean();

    let result;
    if (existingConfig) {
      // Check if this is a Google token being set to null
      const googleTokenKeys = [
        "googleRefreshToken",
        "googleAccessToken",
        "googleTokenExpiry",
        "googleUserEmail",
      ];

      const isGoogleToken = googleTokenKeys.includes(key);
      const isSettingToNull = value === null || value === undefined;

      if (isGoogleToken && isSettingToNull) {
        // For Google tokens being set to null, use $set with null explicitly
        result = await this.findOneAndUpdate(
          { key },
          { $set: { value: null } },
          { new: true, runValidators: false } // Skip validation for null Google tokens
        ).maxTimeMS(5000);
      } else {
        // For regular updates, use normal validation
        result = await this.findOneAndUpdate(
          { key },
          { $set: { value } },
          { new: true, runValidators: true }
        ).maxTimeMS(5000);
      }

      if (!result) {
        throw new Error(`Failed to update config with key: ${key}`);
      }
    } else {
      // If it doesn't exist, we need to provide all required fields
      logger.warn(
        `Attempted to update non-existent config key: ${key}. Creating with defaults.`
      );

      // Create with all required fields
      const newConfig = new this({
        key,
        value,
        displayName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
        description: `Auto-generated for key ${key}`,
        viewable: true, // Default to viewable for auto-generated configs
      });

      result = await newConfig.save();
    }

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
          `Failed to cache config ${key} in Redis: ${redisError.message}`
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
    logger.error(err.stack); // Add stack trace for debugging
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

// Method to check if a config key should be viewable in admin interface
configSchema.statics.isViewable = function (key) {
  // Find the config definition in REQUIRED_CONFIG_KEYS
  const configDef = REQUIRED_CONFIG_KEYS.find((config) => config.key === key);
  if (configDef) {
    return configDef.viewable !== false; // Default to true if not specified
  }
  return true; // Default to viewable for unknown keys
};

// Method to get all configs in the order of REQUIRED_CONFIG_KEYS
configSchema.statics.findAllOrdered = async function (includeHidden = false) {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.warn("Cannot get configs: MongoDB not connected");
      return [];
    }

    // Get all configs from database
    const allConfigs = await this.find({}).lean();

    // Create a map for quick lookup
    const configMap = new Map();
    allConfigs.forEach((config) => {
      // Skip non-viewable configs unless explicitly requested
      if (!includeHidden && !this.isViewable(config.key)) {
        return;
      }
      configMap.set(config.key, config);
    });

    const orderedConfigs = [];
    REQUIRED_CONFIG_KEYS.forEach((requiredConfig) => {
      // Skip non-viewable configs unless explicitly requested
      if (!includeHidden && requiredConfig.viewable === false) {
        return;
      }

      const config = configMap.get(requiredConfig.key);
      if (config) {
        orderedConfigs.push(config);
        configMap.delete(requiredConfig.key);
      }
    });

    // Add any remaining configs that are viewable
    configMap.forEach((config) => {
      orderedConfigs.push(config);
    });

    return orderedConfigs;
  } catch (err) {
    logger.error(`Error getting ordered configs: ${err.message}`);
    return [];
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
    const requiredKeys = REQUIRED_CONFIG_KEYS; // Use the constant defined at the top

    // Get all required key names for comparison
    const requiredKeyNames = requiredKeys.map((item) => item.key);

    // Get all existing config keys from database using the ordered method
    const existingConfigs = await Config.findAllOrdered();

    // Find keys to delete (keys in DB but not in requiredKeys)
    const keysToDelete = existingConfigs
      .filter((config) => !requiredKeyNames.includes(config.key))
      .map((config) => config.key);

    // Delete outdated keys
    if (keysToDelete.length > 0) {
      logger.info(`Deleting outdated config keys: ${keysToDelete.join(", ")}`);
      await Config.deleteMany({ key: { $in: keysToDelete } });

      // Invalidate Redis cache for deleted keys
      if (isRedisAvailable()) {
        try {
          const redisClient = require("../utils/redisClient");
          for (const key of keysToDelete) {
            await redisClient.del(getRedisCacheKey(key));
          }
        } catch (redisError) {
          logger.error(
            `Error clearing Redis cache for deleted keys: ${redisError.message}`
          );
        }
      }

      // Clean up local cache if needed
      const localCache = loadLocalCache();
      let localCacheChanged = false;
      for (const key of keysToDelete) {
        if (key in localCache) {
          delete localCache[key];
          localCacheChanged = true;
        }
      }
      if (localCacheChanged) {
        saveLocalCache(localCache);
      }
    }

    // Create lookup object for required keys for easy access
    const requiredKeysMap = requiredKeys.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});

    // Add/update required keys
    for (const item of requiredKeys) {
      try {
        // Check if item exists
        const existing = await Config.findOne({ key: item.key }).lean();

        if (!existing) {
          // Create new config if it doesn't exist
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
        } else {
          // Check if displayName is missing or needs to be updated
          const displayNameChanged =
            !existing.displayName || existing.displayName !== item.displayName;

          // Check if description is missing or needs to be updated
          const descriptionChanged =
            !existing.description ||
            (item.description && existing.description !== item.description);

          if (displayNameChanged || descriptionChanged) {
            const updateFields = {};

            if (displayNameChanged) {
              logger.info(`Updating displayName for config key: ${item.key}`);
              updateFields.displayName = item.displayName;
            }

            if (descriptionChanged) {
              logger.info(`Updating description for config key: ${item.key}`);
              updateFields.description = item.description;
            }

            // Update only the necessary fields
            await Config.updateOne({ key: item.key }, { $set: updateFields });
          }

          // Cache in Redis regardless of updates
          if (isRedisAvailable()) {
            const redisClient = require("../utils/redisClient");
            // Store without expiry (permanent)
            await redisClient.set(
              getRedisCacheKey(item.key),
              JSON.stringify(existing.value)
            );
          }
        }
      } catch (err) {
        logger.error(
          `Failed to initialize/update config key ${item.key}: ${err.message}`
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
