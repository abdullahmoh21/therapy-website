const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Config = require("../models/Config");
const { verifyJWT } = require("../middleware/verifyJWT");
const asyncHandler = require("express-async-handler"); // You need to add this import

//@desc returns the current session price for display in frontend
//@param {Object} req with valid JWT
//@route GET /config/getSessionPrice
//@access Private
const getSessionPrice = asyncHandler(async (req, res) => {
  const sessionPrice = await Config.getValue("sessionPrice");
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
  const noticePeriod = await Config.getValue("cancelCutoffDays");
  if (!noticePeriod) {
    return res.sendStatus(503);
  }
  return res.status(200).json({ noticePeriod });
});

// Define routes after defining handler functions
router.get("/sessionPrice", getSessionPrice);

router.use(verifyJWT);

router.get("/noticePeriod", getNoticePeriod);

module.exports = router;
