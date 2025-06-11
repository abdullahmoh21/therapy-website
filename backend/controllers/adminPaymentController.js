const Payment = require("../models/Payment");
const asyncHandler = require("express-async-handler");
const logger = require("../logs/logger");
const { invalidateByEvent } = require("../middleware/redisCaching");

//@desc returns all payments
//@param valid admin jwt token
//@route GET /payments/admin
//@access Private(admin)
const getAllPayments = asyncHandler(async (req, res) => {
  // Get pagination parameters from the query string
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 40) {
    return res.status(400).json({
      message:
        "Page and limit must be positive integers and limit should not exceed 40",
    });
  }

  try {
    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Retrieve paginated payments with populated fields
    const payments = await Payment.find({})
      .skip(skip)
      .limit(limit)
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "bookingId",
        select: "bookingId status eventStartTime eventEndTime eventName",
      })
      .lean()
      .exec();

    // Get the total number of payments
    const totalPayments = await Payment.countDocuments();

    if (payments.length === 0) return res.status(204).end();

    // Log data for debugging purposes (optional)
    console.log(
      `Admin payment data sent: ${JSON.stringify(payments, null, 2)}`
    );

    // Send paginated data along with metadata
    res.json({
      page,
      limit,
      totalPayments,
      totalPages: Math.ceil(totalPayments / limit),
      payments,
    });
  } catch (error) {
    logger.error(`Error retrieving payments: ${error.message}`);
    res.status(500).json({ message: "Failed to retrieve payments" });
  }
});
//@desc marks payment as completed with cash payment
//@param valid user jwt token and payment id
//@route POST /admin/payments/:paymentId/paid
//@access Private (admin)
const markAsPaid = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  if (!paymentId) {
    return res.status(400).json({ message: "Payment ID is required" });
  }

  // Find the payment document
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }

  // Check if payment is already completed
  if (payment.transactionStatus === "Completed") {
    return res
      .status(204)
      .json({ message: "Payment is already marked as completed" });
  }

  // Update the payment document
  payment.transactionStatus = "Completed";
  payment.paymentMethod = "Cash";
  payment.paymentCompletedDate = new Date();
  payment.netAmountReceived = payment.amount; // For cash, net amount is the full amount
  payment.feePaid = 0; // No processing fee for cash

  if (payment?.errorMessage) {
    payment.errorMessage = "";
  }

  // Save the updated payment document
  await payment.save();

  if (payment.userId) {
    await invalidateByEvent("payment-updated", { userId: payment.userId });
    await invalidateByEvent("admin-data-changed");
  }

  logger.info(
    `Payment ${paymentId} marked as completed via cash by admin ${req.user.id}`
  );

  return res.status(200).json({
    message: "Payment marked as completed successfully",
    payment: {
      _id: payment._id,
      transactionStatus: payment.transactionStatus,
      paymentMethod: payment.paymentMethod,
      paymentCompletedDate: payment.paymentCompletedDate,
    },
  });
});

module.exports = {
  getAllPayments,
  markAsPaid,
};
