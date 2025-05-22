const cron = require("node-cron");
const Booking = require("../../models/Booking");
const logger = require("../../logs/logger");

function startUpdateBookingStatusCron() {
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    try {
      const result = await Booking.updateMany(
        { eventEndTime: { $lt: now }, status: "Active" },
        { $set: { status: "Completed" } }
      ).maxTimeMS(5000);
      if (result.modifiedCount > 0) {
        console.info(
          `[CRON] Updated ${result.modifiedCount} bookings to Completed.`
        );
      }
    } catch (err) {
      logger.error("[CRON] Error updating bookings:", err);
    }
  });

  logger.info("Booking status CRON updater initialized.");
}

module.exports = startUpdateBookingStatusCron;
