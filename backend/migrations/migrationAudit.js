/**
 * Pre-Migration Audit Script
 *
 * This script does NOT modify any data.
 * It scans the database and prints a full diagnostic
 * of how many documents are missing new fields,
 * how many still contain old fields,
 * and how many are structurally inconsistent.
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const Booking = require("../models/Booking");
const path = require("path");

// Load env from backend directory
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runAudit() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error(
        "MONGO_URI or DATABASE_URI not found in environment variables"
      );
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected\n");
    console.log("Connected DB name:", mongoose.connection.name);
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║              PRE-MIGRATION STATUS AUDIT              ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");

    // =====================================================
    // USERS
    // =====================================================
    console.log("📌 USER DOCUMENTS");
    console.log("─────────────────────────────────────────────");

    const totalUsers = await User.countDocuments();

    const missingRecurringField = await User.countDocuments({
      recurring: { $exists: false },
    });

    const emailsNeedingNormalization = await User.countDocuments({
      email: { $exists: true, $ne: null },
      $expr: { $ne: ["$email", { $toLower: "$email" }] },
    });

    console.log(`Total users: ${totalUsers}`);
    console.log(`Users missing recurring field: ${missingRecurringField}`);
    console.log(
      `Users with unnormalized (uppercase/messy) emails: ${emailsNeedingNormalization}`
    );
    console.log("");

    // =====================================================
    // BOOKINGS
    // =====================================================
    console.log("📌 BOOKING DOCUMENTS");
    console.log("─────────────────────────────────────────────");

    const totalBookings = await Booking.countDocuments();

    const missingSource = await Booking.countDocuments({
      source: { $exists: false },
    });

    const missingRecurring = await Booking.countDocuments({
      "recurring.state": { $exists: false },
    });

    const missingSyncStatus = await Booking.countDocuments({
      "syncStatus.google": { $exists: false },
    });

    const hasOldCalendlyFields = await Booking.countDocuments({
      $or: [
        { scheduledEventURI: { $exists: true } },
        { eventTypeURI: { $exists: true } },
        { cancelURL: { $exists: true } },
        { rescheduleURL: { $exists: true } },
      ],
    });

    const hasOldZoomFields = await Booking.countDocuments({
      $or: [
        { "location.join_url": { $exists: true } },
        { "location.zoom_pwd": { $exists: true } },
      ],
    });

    const weirdSources = await Booking.countDocuments({
      source: { $nin: [null, "admin", "system", "calendly"] },
    });

    console.log(`Total bookings: ${totalBookings}`);
    console.log(`Bookings missing 'source': ${missingSource}`);
    console.log(`Bookings missing 'recurring.state': ${missingRecurring}`);
    console.log(`Bookings missing syncStatus.google: ${missingSyncStatus}`);
    console.log(`Bookings with old Calendly fields: ${hasOldCalendlyFields}`);
    console.log(`Bookings with old Zoom location fields: ${hasOldZoomFields}`);
    console.log(
      `Bookings with invalid/unknown 'source' values: ${weirdSources}`
    );
    console.log("");

    // =====================================================
    // BREAKDOWN ANALYSIS
    // =====================================================

    console.log("📊 SOURCE BREAKDOWN");
    console.log("─────────────────────────────────────────────");

    const sourceBreakdown = await Booking.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    sourceBreakdown.forEach((row) => {
      console.log(`  ${row._id || "null"}: ${row.count}`);
    });

    console.log("");

    console.log("📊 CALENDLY FIELD ANOMALIES");
    console.log("─────────────────────────────────────────────");

    const adminBookingsWithCalendlyFields = await Booking.countDocuments({
      source: "admin",
      $or: [
        { scheduledEventURI: { $exists: true } },
        { eventTypeURI: { $exists: true } },
        { cancelURL: { $exists: true } },
        { rescheduleURL: { $exists: true } },
      ],
    });

    console.log(
      `Admin bookings incorrectly containing Calendly fields: ${adminBookingsWithCalendlyFields}`
    );

    console.log("");

    console.log("📊 LOCATION FIELD ANOMALIES");
    console.log("─────────────────────────────────────────────");

    const bookingsMissingLocation = await Booking.countDocuments({
      location: { $exists: false },
    });

    const bookingsWithBrokenLocation = await Booking.countDocuments({
      $or: [
        { location: { $exists: true, $type: "string" } }, // bad structure
        { location: { $exists: true, $eq: null } },
      ],
    });

    console.log(
      `Bookings missing location entirely: ${bookingsMissingLocation}`
    );
    console.log(
      `Bookings with malformed location: ${bookingsWithBrokenLocation}`
    );

    console.log("");

    console.log("📊 CANCELLATION FIELD CHECK");
    console.log("─────────────────────────────────────────────");

    const bookingsMissingCancellation = await Booking.countDocuments({
      cancellation: { $exists: false },
    });

    const bookingsMissingCancelledBy = await Booking.countDocuments({
      "cancellation.cancelledBy": { $exists: false },
    });

    console.log(
      `Bookings missing cancellation object: ${bookingsMissingCancellation}`
    );
    console.log(
      `Bookings missing cancellation.cancelledBy: ${bookingsMissingCancelledBy}`
    );

    console.log("");

    console.log("📊 TIMEZONE FIELD CHECK");
    console.log("─────────────────────────────────────────────");

    const bookingsMissingTimezone = await Booking.countDocuments({
      eventTimezone: { $exists: false },
    });

    console.log(
      `Bookings missing eventTimezone field: ${bookingsMissingTimezone}`
    );

    console.log("");

    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║                  AUDIT COMPLETE 🎉                   ║");
    console.log("╚══════════════════════════════════════════════════════╝");

    await mongoose.connection.close();
  } catch (err) {
    console.error("\n❌ Audit failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  runAudit();
}

module.exports = runAudit;
