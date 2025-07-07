const mongoose = require("mongoose");
const logger = require("../logs/logger");

// Basic MongoDB connection function
const connectDB = async () => {
  const options = {
    serverSelectionTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 45000, // 45 seconds
  };

  const DATABASE_URI = process.env.MONGO_URI;
  if (!DATABASE_URI) {
    throw new Error(
      "MongoDB connection string not found in environment variables"
    );
  }

  try {
    await mongoose.connect(DATABASE_URI, options);
    logger.info("MongoDB connected");
    global.mongoAvailable = true;
    return true;
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    global.mongoAvailable = false;
    throw err;
  }
};

// Check Mongo availability
const isMongoAvailable = () => {
  return global.mongoAvailable === true;
};

module.exports = { connectDB, isMongoAvailable };
