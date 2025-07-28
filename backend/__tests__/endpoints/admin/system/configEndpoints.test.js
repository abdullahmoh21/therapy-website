const { setupDatabase, mongoose, Config } = require("../../testSetup");
const request = require("supertest");
const express = require("express");
const configRoutes = require("../../../../endpoints/configEndpoints");
const cookieParser = require("cookie-parser");

describe("Config Endpoints", () => {
  // Setup express app with config routes
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/config", configRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    console.error("Test Error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  });

  const { connectDB, closeDB, clearCollections } = setupDatabase();

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // Mock Config methods
    jest.spyOn(Config, "findAllOrdered").mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        key: "sessionPrice",
        value: 100,
        description: "Price for domestic sessions",
        displayName: "Session Price",
        editable: true,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        key: "intlSessionPrice",
        value: 50,
        description: "Price for international sessions",
        displayName: "International Session Price",
        editable: true,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        key: "noticePeriod",
        value: 24,
        description: "Cancellation notice period in hours",
        displayName: "Cancellation Notice Period",
        editable: true,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        key: "bankAccounts",
        value: {
          name: "Test Bank",
          accountNumber: "1234567890",
          routingNumber: "987654321",
        },
        description: "Bank account details",
        displayName: "Bank Account Details",
        editable: true,
      },
    ]);

    jest.spyOn(Config, "findOne").mockImplementation((query) => {
      const configItems = {
        sessionPrice: {
          key: "sessionPrice",
          value: 100,
          description: "Price for domestic sessions",
          displayName: "Session Price",
          editable: true,
        },
        intlSessionPrice: {
          key: "intlSessionPrice",
          value: 50,
          description: "Price for international sessions",
          displayName: "International Session Price",
          editable: true,
        },
        noticePeriod: {
          key: "noticePeriod",
          value: 24,
          description: "Cancellation notice period in hours",
          displayName: "Cancellation Notice Period",
          editable: true,
        },
      };

      const key = query.key;
      if (configItems[key]) {
        return Promise.resolve(configItems[key]);
      }
      return Promise.resolve(null);
    });

    jest.spyOn(Config, "setValue").mockImplementation((key, value) => {
      return Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        key,
        value,
        description: `Mock description for ${key}`,
        displayName: `Mock Display Name for ${key}`,
        editable: true,
      });
    });

    // Override getValue for the tests
    jest.spyOn(Config, "getValue").mockImplementation((key) => {
      const values = {
        sessionPrice: 100,
        intlSessionPrice: 50,
        noticePeriod: 24,
        bankAccounts: {
          name: "Test Bank",
          accountNumber: "1234567890",
          routingNumber: "987654321",
        },
      };
      return Promise.resolve(values[key] || null);
    });
  });

  describe("Public Config Endpoints", () => {
    describe("GET /config/sessionPrice", () => {
      it("should return the domestic session price", async () => {
        const response = await request(app).get("/config/sessionPrice");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("sessionPrice", 100);
      });

      it("should return 503 if session price is not available", async () => {
        Config.getValue.mockResolvedValueOnce(null);

        const response = await request(app).get("/config/sessionPrice");

        expect(response.status).toBe(503);
      });
    });

    describe("GET /config/intlSessionPrice", () => {
      it("should return the international session price", async () => {
        const response = await request(app).get("/config/intlSessionPrice");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("sessionPrice", 50);
      });

      it("should return 503 if international session price is not available", async () => {
        Config.getValue.mockResolvedValueOnce(null);

        const response = await request(app).get("/config/intlSessionPrice");

        expect(response.status).toBe(503);
      });
    });
  });

  describe("Authenticated Config Endpoints", () => {
    describe("GET /config/noticePeriod", () => {
      it("should return the cancellation notice period", async () => {
        const response = await request(app).get("/config/noticePeriod");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("noticePeriod", 24);
      });

      it("should return 503 if notice period is not available", async () => {
        Config.getValue.mockResolvedValueOnce(null);

        const response = await request(app).get("/config/noticePeriod");

        expect(response.status).toBe(503);
      });
    });

    describe("GET /config/bank-account", () => {
      it("should return the bank account details", async () => {
        const response = await request(app).get("/config/bank-account");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("name", "Test Bank");
        expect(response.body).toHaveProperty("accountNumber", "1234567890");
        expect(response.body).toHaveProperty("routingNumber", "987654321");
      });

      it("should return 503 if bank account details are not available", async () => {
        Config.getValue.mockResolvedValueOnce(null);

        const response = await request(app).get("/config/bank-account");

        expect(response.status).toBe(503);
      });
    });
  });

  describe("Admin Config Endpoints", () => {
    describe("GET /config/all", () => {
      it("should return all configurations", async () => {
        const response = await request(app).get("/config/all");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("configurations");
        expect(response.body.configurations).toHaveProperty("sessionPrice");
        expect(response.body.configurations).toHaveProperty("intlSessionPrice");
        expect(response.body.configurations).toHaveProperty("noticePeriod");
        expect(response.body.configurations).toHaveProperty("bankAccounts");

        // Check structure of a config item
        const sessionPrice = response.body.configurations.sessionPrice;
        expect(sessionPrice).toHaveProperty("value", 100);
        expect(sessionPrice).toHaveProperty("description");
        expect(sessionPrice).toHaveProperty("displayName");
        expect(sessionPrice).toHaveProperty("editable");
        expect(sessionPrice).toHaveProperty("_id");
      });

      it("should handle errors when fetching configurations", async () => {
        Config.findAllOrdered.mockRejectedValueOnce(
          new Error("Database error")
        );

        const response = await request(app).get("/config/all");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "message",
          "Failed to fetch configuration data"
        );
      });
    });

    describe("PATCH /config/:key", () => {
      it("should update a configuration value", async () => {
        const response = await request(app)
          .patch("/config/sessionPrice")
          .send({ value: 120 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          "message",
          "Configuration 'sessionPrice' updated successfully"
        );
        expect(response.body).toHaveProperty("config");
        expect(response.body.config).toHaveProperty("key", "sessionPrice");
        expect(response.body.config).toHaveProperty("value", 120);
      });

      it("should return 400 if value is missing", async () => {
        const response = await request(app)
          .patch("/config/sessionPrice")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("message", "Value is required");
      });

      it("should handle errors when updating configuration", async () => {
        // Mock an error when updating
        Config.setValue.mockRejectedValueOnce(new Error("Database error"));

        const response = await request(app)
          .patch("/config/sessionPrice")
          .send({ value: 120 });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "message",
          "Failed to update configuration"
        );
      });

      it("should handle config key not found", async () => {
        Config.findOne.mockResolvedValueOnce(null);

        const response = await request(app)
          .patch("/config/nonExistentKey")
          .send({ value: "new value" });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty(
          "message",
          "Configuration 'nonExistentKey' not found"
        );
      });
    });
  });
});
