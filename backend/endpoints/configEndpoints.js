const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Config = require("../models/Config");
const { verifyJWT } = require("../middleware/verifyJWT");
const { verifyAdmin } = require("../middleware/verifyJWT");
const asyncHandler = require("express-async-handler");
const logger = require("../logs/logger");
const { redisCaching } = require("../middleware/redisCaching");

//@desc returns the current domestics ession price for display in frontend
//@param null
//@route GET /config/getSessionPrice
//@access Private
const getSessionPrice = asyncHandler(async (req, res) => {
  const sessionPrice = await Config.getValue("sessionPrice");
  if (!sessionPrice) {
    return res.sendStatus(503);
  }
  return res.status(200).json({ sessionPrice });
});

//@desc returns the current international session price for display in frontend
//@param null
//@route GET /config/getSessionPrice
//@access Private
const getIntlSessionPrice = asyncHandler(async (req, res) => {
  const sessionPrice = await Config.getValue("intlSessionPrice");
  if (!sessionPrice) {
    return res.sendStatus(503);
  }
  return res.status(200).json({ sessionPrice });
});

//@desc returns the current Cancellation Notice Period
//@param {Object} req with valid JWT
//@route GET /config/noticePeriod
//@access Private
const getNoticePeriod = asyncHandler(async (req, res) => {
  const noticePeriod = await Config.getValue("noticePeriod");
  if (!noticePeriod) {
    return res.sendStatus(503);
  }
  return res.status(200).json({ noticePeriod });
});

//@desc returns all the bank account details
//@param {Object} req with valid JWT
//@route GET /config/bank-account
//@access Private
const getBankAccountDetails = asyncHandler(async (req, res) => {
  const bankAccounts = await Config.getValue("bankAccounts");
  if (!bankAccounts) {
    return res.sendStatus(503);
  }
  return res.status(200).json(bankAccounts);
});

//@desc Get all configuration values
//@param valid admin jwt token
//@route GET /config/all
//@access Private(admin)
const getAllConfigs = asyncHandler(async (req, res) => {
  try {
    // Get configurations excluding sensitive Google tokens
    const configurations = await Config.findAllOrdered(false);

    res.status(200).json({
      configurations: configurations.reduce((acc, config) => {
        acc[config.key] = {
          value: config.value,
          description: config.description,
          displayName: config.displayName,
          viewable: config.viewable !== false, // Default to true if not specified
          _id: config._id,
        };
        return acc;
      }, {}),
    });
  } catch (error) {
    logger.error(`Error fetching all configurations: ${error.message}`);
    res.status(500).json({ message: "Failed to fetch configuration data" });
  }
});

//@desc Update configuration value
//@param valid admin jwt token
//@route PATCH /config/:key
//@access Private(admin)
const updateConfig = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ message: "Value is required" });
  }

  try {
    // First check if the config exists
    const configItem = await Config.findOne({ key });

    // If config doesn't exist, return 404
    if (!configItem) {
      logger.error(`Config key '${key}' not found`);
      return res.status(404).json({
        message: `Configuration '${key}' not found`,
      });
    }

    // If config exists, update it using setValue method
    let updatedConfig;
    try {
      updatedConfig = await Config.setValue(key, value);

      logger.info(`Admin updated config key '${key}'`);

      return res.status(200).json({
        message: `Configuration '${key}' updated successfully`,
        config: {
          key: updatedConfig.key,
          value: updatedConfig.value,
          description: updatedConfig.description,
          displayName: updatedConfig.displayName,
          viewable: updatedConfig.viewable !== false, // Default to true if undefined
          _id: updatedConfig._id,
        },
      });
    } catch (updateError) {
      logger.error(`Error in setValue: ${updateError.message}`);
      return res.status(500).json({
        message: "Failed to update configuration",
        error: updateError.message,
      });
    }
  } catch (error) {
    logger.error(`Error updating configuration '${key}': ${error.message}`);
    logger.error(error.stack); // Log the full stack trace
    return res.status(500).json({
      message: "Failed to update configuration",
      error: error.message,
    });
  }
});

router.get("/sessionPrice", getSessionPrice);
router.get("/intlSessionPrice", getIntlSessionPrice);

router.use(verifyJWT);

router.get("/noticePeriod", getNoticePeriod);
router.get("/bank-account", getBankAccountDetails);

// Admin-only routes
router.use(verifyAdmin);
router.get("/all", redisCaching(), getAllConfigs);
router.patch("/:key", updateConfig);

module.exports = router;
