const Payment = require("../models/Payment");
const asyncHandler = require("express-async-handler");
const logger = require("../logs/logger");

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

//@desc edit any payment details
//@param valid admin jwt token
//@route PATCH /admin/payments
//@access Private(admin)
const updatePayment = asyncHandler(async (req, res) => {
  const { paymentId, ...updateData } = req.body;

  if (!paymentId) {
    return res.status(400).json({ message: "Payment ID is required" });
  }

  // Define allowed fields for update
  const allowedUpdates = ["transactionStatus", "notes"]; // Add other fields as needed
  const updates = {};
  for (const key in updateData) {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ message: "No valid fields provided for update" });
  }

  try {
    const payment = await Payment.findByIdAndUpdate(paymentId, updates, {
      new: true,
      runValidators: true,
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    logger.error(`Error updating payment: ${error.message}`);
    res.status(500).json({ message: "Failed to update payment" });
  }
});

module.exports = {
  getAllPayments,
  updatePayment,
};
