const express = require("express");
const router = express.Router();
const { verifyJWT } = require("../middleware/verifyJWT");
const { myQueue } = require("../utils/myQueue");
const logger = require("../logs/logger");

// production: remove endpoint
const sendEmail = (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).send("Type is required");

  try {
    logger.info(`Adding email job to queue: ${type}`);
    const emailJobData = {
      name: "Test User",
      recipient: "abdullahmohsin21007@gmail.com",
      link: "https://www.google.com",
    };

    myQueue.add(type, emailJobData);
    logger.info(`Email job added to queue: ${type}`);
    res.status(200).send("Email job added to queue");
  } catch (error) {
    logger.error(`Error adding email job to queue: ${error}`);
    res.status(500).send("Error adding email job to queue");
  }
};

router.route("/").post(sendEmail);

module.exports = router;
