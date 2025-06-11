const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { verifyJWT } = require("../middleware/verifyJWT");
const { redisCaching } = require("../middleware/redisCaching");

router.route("/safepay").post(paymentController.handleSafepayWebhook);

router.use(verifyJWT); //all payment routes are protected

router.route("/").post(paymentController.createPayment);

router.route("/:paymentId").get(redisCaching(), paymentController.getPayment);

module.exports = router;
