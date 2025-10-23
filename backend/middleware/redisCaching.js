const {
  redisCacheClient,
  checkRedisCacheAvailability,
} = require("../utils/redisClient");
const logger = require("../logs/logger");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const inflateAsync = promisify(zlib.inflate);
const deflateAsync = promisify(zlib.deflate);
const crypto = require("crypto");
const cacheConfig = require("../config/cacheConfig");

// Track Redis availability status to prevent repeated logs
let redisAvailable = null; // null means not checked yet
let lastRedisCheckTime = 0;
const REDIS_CHECK_INTERVAL = 60000; // Check at most once per minute

// Check if Redis is working using the utility from redisClient
async function isRedisWorking() {
  const now = Date.now();
  if (
    redisAvailable === null ||
    now - lastRedisCheckTime > REDIS_CHECK_INTERVAL
  ) {
    lastRedisCheckTime = now;
    const isConnected = await checkRedisCacheAvailability();
    if (redisAvailable !== isConnected) {
      if (isConnected) {
        logger.debug("Redis is now available for caching");
      } else if (redisAvailable !== null) {
        logger.debug("Redis is unavailable, operating without caching");
      }
      redisAvailable = isConnected;
    }
  }

  return redisAvailable === true;
}

/**
 * Normalize a URL path for consistent caching
 * - Ensures path starts with /
 * - Removes trailing slashes
 * - Ensures /api prefix
 */
function normalizePath(url) {
  let fullPath = url.startsWith("/") ? url : `/${url}`;

  // Remove query parameters if present
  fullPath = fullPath.split("?")[0];

  // Remove trailing slash if present
  if (fullPath.length > 1 && fullPath.endsWith("/")) {
    fullPath = fullPath.slice(0, -1);
  }

  // Ensure /api prefix
  if (!fullPath.startsWith("/api/")) {
    fullPath = `/api${fullPath}`;
  }

  return fullPath;
}

/**
 * Determine if a path matches any of our cacheable endpoints
 * Returns the matching configuration or null if no match
 */
function getEndpointConfig(path) {
  for (const [pattern, config] of Object.entries(cacheConfig.endpoints)) {
    if (new RegExp(pattern).test(path)) {
      return config;
    }
  }
  return null;
}

/**
 * Validate query parameters based on endpoint configuration
 * Returns true if query params are valid for caching, false otherwise
 */
function validateQueryParams(query, config) {
  if (!query) return true; // No query params is always valid

  // If no allowed query params are defined, don't cache requests with query params
  if (!config.allowQueryParams || config.allowQueryParams.length === 0) {
    // Return false if there are any non-empty query params
    return Object.keys(query).every((key) => {
      const value = query[key];
      return (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "undefined" ||
        value === "null"
      );
    });
  }

  // Filter out empty query parameters
  const queryKeys = Object.keys(query).filter((key) => {
    const value = query[key];
    // Skip empty values
    return !(
      value === undefined ||
      value === null ||
      value === "" ||
      value === "undefined" ||
      value === "null"
    );
  });

  // If there are any parameters not in the allowedQueryParams list, don't cache
  const hasDisallowedParams = queryKeys.some(
    (key) => !config.allowQueryParams.includes(key)
  );

  // Only valid if no disallowed params exist
  return !hasDisallowedParams;
}

/**
 * Extract cacheable query params for key generation
 */
function extractQueryParams(query, config) {
  if (!query) return {};

  if (!config.allowQueryParams || config.allowQueryParams.length === 0) {
    return {};
  }

  // Only include allowed parameters with non-empty values
  const result = {};
  for (const param of config.allowQueryParams) {
    if (
      query[param] !== undefined &&
      query[param] !== null &&
      query[param] !== "" &&
      query[param] !== "undefined" &&
      query[param] !== "null"
    ) {
      result[param] = query[param];
    }
  }

  return result;
}

/**
 * Generate a cache key based on userId, path, and filtered query parameters
 * Admin routes: cache:admin:${resourceType}:${pathHash}
 * User routes: cache:${userId}:${resourceType}:${pathHash}
 */
