const request = require("supertest");
const express = require("express");
const contactMeEndpoints = require("../../endpoints/contactMeEndpoints");
const { sendEmail } = require("../../utils/queue/index");
const Inquiry = require("../../models/Inquiry");
const JOB_NAMES = require("../../utils/queue/jobNames");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

// Mock sendEmail
jest.mock("../../utils/queue/index", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock logger
jest.mock("../../logs/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe("Contact Me Endpoints", () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use("/api/contactMe", contactMeEndpoints);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should save inquiry and dispatch email job with correct name", async () => {
    const inquiryData = {
      type: "General",
      name: "John Doe",
      email: "john@example.com",
      message: "Hello world",
    };

    const response = await request(app)
      .post("/api/contactMe")
      .send(inquiryData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "Message received successfully",
      })
    );

    // Verify Inquiry was saved
    const savedInquiry = await Inquiry.findOne({ email: "john@example.com" });
    expect(savedInquiry).toBeTruthy();
    expect(savedInquiry.name).toBe("John Doe");

    // Verify sendEmail was called with the correct job name constant
    expect(sendEmail).toHaveBeenCalledWith(
      JOB_NAMES.CONTACT_INQUIRY,
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
      })
    );
  });

  it("should handle validation errors", async () => {
    const invalidData = {
      name: "John Doe",
      // Missing email and message
    };

    const response = await request(app)
      .post("/api/contactMe")
      .send(invalidData);

    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
