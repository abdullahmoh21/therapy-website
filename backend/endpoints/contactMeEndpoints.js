const express = require("express");
const router = express.Router();
const { ContactMeSchema } = require("../utils/validation/ValidationSchemas");
const expressJoiValidation = require("express-joi-validation").createValidator(
  {}
);
const { sendEmail } = require("../utils/queue/index");
const logger = require("../logs/logger");
const Inquiry = require("../models/Inquiry");

// will store inquiry in the database and notify Admin as well as send an email to the user
const saveInquiry = async (req, res) => {
  try {
    // First, save the inquiry to the database
    const newInquiry = new Inquiry({
      type: req.body.type,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone || "",
      message: req.body.message,
    });

    const inquiry = await newInquiry.save();
    logger.info(`New inquiry saved with ID: ${inquiry._id}`);
    try {
      logger.debug("Attempting to send emails");
      await sendEmail("ContactMe", req.body);
    } catch (err) {
      logger.debug(`could not send email. following error: ${err}`);
      return res.status(200).json("Message received successfully");
    }
    logger.info(`Message sent to admin`);
    await Inquiry.findByIdAndUpdate(inquiry._id, { adminNotified: true });

    res.status(200).json({
      message: "Message received successfully",
      inquiryId: inquiry._id,
    });
  } catch (error) {
    logger.error(`Error processing Contact Me request: ${error.message}`);
    return res.status(500).json({ error: "Failed to process your request" });
  }
};

router.route("/").post(expressJoiValidation.body(ContactMeSchema), saveInquiry);

// formats any joi error into JSON for the client
router.use((err, req, res, next) => {
  if (err?.error?.isJoi) {
    return res.status(400).json({
      type: err.type,
      message: err.error.details[0].message,
      context: err.error.details[0].context,
    });
  } else {
    next(err);
  }
});

module.exports = router;
