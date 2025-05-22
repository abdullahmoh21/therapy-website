const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const expressJoiValidation = require("express-joi-validation").createValidator(
  {}
);
const { verifyJWT } = require("../middleware/verifyJWT");
const { redisCaching } = require("../middleware/redisCaching");

// Import validation schemas
const {
  updateMyUser,
  emailSchema,
  passwordSchema,
  tokenOrEmailSchema,
  tokenSchema,
} = require("../utils/validation/ValidationSchemas");

//open routes
router
  .route(`/resendEmailVerification`)
  .post(
    expressJoiValidation.body(tokenOrEmailSchema),
    userController.resendEvLink
  );

router
  .route("/verifyEmail") //?token=tokenString
  .post(expressJoiValidation.body(tokenSchema), userController.verifyEmail);

router
  .route("/resetPassword") //?token=tokenString
  .post(
    expressJoiValidation.body(passwordSchema), //password is in the body
    expressJoiValidation.query(tokenSchema), //token is in the URL
    userController.resetPassword
  );

router.route("/forgotPassword").post(
  (req, res, next) => {
    console.log("Request received at /forgotPassword");
    next();
  },
  expressJoiValidation.body(emailSchema),
  (err, req, res, next) => {
    if (err) {
      console.error("Validation error:", err);
      return res.status(400).json({ error: err.message });
    }
    next();
  },
  userController.forgotPassword
);

router.use(verifyJWT);

//protected routes
router
  .route("/")
  .get(redisCaching(), userController.getMyData)
  .patch(expressJoiValidation.body(updateMyUser), userController.updateMyUser);

router.route("/bookings").get(redisCaching(), userController.getAllMyBookings);

router
  .route("/bookings/:bookingId")
  .get(redisCaching(), userController.getBooking);
router
  .route("/payments/:paymentId")
  .get(redisCaching(), userController.getPayment);

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
