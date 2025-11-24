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
    expressJoiValidation.body(passwordSchema),
    expressJoiValidation.query(tokenSchema),
    userController.resetPassword
  );

router
  .route("/forgotPassword")
  .post(expressJoiValidation.body(emailSchema), userController.forgotPassword);

router.use(verifyJWT);

//protected routes
router
  .route("/")
  .get(redisCaching(), userController.getMyData)
  .patch(expressJoiValidation.body(updateMyUser), userController.updateMyUser);

router
  .route("/recurring")
  .get(redisCaching(), userController.getRecurringBooking);

//formats any joi error into JSON for the client
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
