// Set environment variables FIRST
process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
process.env.CALENDLY_API_KEY = "test_calendly_api_key";
process.env.CALENDLY_SESSION_URL = "https://calendly.com/test-user/session";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";

// Setup Jest mocks for external modules
jest.mock("axios", () => ({
  request: jest.fn().mockResolvedValue({ data: {} }),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
  verify: jest.fn().mockImplementation((token, secret) => {
    if (token === "valid-token") {
      return { userId: "userId123", jti: "valid-jti" };
    } else if (token === "invalid-user-token") {
      return { userId: "nonExistentUser", jti: "some-jti" };
    } else if (token === "invalid-jti-token") {
      return { userId: "userId123", jti: "invalid-jti" };
    } else {
      throw new Error("Invalid token");
    }
  }),
}));

// Setup Jest mocks for internal modules
jest.mock("../../../utils/queue/index", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../../middleware/redisCaching", () => ({
  redisCaching: jest.fn().mockImplementation(() => (req, res, next) => next()),
  invalidateByEvent: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../../middleware/verifyJWT", () => ({
  verifyJWT: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: "userId123", email: "test@example.com", role: "user" };
    next();
  }),
}));

jest.mock("../../../logs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Import dependencies
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Import mocked modules
const axios = require("axios");
const jsonwebtoken = require("jsonwebtoken");
const { verifyJWT } = require("../../../middleware/verifyJWT");
const {
  redisCaching,
  invalidateByEvent,
} = require("../../../middleware/redisCaching");
const { sendEmail } = require("../../../utils/queue/index");
const logger = require("../../../logs/logger");

// Import real models (not mocks)
const User = require("../../../models/User");
const Booking = require("../../../models/Booking");
const Payment = require("../../../models/Payment");
const Config = require("../../../models/Config");

// Import booking routes
const bookingRoutes = require("../../../endpoints/bookingEndpoints");

// Helper function to create ObjectId for tests
const createObjectId = (id) => {
  if (id && typeof id === "string") {
    return new mongoose.Types.ObjectId(id);
  }
  return new mongoose.Types.ObjectId();
};

// Setup test app
const setupApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/bookings", bookingRoutes);

  // Setup error handler
  app.use((err, req, res, next) => {
    console.error("Test Error:", err);
    res.status(500).json({ message: err.message });
  });

  return app;
};

// Setup database handling functions
const setupDatabase = () => {
  let mongoServer;

  const connectDB = async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    return mongoServer;
  };

  const closeDB = async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  };

  const clearCollections = async () => {
    if (mongoose.connection.readyState === 1) {
      // Get all collections
      const collections = mongoose.connection.collections;

      // Drop all collections
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }

    // Clear all mocks between tests
    jest.clearAllMocks();

    // Setup Config mock directly
    Config.getValue = jest.fn().mockImplementation((key) => {
      const values = {
        adminEmail: "admin@example.com",
        devEmail: "dev@example.com",
        sessionPrice: 100,
        intlSessionPrice: 50,
        noticePeriod: 2,
        maxBookings: 2,
      };
      return Promise.resolve(values[key] || null);
    });
  };

  return { connectDB, closeDB, clearCollections };
};

describe("Test Setup", () => {
  it("should set up test environment correctly", () => {
    expect(true).toBe(true);
  });
});

module.exports = {
  setupApp,
  setupDatabase,
  createObjectId,
  // Export mocked modules for test verification
  axios,
  jsonwebtoken,
  jwt: jsonwebtoken,
  verifyJWT,
  invalidateByEvent,
  sendEmail,
  logger,
  // Export models
  User,
  Booking,
  Payment,
  Config,
  mongoose,
};