function generateKey(userId, path, query = null, config = null) {
  // Normalize the path
  const normalizedPath = normalizePath(path);

  // Get endpoint configuration if not provided
  if (!config) {
    config = getEndpointConfig(normalizedPath);
  }

  // Don't cache if no matching configuration
  if (!config) {
    return `nocache:${crypto.randomBytes(8).toString("hex")}`;
  }

  // Validate query parameters - if not valid, don't cache
  if (!validateQueryParams(query, config)) {
    return `nocache:${crypto.randomBytes(8).toString("hex")}`;
  }

  // Extract cacheable query params
  const filteredQuery = extractQueryParams(query, config);

  // Sort query parameters for consistent hashing
  const sortedQueryEntries = Object.entries(filteredQuery).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // Build query string in a deterministic way
  let queryString = "";
  if (sortedQueryEntries.length > 0) {
    queryString =
      "?" +
      sortedQueryEntries.map(([key, value]) => `${key}=${value}`).join("&");
  }

  // Create full path with query string
  const fullPathWithQuery = normalizedPath + queryString;

  // Extract resource type from path
  const pathParts = normalizedPath.split("/").filter(Boolean);
  let resourceType = "unknown";
  let isAdminRoute = false;

  if (pathParts.length > 1) {
    if (pathParts[0] === "api") {
      if (pathParts[1] === "admin" && pathParts.length > 2) {
        // Admin route: /api/admin/[resourceType]
        resourceType = pathParts[2]; // Just get the resource type, don't prefix with admin
        isAdminRoute = true;
      } else {
        // Standard route: /api/[resourceType]
        resourceType = pathParts[1];
      }
    }
  }

  // Hash the full path with query for a deterministic key suffix
  const pathHash = crypto
    .createHash("md5")
    .update(fullPathWithQuery)
    .digest("hex")
    .substring(0, 10); // Use only first 10 chars for readability

  // Format: cache:[userId/admin]:[resourceType]:[pathHash]
  if (isAdminRoute) {
    // For admin routes, use 'admin' prefix
    return `cache:admin:${resourceType}:${pathHash}`;
  } else {
    // For user-specific routes
    return `cache:${userId}:${resourceType}:${pathHash}`;
  }
}

/**
 * Invalidate cache based on a specific event
 */
async function invalidateByEvent(eventName, options = {}) {
  if (!isRedisWorking()) {
    logger.debug(
      `Cannot invalidate cache by event: Redis not working (event: ${eventName})`
    );
    return false;
  }

  // Check if this event exists in our configuration
  const eventConfig = cacheConfig.events[eventName];
  if (!eventConfig) {
    logger.debug(`No cache invalidation rules defined for event: ${eventName}`);
    return false;
  }

  logger.debug(
    `Invalidating cache for event: ${eventName}${
      options.userId ? ` for userId: ${options.userId}` : ""
    }`
  );
  let totalDeleted = 0;

  for (const rule of eventConfig) {
    let pattern;

    // Handle pathVariables pattern for more precise cache invalidation
    if (rule.pathVariables) {
      const { urlPattern, variable } = rule.pathVariables;

      // Only proceed if we have the required variable value
      if (options[variable]) {
        // Create a URL with the variable replaced
        const specificUrl = urlPattern.replace(
          new RegExp(`\\{\\{${variable}\\}\\}`, "g"),
          options[variable]
        );

        // Generate a hash of the URL the same way we do when creating cache keys
        const normalizedPath = normalizePath(specificUrl);
        const pathHash = crypto
          .createHash("md5")
          .update(normalizedPath)
          .digest("hex")
          .substring(0, 10);

        // For pathVariables targeting admin routes
        if (rule.pattern.startsWith("admin:")) {
          pattern = `cache:admin:${rule.pattern.replace(
            /^admin:/,
            ""
          )}:${pathHash}*`;
        } else if (options.userId) {
          pattern = `cache:${options.userId}:${rule.pattern}:${pathHash}*`;
        } else {
          pattern = `cache:*:${rule.pattern}:*`;
        }

        logger.debug(`Using pathVariables pattern: ${pattern}`);
      } else {
        // Skip this rule if we don't have the required variable
        logger.debug(`Skipping pathVariables rule: missing ${variable}`);
        continue;
      }
    }
    // If rule requires userId and we have it
    else if (rule.userId && options.userId) {
      // User-specific pattern
      pattern = `cache:${options.userId}:${rule.pattern}`;
      logger.debug(`Using user-specific pattern: ${pattern}`);
    }
    // Admin patterns
    else if (rule.pattern.startsWith("admin:")) {
      const cleanPattern = rule.pattern.replace(/^admin:/, "");
      pattern = `cache:admin:${cleanPattern}`;
      logger.debug(`Using admin pattern: ${pattern}`);
    }
    // Default case - either apply to specific user if provided, or all users
    else {
      pattern = options.userId
        ? `cache:${options.userId}:${rule.pattern}:*`
        : `cache:*:${rule.pattern}:*`;
    }

    // Use Redis SCAN to find matching keys
    let cursor = "0";
    do {
      try {
        const [nextCursor, keys] = await redisCacheClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await redisCacheClient.del(keys);
          totalDeleted += keys.length;
        }
      } catch (error) {
        logger.error(
          `Error during cache invalidation for pattern ${pattern}: ${error.message}`
        );
        return false;
      }
    } while (cursor !== "0");
  }

  logger.info(
    `Invalidated ${totalDeleted} cache entries for event: ${eventName}`
  );
  return true;
}

