// backend/scripts/seedAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/User.js";

dotenv.config();

const {
  MONGO_URI,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
  ADMIN_PHONE,
  ADMIN_DOB,
} = process.env;

const seedAdmin = async () => {
  try {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);

    const existingAdmin = await User.findOne({ role: "admin" }).lean().exec();
    if (existingAdmin) {
      console.log("Admin already exists:", existingAdmin.email);
      return process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await User.create({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: hashedPassword,
      DOB: ADMIN_DOB,
      phone: ADMIN_PHONE,
      role: "admin",
      "emailVerified.state": true,
    });

    console.log("Admin user created:", admin.email);
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err.message);
    process.exit(1);
  }
};

seedAdmin();
