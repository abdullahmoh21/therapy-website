// Set environment variables
process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
process.env.TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
process.env.TOKEN_ENCRYPTION_IV = "0123456789abcdef";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";

// Mock external dependencies first, before imports
jest.mock("../../../utils/queue/index", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../../middleware/redisCaching", () => ({
  redisCaching: jest.fn().mockImplementation(() => (req, res, next) => next()),
  invalidateByEvent: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../../logs/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
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
        email: "test@example.com",
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
  };
});

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

// Import utilities
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { invalidateByEvent } = require("../../../middleware/redisCaching");
const { sendEmail } = require("../../../utils/queue/index");

// Import the models directly (after mocking dependencies)
const User = require("../../../models/User");
const Invitee = require("../../../models/Invitee");

// Import routes
const authRoutes = require("../../../endpoints/authEndpoints");

// Setup test app
const setupApp = () => {
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

// Setup database handling functions
const setupDatabase = () => {
  let mongoServer;

  const connectDB = async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Use absolute minimal connection options to avoid compatibility issues
    await mongoose.connect(uri);

    return mongoServer;
  };

  const closeDB = async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  };

  // Simplified collection clearing without any session handling
  const clearCollections = async () => {
    if (mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.db.dropDatabase();
      } catch (err) {
        console.error("Error dropping database:", err.message);
      }
    }

    jest.clearAllMocks();
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

// Add a dummy test to avoid Jest complaining about no tests
describe("Test Setup", () => {
  it("should be properly configured", () => {
    expect(true).toBe(true);
  });
});

module.exports = {
  setupApp,
  setupDatabase,
  createValidInvitation,
  // Export mocked modules for test verification
  jwt,
  bcrypt,
  crypto,
  invalidateByEvent,
  sendEmail,
  User,
  Invitee,
  mongoose,
};