// Add data to cache
async function addToCache(keyName, data, options = { EX: 1800 }) {
  if (!isRedisWorking()) {
    logger.debug(`Cannot add to cache: Redis not working (key: ${keyName})`);
    return;
  }

  let dataString;

  if (typeof data === "string" && isValidJsonString(data)) {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  try {
    const buffer = await deflateAsync(dataString);
    const compressedData = buffer.toString("base64");
    await redisCacheClient.set(keyName, compressedData, "EX", options.EX);
  } catch (error) {
    if (redisAvailable) {
      logger.debug(
        `Failed to compress/cache data for key=${keyName}: ${error.message}`
      );
      redisAvailable = false; // Mark Redis as unavailable to prevent further errors
    }
  }
}

// Retrieve data from cache, parse if JSON, otherwise return as-is
async function getFromCache(key) {
  if (!isRedisWorking()) {
    return null; // Silently return null when Redis is unavailable
  }

  try {
    const cachedValue = await redisCacheClient.get(key);
    if (cachedValue) {
      const buffer = await inflateAsync(Buffer.from(cachedValue, "base64"));
      let data = buffer.toString();

      try {
        let parsedData = JSON.parse(data);
        // Check if the parsedData is still a string and parse it again if necessary
        if (typeof parsedData === "string") {
          parsedData = JSON.parse(parsedData);
        }
        return parsedData; // Return parsed JSON data
      } catch (err) {
        logger.debug(`Error parsing JSON for key=${key}: ${err.message}`);
        return data; // Return as-is if not JSON
      }
    }
  } catch (err) {
    // Only log if Redis was thought to be available
    if (redisAvailable) {
      logger.debug(`Error retrieving cache for key=${key}: ${err.message}`);
      redisAvailable = false; // Mark Redis as unavailable
    }
  }

  return null;
}

function redisCaching(options = {}) {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      logger.debug("Skipping cache: Not a GET request");
      return next();
    }

    if (!isRedisWorking()) {
      logger.debug("Skipping cache: Redis not available");
      return next();
    }

    // For admin routes, we still need user authentication but will use global admin caching
    if (!req.user || !req.user.id) {
      logger.debug("Skipping cache: No user or user ID in request");
      return next();
    }

    const userId = req.user.id;
    const fullPath = req.originalUrl.split("?")[0];

    // Get the endpoint configuration
    const config = getEndpointConfig(fullPath);

    // Skip caching if no configuration matches this endpoint
    if (!config) {
      logger.debug(`Skipping cache: No configuration for ${fullPath}`);
      return next();
    }

    // Generate the cache key using our new approach
    const key = generateKey(userId, fullPath, req.query, config);

    // Skip caching for keys with 'nocache' prefix
    if (key.startsWith("nocache:")) {
      logger.debug(
        `Skipping cache: Request has disallowed query parameters: ${fullPath}`
      );
      return next();
    }

    // Use TTL from config or default from options or global default
    const cacheTTL = config.ttl || options.ttl || cacheConfig.defaultTTL;

    try {
      // Attempt to retrieve from cache
      const cachedValue = await getFromCache(key);
      if (cachedValue !== null) {
        logger.info(`[CACHE HIT] key: ${key} path: ${fullPath}`);

        if (isRedisWorking()) {
          try {
            // Reset expiry on cache hit
            await redisCacheClient.expire(key, cacheTTL);
          } catch (expireError) {
            logger.debug(
              `Failed to reset expiry for key: ${key} - ${expireError.message}`
            );
          }
        }

        return res.send(cachedValue);
      } else {
        logger.info(`[CACHE MISS] key: ${key} path: ${fullPath}`);

        // Override res.send to cache the response
        const oldSend = res.send;
        res.send = async function (data) {
          res.send = oldSend;
          if (res.statusCode.toString().startsWith("2")) {
            logger.debug(`[CACHE SET] key: ${key}`);
            await addToCache(key, data, { EX: cacheTTL });
          } else {
            logger.debug(
              `Not caching response with status code: ${res.statusCode}`
            );
          }
          return oldSend.call(res, data);
        };

        next();
      }
    } catch (error) {
      logger.debug(`Error handling cache for key: ${key}`, error);
      next();
    }
  };
}

function isValidJsonString(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  redisCaching,
  addToCache,
  getFromCache,
  isRedisWorking,
  invalidateByEvent,
};
