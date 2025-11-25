/**
 * Migration Script: Recurring Bookings Feature
 *
 * This script migrates the database from the old schema to support recurring bookings.
 *
 * CHANGES:
 * 1. User model: Add `recurring` field
 * 2. User model: Add email normalization (toLowerCase)
 * 3. Booking model: Restructure Calendly fields into nested `calendly` object
 * 4. Booking model: Add `source` field ('admin', 'system', 'calendly')
 * 5. Booking model: Add `recurring` object
 * 6. Booking model: Add Google Calendar sync fields
 * 7. Booking model: Rename location fields (join_url -> meetingLink, remove zoom_pwd)
 * 8. Booking model: Add 'System' to cancellation.cancelledBy enum
 * 9. Booking model: Add eventTimezone field
 * 10. Booking model: Add invitationSent field
 *
 * BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT!
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const Booking = require("../models/Booking");
const path = require("path");

// Load env from backend directory
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function migrateDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URI;
    if (!mongoUri) {
      throw new Error(
        "MONGO_URI or DATABASE_URI not found in environment variables"
      );
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    console.log(
      "╔════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║  RECURRING BOOKINGS FEATURE - DATABASE MIGRATION           ║"
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝\n"
    );

    // ====================================
    // STEP 1: Migrate User Documents
    // ====================================
    console.log("STEP 1: Migrating User documents...");
    console.log("─────────────────────────────────────────────────");

    // Count users needing migration
    const usersNeedingMigration = await User.countDocuments({
      recurring: { $exists: false },
    });

    if (usersNeedingMigration > 0) {
      console.log(`Found ${usersNeedingMigration} users needing migration`);

      // Add recurring field to all users
      const userUpdate = await User.updateMany(
        { recurring: { $exists: false } },
        {
          $set: {
            "recurring.state": false,
          },
        }
      );

      console.log(
        `✅ Added recurring field to ${userUpdate.modifiedCount} users`
      );

      // Normalize emails (toLowerCase for all users)
      const usersToNormalize = await User.find({});
      let normalizedCount = 0;

      for (const user of usersToNormalize) {
        const normalizedEmail = user.email.toLowerCase().trim();
        if (user.email !== normalizedEmail) {
          await User.updateOne(
            { _id: user._id },
            { $set: { email: normalizedEmail } }
          );
          normalizedCount++;
        }
      }

      if (normalizedCount > 0) {
        console.log(`✅ Normalized ${normalizedCount} user email addresses`);
      }
    } else {
      console.log("✅ All users already have recurring field");
    }

    console.log("");

    // ====================================
    // STEP 2: Migrate Booking Documents
    // ====================================
    console.log("STEP 2: Migrating Booking documents...");
    console.log("─────────────────────────────────────────────────");

    const totalBookings = await Booking.countDocuments();
    console.log(`Total bookings: ${totalBookings}`);

    // Get all bookings that need migration (those without the 'source' field)
    const bookingsToMigrate = await Booking.find({
      source: { $exists: false },
    }).lean();

    console.log(`Bookings needing migration: ${bookingsToMigrate.length}\n`);

    let migratedCount = 0;
    let errors = [];

    for (const booking of bookingsToMigrate) {
      try {
        const $set = {};
        const $unset = {};

        // Determine source based on old Calendly fields
        const isCalendly =
          booking.scheduledEventURI ||
          booking.eventTypeURI ||
          booking.cancelURL ||
          booking.rescheduleURL;

        if (isCalendly) {
          $set.source = "calendly";

          // Move Calendly fields to nested object
          $set.calendly = {
            eventName: booking.eventName || null,
            scheduledEventURI: booking.scheduledEventURI || null,
            eventTypeURI: booking.eventTypeURI || null,
            cancelURL: booking.cancelURL || null,
            rescheduleURL: booking.rescheduleURL || null,
          };

          // Unset old top-level Calendly fields
          $unset.scheduledEventURI = "";
          $unset.eventTypeURI = "";
          $unset.cancelURL = "";
          $unset.rescheduleURL = "";
          // NOTE: we intentionally keep eventName at top level for admin bookings
        } else {
          // This is an admin-created booking
          $set.source = "admin";

          // Keep eventName at top level for admin bookings (for backward compatibility)
          // It will be handled by application logic
        }

        // Add recurring field (all existing bookings are NOT recurring)
        $set["recurring.state"] = false;

        // Migrate location fields
        if (booking.location && booking.location.join_url) {
          // Rename join_url to meetingLink
          $set["location.meetingLink"] = booking.location.join_url;
          $unset["location.join_url"] = ""; // Remove legacy field
          $unset["location.zoom_pwd"] = ""; // Remove zoom_pwd
        }

        // Add cancellation object if missing
        if (!booking.cancellation) {
          $set.cancellation = {
            isCancelled: false,
            reason: null,
            cancelledBy: null,
          };
        }

        // Set eventTimezone if missing (default to UTC for existing bookings)
        if (!booking.eventTimezone) {
          $set.eventTimezone = "UTC";
        }

        // Add Google Calendar sync fields
        $set["syncStatus.google"] = "not_applicable"; // Existing bookings don't need sync
        $set.invitationSent = true; // Assume old bookings already sent invitations

        const updateDoc = {};
        if (Object.keys($set).length > 0) updateDoc.$set = $set;
        if (Object.keys($unset).length > 0) updateDoc.$unset = $unset;

        if (Object.keys(updateDoc).length === 0) {
          // Nothing to update for this booking (shouldn't really happen, but be safe)
          continue;
        }

        // IMPORTANT: Use raw collection to bypass Mongoose strict schema
        // so we can $unset legacy fields that are no longer in the schema
        await Booking.collection.updateOne({ _id: booking._id }, updateDoc);

        migratedCount++;

        // Log progress every 10 bookings
        if (migratedCount % 10 === 0) {
          console.log(
            `  Progress: ${migratedCount}/${bookingsToMigrate.length} bookings migrated`
          );
        }
      } catch (error) {
        errors.push({
          bookingId: booking._id,
          error: error.message,
        });
        console.error(
          `  ❌ Error migrating booking ${booking._id}: ${error.message}`
        );
      }
    }

    console.log(`\n✅ Successfully migrated ${migratedCount} bookings`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} bookings failed to migrate`);
    }

    console.log("");

    // ====================================
    // STEP 3: Verification
    // ====================================
    console.log("STEP 3: Verifying migration...");
    console.log("─────────────────────────────────────────────────");

    // Verify Users
    const totalUsers = await User.countDocuments();
    const usersWithRecurring = await User.countDocuments({
      "recurring.state": { $exists: true },
    });
    console.log(
      `Users: ${usersWithRecurring}/${totalUsers} have recurring field ✅`
    );

    // Verify Bookings
    const bookingsWithSource = await Booking.countDocuments({
      source: { $exists: true },
    });
    const bookingsWithRecurring = await Booking.countDocuments({
      "recurring.state": { $exists: true },
    });
    const bookingsWithSyncStatus = await Booking.countDocuments({
      "syncStatus.google": { $exists: true },
    });

    console.log(
      `Bookings: ${bookingsWithSource}/${totalBookings} have source field ✅`
    );
    console.log(
      `Bookings: ${bookingsWithRecurring}/${totalBookings} have recurring field ✅`
    );
    console.log(
      `Bookings: ${bookingsWithSyncStatus}/${totalBookings} have syncStatus field ✅`
    );

    // Show breakdown by source
    console.log("\nBookings breakdown by source:");
    const sourceBreakdown = await Booking.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    sourceBreakdown.forEach((item) => {
      const percentage = ((item.count / totalBookings) * 100).toFixed(1);
      console.log(`  - ${item._id || "null"}: ${item.count} (${percentage}%)`);
    });

    // Check for any remaining old fields
    const bookingsWithOldCalendlyFields = await Booking.countDocuments({
      $or: [
        { scheduledEventURI: { $exists: true } },
        { eventTypeURI: { $exists: true } },
        { cancelURL: { $exists: true } },
        { rescheduleURL: { $exists: true } },
        { "location.join_url": { $exists: true } },
        { "location.zoom_pwd": { $exists: true } },
      ],
    });

    if (bookingsWithOldCalendlyFields > 0) {
      console.log(
        `\n⚠️  Warning: ${bookingsWithOldCalendlyFields} bookings still have old Calendly fields`
      );
      console.log("   These may need manual cleanup");
    }

    console.log(
      "\n╔════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║  MIGRATION COMPLETED SUCCESSFULLY! ✅                      ║"
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝"
    );

    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered during migration:");
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Booking ${err.bookingId}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error("\n❌ MIGRATION FAILED:");
    console.error(error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  console.log("\n⚠️  WARNING: This will modify your database!");
  console.log("Make sure you have a backup before proceeding.\n");

  migrateDatabase()
    .then(() => {
      console.log("\n✅ Migration completed successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Migration failed:", err);
      process.exit(1);
    });
}

module.exports = migrateDatabase;
