const express = require("express");
const router = express.Router();
const { ContactMeSchema } = require("../utils/validation/ValidationSchemas");
const expressJoiValidation = require("express-joi-validation").createValidator(
  {}
);
const { myQueue, sendContactMeEmail } = require("../utils/myQueue");
const logger = require("../logs/logger");

// will notify Admin as well as send an email to the user
const notifyAdmin = async (req, res) => {
  try {
    await myQueue.add("ContactMe", req.body);
    res.status(200).json({ message: "Message added to queue successfully" });
  } catch (error) {
    logger.error(`Error sending Contact Me email: ${error}`);
    await sendContactMeEmail(req.body);
  }
};

router.route("/").post(expressJoiValidation.body(ContactMeSchema), notifyAdmin);

//formats any joi error into JSON for the client
router.use((err, req, res, next) => {
  if (err?.error?.isJoi) {
    console.log(`In Joi middleware: ${err.error}`);
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
