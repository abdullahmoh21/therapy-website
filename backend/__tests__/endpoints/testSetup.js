// Set environment variables FIRST
process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
process.env.TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.TOKEN_ENCRYPTION_IV = "0123456789abcdef";
process.env.CALENDLY_API_KEY = "test_calendly_api_key";
process.env.CALENDLY_SESSION_URL = "https://calendly.com/test-user/session";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";

// Setup Jest mocks for external modules
jest.mock("axios", () => ({
  request: jest.fn().mockResolvedValue({ data: {} }),
}));

// Enhanced JWT mock with proper error handling
jest.mock("jsonwebtoken", () => {
  // Create TokenExpiredError class to match the real JWT error
  class TokenExpiredError extends Error {
    constructor(message) {
      super(message);
      this.name = "TokenExpiredError";
    }
  }

  return {
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
    verify: jest.fn().mockImplementation((token, secret) => {
      if (token === "invalid-token") {
        throw new Error("Invalid token");
      }
      if (token === "expired-token") {
        throw new TokenExpiredError("jwt expired");
      }
      return {
        user: {
          id: "userId123",
          email: "test@example.com",
          role: "user",
        },
        id: "userId123",
        email: "test@example.com",
        role: "user",
      };
    }),
    // Export the error class
    TokenExpiredError,
  };
});

jest.mock("bcryptjs", () => ({
  hash: jest
    .fn()
    .mockImplementation((str, salt) => Promise.resolve(`hashed_${str}`)),
  compare: jest.fn().mockImplementation((str, hash) => {
    return Promise.resolve(hash === `hashed_${str}` || hash === str);
  }),
}));

jest.mock("crypto", () => {
  const originalCrypto = jest.requireActual("crypto");
  return {
    ...originalCrypto,
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("hashed-value"),
    }),
    createCipheriv: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnValue(Buffer.from("encrypted")),
      final: jest.fn().mockReturnValue(Buffer.from("final")),
    })),
    createDecipheriv: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnValue(Buffer.from("decrypted")),
      final: jest.fn().mockReturnValue(Buffer.from("final")),
    })),
    randomBytes: jest.fn((size) => Buffer.alloc(size, 0)),
  };
});

// Setup Jest mocks for internal modules
jest.mock("../../utils/queue/index", () => ({
  sendEmail: jest
    .fn()
    .mockImplementation((jobName, jobData) =>
      Promise.resolve({ success: true })
    ),
  initializeQueue: jest.fn().mockResolvedValue(true),
  addJob: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../../middleware/redisCaching", () => ({
  redisCaching: jest.fn().mockImplementation(() => (req, res, next) => next()),
  invalidateByEvent: jest.fn().mockResolvedValue(true),
  invalidateResourceCache: jest.fn().mockResolvedValue(true),
}));

// Use this instead of referencing mongoose directly in the mock
const mockObjectId = () => {
  // Return a valid 24-character hex string that can be cast to ObjectId
  return "507f1f77bcf86cd799439011";
};

jest.mock("../../middleware/verifyJWT", () => ({
  verifyJWT: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: mockObjectId(), email: "test@example.com", role: "user" };
    next();
  }),
  verifyAdmin: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: mockObjectId(), email: "test@example.com", role: "admin" };
    next();
  }),
}));

jest.mock("../../logs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock express-joi-validation
jest.mock("express-joi-validation", () => {
  return {
    createValidator: () => ({
      body: () => (req, res, next) => next(), // Bypass validation in tests
      query: () => (req, res, next) => next(),
      params: () => (req, res, next) => next(),
    }),
  };
});

// Import dependencies
const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

// Import mocked modules
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { verifyJWT } = require("../../middleware/verifyJWT");
const {
  redisCaching,
  invalidateByEvent,
  invalidateResourceCache,
} = require("../../middleware/redisCaching");
const { sendEmail } = require("../../utils/queue/index");
const logger = require("../../logs/logger");

// Import models
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const Invitee = require("../../models/Invitee");
const Config = require("../../models/Config");

// Import routes
const authRoutes = require("../../endpoints/authEndpoints");
const userRoutes = require("../../endpoints/userEndpoints");
const bookingRoutes = require("../../endpoints/bookingEndpoints");
const adminRoutes = require("../../endpoints/adminEndpoints"); // Fixed the import for admin routes

// Import controllers
const userController = require("../../controllers/userController");

// Helper function to create ObjectId for tests
const createObjectId = (id) => {
  if (id && typeof id === "string") {
    return new mongoose.Types.ObjectId(id);
  }
  return new mongoose.Types.ObjectId();
};

// Setup test app for different endpoints
const setupAuthApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/auth", authRoutes);

  // Setup error handler
  app.use((err, req, res, next) => {
    if (err?.error?.isJoi) {
      return res.status(400).json({
        message: err.error.details[0].message,
      });
    }
    console.error("Test Error:", err);
    res.status(500).json({ message: err.message });
  });

  return app;
};

const setupUserApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/users", userRoutes);

  // Setup error handler
  app.use((err, req, res, next) => {
    if (err?.error?.isJoi) {
      return res.status(400).json({
        message: err.error.details[0].message,
      });
    }
    console.error("Test Error:", err);
    res.status(500).json({ message: err.message });
  });

  return app;
};

const setupBookingApp = () => {
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

const setupAdminApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/admin", adminRoutes); // Changed from adminBookingRoutes to adminRoutes

  // Setup error handler
  app.use((err, req, res, next) => {
    console.error("Test Error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  });

  return app;
};

// Setup database handling functions - using the approach from bookingTestSetup
// which seems to be working without buffer issues
const setupDatabase = () => {
  let mongoServer;

  const connectDB = async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Use minimal connection options to avoid deprecation warnings
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

      // Drop all collections individually instead of using dropDatabase
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

// Mock user creation instead of real DB operation to avoid buffer issues
const createValidInvitation = async (email) => {
  const invitationToken = "valid-invitation-token";

  jest.spyOn(Invitee, "create").mockResolvedValue({
    _id: new mongoose.Types.ObjectId(),
    email,
    token: invitationToken,
    isUsed: false,
    expiresAt: new Date(Date.now() + 86400000),
    accountType: "domestic",
    name: "New User",
    invitedBy: new mongoose.Types.ObjectId(),
  });

  return invitationToken;
};

// Use the actual encryption functions from userController instead of mocks
const { encrypt, decrypt } = userController;

// Dummy test to prevent Jest warnings
describe("Test Setup", () => {
  it("should be properly configured", () => {
    expect(true).toBe(true);
  });
});

module.exports = {
  setupAuthApp,
  setupUserApp,
  setupBookingApp,
  setupAdminApp,
  setupDatabase,
  createObjectId,
  createValidInvitation,
  encrypt,
  decrypt,
  // Export mocked modules for test verification
  axios,
  jwt,
  bcrypt,
  crypto,
  verifyJWT,
  invalidateByEvent,
  sendEmail,
  invalidateResourceCache,
  logger,
  // Export models
  User,
  Booking,
  Payment,
  Invitee,
  Config,
  mongoose,
  request,
};
